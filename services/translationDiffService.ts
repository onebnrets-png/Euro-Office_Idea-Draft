// services/translationDiffService.ts
// ═══════════════════════════════════════════════════════════════
// Granular diff-based translation engine.
// Tracks which fields changed since the last translation
// and only sends changed content to the AI.
//
// TRANSLATION RULES are read from services/Instructions.ts
// — the single source of truth. No hardcoded rules here.
//
// NON-TRANSLATABLE fields (IDs, dates, acronyms, levels,
// dependencies, categories) are ALWAYS COPIED from source
// to target — never translated, never skipped.
//
// RATE LIMITING: 2s delay between batches + exponential
// backoff retry (up to 3 retries) on 429 errors.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient.ts';
import { generateContent } from './aiProvider.ts';
import { storageService } from './storageService.ts';
import { getTranslationRules } from './Instructions.ts';

// ─── SIMPLE HASH (fast, no crypto needed) ────────────────────────

const simpleHash = (str: string): string => {
  let hash = 0;
  const s = str.trim();
  if (s.length === 0) return '0';
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
};

// ─── NON-TRANSLATABLE KEYS ──────────────────────────────────────
// These keys are NEVER sent to the AI for translation.
// Instead they are COPIED directly from source to target.

const SKIP_KEYS = new Set([
  'id', 'startDate', 'endDate', 'date', 'level',
  'category', 'likelihood', 'impact', 'type', 'predecessorId',
  'projectAcronym'
]);

const SKIP_VALUES = new Set([
  'Low', 'Medium', 'High',
  'Technical', 'Social', 'Economic',
  'FS', 'SS', 'FF', 'SF'
]);

// ─── FLATTEN: Extract all translatable field paths + values ──────

interface FieldEntry {
  path: string;
  value: string;
  hash: string;
}

const flattenTranslatableFields = (obj: any, prefix: string = ''): FieldEntry[] => {
  const entries: FieldEntry[] = [];

  if (obj === null || obj === undefined) return entries;

  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed.length > 0 && !SKIP_VALUES.has(trimmed)) {
      entries.push({ path: prefix, value: trimmed, hash: simpleHash(trimmed) });
    }
    return entries;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPrefix = `${prefix}[${index}]`;
      entries.push(...flattenTranslatableFields(item, itemPrefix));
    });
    return entries;
  }

  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      if (SKIP_KEYS.has(key)) continue;
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      entries.push(...flattenTranslatableFields(val, newPrefix));
    }
  }

  return entries;
};

// ─── GET/SET value by dot-bracket path ───────────────────────────

const getByPath = (obj: any, path: string): any => {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const idx = Number(part);
    current = Number.isNaN(idx) ? current[part] : current[idx];
  }
  return current;
};

const setByPath = (obj: any, path: string, value: any): void => {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const idx = Number(part);
    const nextKey = parts[i + 1];
    const nextIsArray = !Number.isNaN(Number(nextKey));

    if (Number.isNaN(idx)) {
      if (current[part] === undefined || current[part] === null) {
        current[part] = nextIsArray ? [] : {};
      }
      current = current[part];
    } else {
      if (current[idx] === undefined || current[idx] === null) {
        current[idx] = nextIsArray ? [] : {};
      }
      current = current[idx];
    }
  }
  const lastPart = parts[parts.length - 1];
  const lastIdx = Number(lastPart);
  if (Number.isNaN(lastIdx)) {
    current[lastPart] = value;
  } else {
    current[lastIdx] = value;
  }
};

// ─── LOAD STORED HASHES FROM SUPABASE ────────────────────────────

const loadStoredHashes = async (
  projectId: string,
  sourceLang: string,
  targetLang: string
): Promise<Map<string, string>> => {
  const { data, error } = await supabase
    .from('translation_hashes')
    .select('field_path, source_hash')
    .eq('project_id', projectId)
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang);

  if (error) {
    console.warn('[TranslationDiff] Error loading hashes:', error.message);
    return new Map();
  }

  const map = new Map<string, string>();
  (data || []).forEach(row => map.set(row.field_path, row.source_hash));
  return map;
};

// ─── SAVE HASHES TO SUPABASE (batch upsert) ─────────────────────

const saveHashes = async (
  projectId: string,
  sourceLang: string,
  targetLang: string,
  entries: FieldEntry[]
): Promise<void> => {
  if (entries.length === 0) return;

  const rows = entries.map(e => ({
    project_id: projectId,
    source_lang: sourceLang,
    target_lang: targetLang,
    field_path: e.path,
    source_hash: e.hash,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('translation_hashes')
    .upsert(rows, { onConflict: 'project_id,source_lang,target_lang,field_path' });

  if (error) {
    console.warn('[TranslationDiff] Error saving hashes:', error.message);
  }
};

// ─── GROUP CHANGED FIELDS INTO SECTION CHUNKS ────────────────────

const groupBySection = (fields: FieldEntry[]): Map<string, FieldEntry[]> => {
  const groups = new Map<string, FieldEntry[]>();
  for (const field of fields) {
    const section = field.path.split('.')[0].split('[')[0];
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(field);
  }
  return groups;
};

// ─── TRANSLATE A BATCH OF FIELDS ─────────────────────────────────

const translateFieldBatch = async (
  fields: FieldEntry[],
  targetLanguage: 'en' | 'si'
): Promise<Map<string, string>> => {
  const langName = targetLanguage === 'si' ? 'Slovenian' : 'English';

  // Read translation rules from the central Instructions.ts
  const translationRules = getTranslationRules(targetLanguage);

  // Build a simple key→value map for the AI
  const toTranslate: Record<string, string> = {};
  fields.forEach((f, i) => {
    toTranslate[`field_${i}`] = f.value;
  });

  const prompt = [
    `You are a professional translator for EU Project Proposals.`,
    `Translate each value in the following JSON object into ${langName}.`,
    `RULES:\n- ${translationRules.join('\n- ')}`,
    `\nADDITIONAL:\n- Keep all keys exactly as they are (field_0, field_1, etc.).\n- Return ONLY valid JSON. No markdown, no explanation.`,
    `\nJSON:\n${JSON.stringify(toTranslate, null, 2)}`
  ].join('\n');

  const result = await generateContent({ prompt, jsonMode: true });
  const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  const translated = JSON.parse(jsonStr);

  const resultMap = new Map<string, string>();
  fields.forEach((f, i) => {
    const key = `field_${i}`;
    if (translated[key] && typeof translated[key] === 'string') {
      resultMap.set(f.path, translated[key]);
    }
  });

  return resultMap;
};

// ─── TRANSLATE WITH RETRY (exponential backoff on 429) ───────────

const MAX_RETRIES = 3;

const translateFieldBatchWithRetry = async (
  fields: FieldEntry[],
  targetLanguage: 'en' | 'si'
): Promise<Map<string, string>> => {
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // On retry, wait with exponential backoff: 4s, 8s, 16s
      if (attempt > 0) {
        const delay = 2000 * Math.pow(2, attempt); // 4000, 8000, 16000
        console.log(`[TranslationDiff] Rate limited — retry ${attempt}/${MAX_RETRIES}, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }

      return await translateFieldBatch(fields, targetLanguage);
    } catch (e: any) {
      lastError = e;
      const msg = e.message || '';

      // Only retry on rate limit errors
      const isRateLimit = msg.includes('429') ||
        msg.includes('Quota') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('rate limit') ||
        msg.includes('Rate Limit') ||
        msg.includes('Too Many Requests');

      if (!isRateLimit || attempt === MAX_RETRIES) {
        throw e; // Not a rate limit error, or we've exhausted retries
      }
    }
  }

  throw lastError; // Should not reach here, but just in case
};

// ─── COPY NON-TRANSLATABLE DATA FROM SOURCE TO TARGET ────────────
// Recursively walks the source tree and copies every SKIP_KEYS
// value (IDs, dates, acronyms, levels, dependencies, categories)
// into the target. Also ensures arrays have matching structure.

const copyNonTranslatableFromSource = (source: any, target: any): void => {
  if (!source || typeof source !== 'object') return;

  if (Array.isArray(source)) {
    for (let i = 0; i < source.length; i++) {
      // Ensure target slot exists with correct type
      if (target[i] === undefined || target[i] === null) {
        if (typeof source[i] === 'object' && source[i] !== null) {
          target[i] = Array.isArray(source[i]) ? [] : {};
        } else {
          target[i] = source[i];
          continue;
        }
      }
      if (typeof source[i] === 'object' && source[i] !== null) {
        copyNonTranslatableFromSource(source[i], target[i]);
      }
    }
    return;
  }

  for (const [key, val] of Object.entries(source)) {
    if (SKIP_KEYS.has(key)) {
      // ALWAYS overwrite target with source value for non-translatable keys
      target[key] = val;
    } else if (typeof val === 'object' && val !== null) {
      // Recurse into nested objects/arrays
      if (target[key] === undefined || target[key] === null) {
        target[key] = Array.isArray(val) ? [] : {};
      }
      copyNonTranslatableFromSource(val, target[key]);
    }
    // String/number fields that are translatable → leave for AI translation
  }
};

// ─── MAIN: SMART INCREMENTAL TRANSLATION ─────────────────────────

export const smartTranslateProject = async (
  sourceData: any,
  targetLanguage: 'en' | 'si',
  existingTargetData: any,
  projectId: string
): Promise<{
  translatedData: any;
  stats: { total: number; changed: number; translated: number; failed: number };
}> => {
  const sourceLang = targetLanguage === 'si' ? 'en' : 'si';

  // 1. Flatten all translatable fields from source
  const sourceFields = flattenTranslatableFields(sourceData);
  console.log(`[TranslationDiff] Source has ${sourceFields.length} translatable fields.`);

  // 2. Load stored hashes from last translation
  const storedHashes = await loadStoredHashes(projectId, sourceLang, targetLanguage);
  console.log(`[TranslationDiff] Found ${storedHashes.size} stored hashes.`);

  // 3. Determine which fields changed
  const changedFields: FieldEntry[] = [];
  const unchangedFields: FieldEntry[] = [];

  for (const field of sourceFields) {
    const storedHash = storedHashes.get(field.path);
    if (storedHash && storedHash === field.hash) {
      unchangedFields.push(field);
    } else {
      changedFields.push(field);
    }
  }

  console.log(`[TranslationDiff] ${changedFields.length} fields changed, ${unchangedFields.length} unchanged.`);

  // 4. Start with existing target data as base
  const translatedData = existingTargetData
    ? JSON.parse(JSON.stringify(existingTargetData))
    : JSON.parse(JSON.stringify(sourceData));

  // 5. CRITICAL: Copy ALL non-translatable data from source to target.
  //    SKIP_KEYS fields (IDs, dates, acronyms, dependencies, levels,
  //    categories, etc.) are never sent to the AI — they must be
  //    copied directly. Without this step, Gantt/PERT charts break,
  //    readiness levels disappear, and acronyms go missing.
  copyNonTranslatableFromSource(sourceData, translatedData);
  console.log(`[TranslationDiff] Non-translatable fields copied from source.`);

  // 6. Translate changed fields in section-based batches
  const stats = {
    total: sourceFields.length,
    changed: changedFields.length,
    translated: 0,
    failed: 0
  };

  if (changedFields.length === 0) {
    console.log('[TranslationDiff] Nothing changed – no translation needed!');
    return { translatedData, stats };
  }

  const sectionGroups = groupBySection(changedFields);
  const successfullyTranslated: FieldEntry[] = [];
  let batchIndex = 0;

  for (const [section, fields] of sectionGroups) {
    console.log(`[TranslationDiff] Translating section "${section}" – ${fields.length} fields...`);

    const BATCH_SIZE = 30;
    for (let i = 0; i < fields.length; i += BATCH_SIZE) {
      const batch = fields.slice(i, i + BATCH_SIZE);

      // ═══ RATE LIMIT PROTECTION: Wait 2s between batches ═══
      if (batchIndex > 0) {
        await new Promise(r => setTimeout(r, 2000));
      }
      batchIndex++;

      try {
        // Use retry-enabled translation (auto-retries on 429)
        const results = await translateFieldBatchWithRetry(batch, targetLanguage);

        for (const [path, translatedValue] of results) {
          setByPath(translatedData, path, translatedValue);
          stats.translated++;
        }

        batch.forEach(f => {
          if (results.has(f.path)) {
            successfullyTranslated.push(f);
          }
        });
      } catch (error: any) {
        console.warn(`[TranslationDiff] Batch failed for "${section}" (${batch.length} fields):`, error.message);
        stats.failed += batch.length;

        // Fallback: keep existing target value, or copy source if target is empty
        for (const field of batch) {
          const existingTarget = getByPath(translatedData, field.path);
          if (!existingTarget || (typeof existingTarget === 'string' && existingTarget.trim() === '')) {
            setByPath(translatedData, field.path, field.value);
          }
        }
      }
    }
  }

  // 7. Save hashes for all successfully translated fields + unchanged fields
  const allToSave = [...successfullyTranslated, ...unchangedFields];
  await saveHashes(projectId, sourceLang, targetLanguage, allToSave);

  console.log(`[TranslationDiff] Done: ${stats.translated}/${stats.changed} translated, ${stats.failed} failed, ${unchangedFields.length} skipped.`);

  return { translatedData, stats };
};
