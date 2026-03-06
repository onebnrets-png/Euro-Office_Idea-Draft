// ═══════════════════════════════════════════════════════════════
// services/geminiService.ts
// v7.9 — 2026-03-06 — EO-042: Web Search integration — searchForEvidence injected into prompts
// v7.8 — 2026-03-06 — EO-040: generateFieldContent supports userInstructions + currentValue + full rules
// v7.7 — 2026-03-01 — FIX: Partner allocations use correct categoryKeys per funding model
// v7.6 — 2026-03-01 — POST-PROCESSING BUDGET ENFORCEMENT (from previous session)
// v7.5 — 2026-02-24 — TOKEN OPTIMIZATION + ABORT SIGNAL
//
// CHANGES v7.6:
//   ★ NEW: generatePartnerAllocations() post-processing budget enforcement
//     → After AI generates allocations, enforce RESOURCE_COHERENCE_RULES
//     → Scale down PM WP if over max % (5-15% based on total budget)
//     → Scale down Dissemination WP if over 20% (target ~15%)
//     → Log budget check and adjustments
//
// v7.5 — 2026-02-24 — TOKEN OPTIMIZATION + ABORT SIGNAL
//
// CHANGES v7.5:
//   ★ NEW: getRelevantContext(sectionKey, projectData) — sends only relevant
//     project sections per generation target (replaces getContext in prompt builder)
//   ★ NEW: KB_RELEVANT_SECTIONS — KB injected ONLY for sections that need it
//   ★ NEW: INTERVENTION_LOGIC_SECTIONS — IL framework injected conditionally
//   ★ NEW: ACADEMIC_RIGOR_SECTIONS — academic rules injected conditionally
//   ★ NEW: AbortSignal parameter on all public generation functions
//   ★ PRESERVED: getContext() kept for backward compatibility
//   ★ All previous v7.0 changes preserved.
// ═══════════════════════════════════════════════════════════════

import { storageService } from './storageService.ts';
import { knowledgeBaseService } from './knowledgeBaseService.ts';

import {
  getLanguageDirective,
  getInterventionLogicFramework,
  getAcademicRigorRules,
  getHumanizationRules,
  getProjectTitleRules,
  getModeInstruction,
  getQualityGates,
  getCrossChapterGates,
  getTaskInstruction,
  getRulesForSection,
  getGlobalRules,
  getFieldRules,
  getSummaryRules,
  getTranslationRules,
  getTemporalIntegrityRule,
  getLanguageMismatchTemplate,
  getConsortiumAllocationRules,
  getResourceCoherenceRules,
  getOpenRouterSystemPrompt,
  isValidSectionKey,
  isValidPartnerType,
  SECTION_TO_CHAPTER_MAP,
} from './Instructions.ts';
import { isWebSearchAvailable, searchForEvidence, formatSearchResultsForPrompt, extractSearchTopic } from './webSearchService.ts';
import { detectProjectLanguage as detectLanguage, detectTextLanguage } from '../utils.ts';
import {
  generateContent,
  hasValidProviderKey,
  validateProviderKey,
  getProviderConfig,
  type AIProviderType
} from './aiProvider.ts';

// ─── BACKWARD COMPATIBILITY EXPORTS ─────────────────────────────

export const hasValidApiKey = hasValidProviderKey;

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  const provider = storageService.getAIProvider() || 'gemini';
  return validateProviderKey(provider, apiKey);
};

export const validateProviderApiKey = validateProviderKey;

// ─── SAFE RULES FORMATTER ────────────────────────────────────────

const formatRules = (rules: string | string[]): string => {
  if (Array.isArray(rules)) return rules.join('\n');
  if (typeof rules === 'string' && rules.trim().length > 0) return rules;
  return '';
};

const formatRulesAsList = (rules: string | string[]): string => {
  if (Array.isArray(rules)) return rules.map(r => `- ${r}`).join('\n');
  if (typeof rules === 'string' && rules.trim().length > 0) return rules;
  return '';
};

// ─── SAFE PROJECT END DATE CALCULATOR ────────────────────────────

const calculateProjectEndDate = (startDateStr: string, durationMonths: number): string => {
  const parts = startDateStr.split('-').map(Number);
  const startYear = parts[0];
  const startMonth = parts[1] - 1;
  const startDay = parts[2];

  let targetMonth = startMonth + durationMonths;
  const targetYear = startYear + Math.floor(targetMonth / 12);
  targetMonth = targetMonth % 12;

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(startDay, daysInTargetMonth);

  const endDate = new Date(targetYear, targetMonth, targetDay);
  endDate.setDate(endDate.getDate() - 1);

  const y = endDate.getFullYear();
  const m = String(endDate.getMonth() + 1).padStart(2, '0');
  const d = String(endDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ─── INPUT LANGUAGE DETECTION ────────────────────────────────────

const detectInputLanguageMismatch = (
  projectData: any,
  uiLanguage: 'en' | 'si'
): string => {
  const sampleTexts: string[] = [];

  const collectStrings = (obj: any, depth = 0) => {
    if (depth > 3 || sampleTexts.length >= 5) return;
    if (typeof obj === 'string' && obj.length > 30) {
      sampleTexts.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      for (const val of Object.values(obj)) {
        collectStrings(val, depth + 1);
        if (sampleTexts.length >= 5) break;
      }
    }
  };

  collectStrings(projectData?.problemAnalysis);
  collectStrings(projectData?.projectIdea);
  collectStrings(projectData?.objectives);

  if (sampleTexts.length === 0) return '';

  let mismatchCount = 0;
  const checked = Math.min(sampleTexts.length, 5);

  for (let i = 0; i < checked; i++) {
    const detected = detectTextLanguage(sampleTexts[i]);
    if (detected !== 'unknown' && detected !== uiLanguage) {
      mismatchCount++;
    }
  }

  if (mismatchCount > checked / 2) {
    const template = getLanguageMismatchTemplate();
    const detectedLang = uiLanguage === 'en' ? 'si' : 'en';
    const detectedName = detectedLang === 'en' ? 'English' : 'Slovenian';
    const targetName = uiLanguage === 'en' ? 'English' : 'Slovenian';
    return template
      .replace(/\{\{detectedName\}\}/g, detectedName)
      .replace(/\{\{targetName\}\}/g, targetName);
  }

  return '';
};

// ─── SANITIZE PROJECT TITLE ─────────────────────────────────────

const sanitizeProjectTitle = (title: string): string => {
  if (!title || typeof title !== 'string') return title;

  let clean = title.trim();

  clean = clean
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1');

  clean = clean.replace(/^["'«»„""]|["'«»"""]$/g, '').trim();
  clean = clean.replace(/^(Project\s*Title|Naziv\s*projekta)\s*[:–—-]\s*/i, '').trim();

  const acronymPattern = /^[A-ZČŠŽ]{2,10}\s*[–—:-]\s*/;
  if (acronymPattern.test(clean)) {
    const withoutAcronym = clean.replace(acronymPattern, '').trim();
    if (withoutAcronym.length > 20) {
      clean = withoutAcronym;
    }
  }

  if (clean.length > 200) {
    clean = clean.substring(0, 200).replace(/\s+\S*$/, '').trim();
  }

  return clean;
};

// ─── STRIP MARKDOWN ──────────────────────────────────────────────

const stripMarkdown = (obj: any): any => {
  if (typeof obj === 'string') {
    return obj
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1');
  }
  if (Array.isArray(obj)) {
    return obj.map(item => stripMarkdown(item));
  }
  if (typeof obj === 'object' && obj !== null) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = stripMarkdown(value);
    }
    return cleaned;
  }
  return obj;
};

// ═══════════════════════════════════════════════════════════════
// ★ v7.5: TOKEN OPTIMIZATION — SECTION RELEVANCE SETS
// ═══════════════════════════════════════════════════════════════

/**
 * Sections where Knowledge Base should be injected.
 * For risks, projectManagement, allocation, summary — KB is NOT needed.
 */
const KB_RELEVANT_SECTIONS = new Set([
  'problemAnalysis', 'projectIdea', 'stateOfTheArt', 'proposedSolution',
  'policies', 'causes', 'consequences', 'coreProblem', 'mainAim',
  'generalObjectives', 'specificObjectives',
  'outputs', 'outcomes', 'impacts', 'kers',
  'partners',
]);

/**
 * Sections where Intervention Logic Framework should be injected.
 * For field-level, risks, projectManagement — IL adds no value.
 */
const INTERVENTION_LOGIC_SECTIONS = new Set([
  'problemAnalysis', 'projectIdea', 'coreProblem', 'causes', 'consequences',
  'mainAim', 'stateOfTheArt', 'proposedSolution', 'policies',
  'generalObjectives', 'specificObjectives',
  'activities', 'outputs', 'outcomes', 'impacts', 'kers',
]);

/**
 * Sections where Academic Rigor Rules should be injected.
 * Only content-heavy analytical sections need citations.
 */
const ACADEMIC_RIGOR_SECTIONS = new Set([
  'problemAnalysis', 'projectIdea', 'coreProblem', 'causes', 'consequences',
  'mainAim', 'stateOfTheArt', 'proposedSolution', 'policies',
  'generalObjectives', 'specificObjectives',
  'outputs', 'outcomes', 'impacts', 'kers',
]);

// ═══════════════════════════════════════════════════════════════
// ★ v7.5: RELEVANT CONTEXT BUILDER — replaces getContext() in prompts
// Sends ONLY the project sections relevant to the current generation.
// ═══════════════════════════════════════════════════════════════

/**
 * Maps each sectionKey to the project data keys it needs for context.
 * This dramatically reduces input tokens per request.
 */
const SECTION_CONTEXT_MAP: Record<string, string[]> = {
  // Chapter 1 — needs only its own data + project idea summary
  problemAnalysis: ['problemAnalysis', 'projectIdea'],
  coreProblem: ['problemAnalysis'],
  causes: ['problemAnalysis'],
  consequences: ['problemAnalysis'],

  // Chapter 2 — needs problem analysis + its own data
  projectIdea: ['problemAnalysis', 'projectIdea'],
  projectTitleAcronym: ['projectIdea'],
  mainAim: ['problemAnalysis', 'projectIdea'],
  stateOfTheArt: ['problemAnalysis', 'projectIdea'],
  proposedSolution: ['problemAnalysis', 'projectIdea'],
  readinessLevels: ['projectIdea'],
  policies: ['problemAnalysis', 'projectIdea'],

  // Chapters 3–4 — needs problem + idea
  generalObjectives: ['problemAnalysis', 'projectIdea'],
  specificObjectives: ['problemAnalysis', 'projectIdea', 'generalObjectives'],

  // Chapter 5 — needs problem + idea + objectives
  activities: ['problemAnalysis', 'projectIdea', 'generalObjectives', 'specificObjectives', 'partners'],
  projectManagement: ['projectIdea', 'activities', 'partners'],
  risks: ['projectIdea', 'activities'],

  // Chapter 6 — needs objectives + activities
  outputs: ['projectIdea', 'specificObjectives', 'activities'],
  outcomes: ['projectIdea', 'specificObjectives', 'outputs'],
  impacts: ['problemAnalysis', 'projectIdea', 'specificObjectives', 'outputs', 'outcomes'],
  kers: ['projectIdea', 'activities', 'outputs'],

  // Partners — needs problem + idea + activities
  partners: ['problemAnalysis', 'projectIdea', 'activities'],

  // Partner allocations — needs partners + activities
  partnerAllocations: ['partners', 'activities', 'projectIdea'],
};

const getRelevantContext = (sectionKey: string, projectData: any): string => {
  const relevantKeys = SECTION_CONTEXT_MAP[sectionKey] || Object.keys(SECTION_CONTEXT_MAP);
  const sections: string[] = [];

  for (const key of relevantKeys) {
    const data = projectData[key];
    if (!data) continue;

    // Special handling for complex objects
    if (key === 'problemAnalysis') {
      const pa = data;
      if (pa?.coreProblem?.title || pa?.coreProblem?.description ||
          pa?.causes?.length > 0 || pa?.consequences?.length > 0) {
        sections.push(`Problem Analysis:\n${JSON.stringify(pa, null, 2)}`);
      }
    } else if (key === 'projectIdea') {
      const pi = data;
      if (pi?.mainAim || pi?.stateOfTheArt || pi?.proposedSolution || pi?.projectTitle) {
        let endDateStr = '';
        if (pi?.startDate && pi?.durationMonths) {
          endDateStr = calculateProjectEndDate(pi.startDate, pi.durationMonths);
        }
        const piWithDates = {
          ...pi,
          _calculatedEndDate: endDateStr,
          _projectTimeframe: pi?.startDate && endDateStr
            ? `Project runs from ${pi.startDate} to ${endDateStr} (${pi.durationMonths} months). ALL tasks, milestones, and deliverables MUST fall within this timeframe. NO exceptions.`
            : ''
        };
        sections.push(`Project Idea:\n${JSON.stringify(piWithDates, null, 2)}`);
      }
    } else if (key === 'generalObjectives' && Array.isArray(data) && data.length > 0) {
      sections.push(`General Objectives:\n${JSON.stringify(data, null, 2)}`);
    } else if (key === 'specificObjectives' && Array.isArray(data) && data.length > 0) {
      sections.push(`Specific Objectives:\n${JSON.stringify(data, null, 2)}`);
    } else if (key === 'activities' && Array.isArray(data) && data.length > 0) {
      sections.push(`Activities (Work Packages):\n${JSON.stringify(data, null, 2)}`);
    } else if (key === 'partners' && Array.isArray(data) && data.length > 0) {
      sections.push(`Partners (Consortium):\n${JSON.stringify(data, null, 2)}`);
    } else if (key === 'outputs' && Array.isArray(data) && data.length > 0) {
      sections.push(`Outputs:\n${JSON.stringify(data, null, 2)}`);
    } else if (key === 'outcomes' && Array.isArray(data) && data.length > 0) {
      sections.push(`Outcomes:\n${JSON.stringify(data, null, 2)}`);
    } else if (key === 'impacts' && Array.isArray(data) && data.length > 0) {
      sections.push(`Impacts:\n${JSON.stringify(data, null, 2)}`);
    } else if (key === 'fundingModel' && typeof data === 'string') {
      sections.push(`Funding Model: ${data}`);
    }
  }

  return sections.length > 0
    ? `Here is the relevant project context:\n${sections.join('\n')}`
    : 'No project data available yet.';
};

// ═══════════════════════════════════════════════════════════════
// ★ v5.5 [B]: KNOWLEDGE BASE CONTEXT (unchanged)
// ═══════════════════════════════════════════════════════════════

let _kbCache: { orgId: string; texts: string; timestamp: number } | null = null;
const KB_CACHE_TTL = 60000;

const getKnowledgeBaseContext = async (): Promise<string> => {
  try {
    const orgId = storageService.getActiveOrgId();
    if (!orgId) return '';

    if (_kbCache && _kbCache.orgId === orgId && (Date.now() - _kbCache.timestamp) < KB_CACHE_TTL) {
      return _kbCache.texts;
    }

    const documents = await knowledgeBaseService.getAllExtractedTexts(orgId);

    if (documents.length === 0) {
      _kbCache = { orgId, texts: '', timestamp: Date.now() };
      return '';
    }

    const header = '\u2550\u2550\u2550 MANDATORY KNOWLEDGE BASE DOCUMENTS \u2550\u2550\u2550\n' +
      'The following documents are uploaded by the organization admin.\n' +
      'You MUST consider this information when generating content.\n' +
      'Treat these as authoritative reference material.\n\n';

    const body = documents.map((doc, idx) =>
      `\u2500\u2500 Document ${idx + 1}: ${doc.fileName} \u2500\u2500\n${doc.text.substring(0, 8000)}`
    ).join('\n\n');

    const result = header + body;

    _kbCache = { orgId, texts: result, timestamp: Date.now() };

    console.log(`[KnowledgeBase] Injected ${documents.length} documents (${result.length} chars) into AI context`);

    return result;
  } catch (e) {
    console.warn('[KnowledgeBase] Failed to load KB context:', e);
    return '';
  }
};

// ─── ORIGINAL getContext() — KEPT FOR BACKWARD COMPATIBILITY ─────
// Used by generateActivitiesPerWP where full context may still be needed

const getContext = (projectData: any): string => {
  const sections: string[] = [];

  const pa = projectData.problemAnalysis;
  if (pa?.coreProblem?.title || pa?.coreProblem?.description ||
      pa?.causes?.length > 0 || pa?.consequences?.length > 0) {
    sections.push(`Problem Analysis:\n${JSON.stringify(pa, null, 2)}`);
  }

  const pi = projectData.projectIdea;
  if (pi?.mainAim || pi?.stateOfTheArt || pi?.proposedSolution || pi?.projectTitle) {
    let endDateStr = '';
    if (pi?.startDate && pi?.durationMonths) {
      endDateStr = calculateProjectEndDate(pi.startDate, pi.durationMonths);
    }
    const piWithDates = {
      ...pi,
      _calculatedEndDate: endDateStr,
      _projectTimeframe: pi?.startDate && endDateStr
        ? `Project runs from ${pi.startDate} to ${endDateStr} (${pi.durationMonths} months). ALL tasks, milestones, and deliverables MUST fall within this timeframe. NO exceptions.`
        : ''
    };
    sections.push(`Project Idea:\n${JSON.stringify(piWithDates, null, 2)}`);
  }

  if (projectData.generalObjectives?.length > 0)
    sections.push(`General Objectives:\n${JSON.stringify(projectData.generalObjectives, null, 2)}`);
  if (projectData.specificObjectives?.length > 0)
    sections.push(`Specific Objectives:\n${JSON.stringify(projectData.specificObjectives, null, 2)}`);
  if (projectData.activities?.length > 0)
    sections.push(`Activities (Work Packages):\n${JSON.stringify(projectData.activities, null, 2)}`);
  if (projectData.outputs?.length > 0)
    sections.push(`Outputs:\n${JSON.stringify(projectData.outputs, null, 2)}`);
  if (projectData.outcomes?.length > 0)
    sections.push(`Outcomes:\n${JSON.stringify(projectData.outcomes, null, 2)}`);
  if (projectData.impacts?.length > 0)
    sections.push(`Impacts:\n${JSON.stringify(projectData.impacts, null, 2)}`);
  if (projectData.partners?.length > 0)
    sections.push(`Partners (Consortium):\n${JSON.stringify(projectData.partners, null, 2)}`);
  if (projectData.fundingModel)
    sections.push(`Funding Model: ${projectData.fundingModel}`);

  return sections.length > 0
    ? `Here is the current project information (Context):\n${sections.join('\n')}`
    : 'No project data available yet.';
};

// ─── JSON SCHEMA TEXT INSTRUCTION (for OpenRouter) ───────────────

const schemaToTextInstruction = (schema: any): string => {
  try {
    const typeToString = (t: any): string => {
      if (!t) return 'string';
      if (typeof t === 'string') return t.toLowerCase();
      const str = String(t);
      return str ? str.toLowerCase() : 'string';
    };

    const simplify = (s: any): any => {
      if (!s) return 'any';
      const sType = typeToString(s.type);
      if (sType === 'object') {
        const props: any = {};
        if (s.properties) {
          for (const [key, val] of Object.entries(s.properties)) {
            props[key] = simplify(val);
          }
        }
        return { type: 'object', properties: props, required: s.required || [] };
      }
      if (sType === 'array') return { type: 'array', items: simplify(s.items) };
      if (s.enum) return { type: sType, enum: s.enum };
      return sType;
    };

    return `\n\nRESPONSE JSON SCHEMA (you MUST follow this structure exactly):\n${JSON.stringify(simplify(schema), null, 2)}\n`;
  } catch (e) {
    console.warn('[schemaToTextInstruction] Failed to convert schema:', e);
    return '';
  }
};

// ─── JSON SCHEMAS (unchanged from v7.0) ──────────────────────────

import { Type } from "@google/genai";

const problemNodeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['title', 'description']
};

const readinessLevelValueSchema = {
  type: Type.OBJECT,
  properties: {
    level: { type: Type.INTEGER },
    justification: { type: Type.STRING }
  },
  required: ['level', 'justification']
};

const schemas: Record<string, any> = {
  problemAnalysis: {
    type: Type.OBJECT,
    properties: {
      coreProblem: problemNodeSchema,
      causes: { type: Type.ARRAY, items: problemNodeSchema },
      consequences: { type: Type.ARRAY, items: problemNodeSchema }
    },
    required: ['coreProblem', 'causes', 'consequences']
  },
  projectIdea: {
    type: Type.OBJECT,
    properties: {
      projectTitle: { type: Type.STRING },
      projectAcronym: { type: Type.STRING },
      mainAim: { type: Type.STRING },
      stateOfTheArt: { type: Type.STRING },
      proposedSolution: { type: Type.STRING },
      policies: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
          required: ['name', 'description']
        }
      },
      readinessLevels: {
        type: Type.OBJECT,
        properties: {
          TRL: readinessLevelValueSchema,
          SRL: readinessLevelValueSchema,
          ORL: readinessLevelValueSchema,
          LRL: readinessLevelValueSchema,
        },
        required: ['TRL', 'SRL', 'ORL', 'LRL']
      }
    },
    required: ['projectTitle', 'projectAcronym', 'mainAim', 'stateOfTheArt', 'proposedSolution', 'policies', 'readinessLevels']
  },
  objectives: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        indicator: { type: Type.STRING }
      },
      required: ['title', 'description', 'indicator']
    }
  },
  projectManagement: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING },
      structure: {
        type: Type.OBJECT,
        properties: {
          coordinator: { type: Type.STRING },
          steeringCommittee: { type: Type.STRING },
          advisoryBoard: { type: Type.STRING },
          wpLeaders: { type: Type.STRING }
        },
        required: ['coordinator', 'steeringCommittee', 'wpLeaders']
      }
    },
    required: ['description', 'structure']
  },
  activities: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        tasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              dependencies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    predecessorId: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['FS', 'SS', 'FF', 'SF'] }
                  },
                  required: ['predecessorId', 'type']
                }
              }
            },
            required: ['id', 'title', 'description', 'startDate', 'endDate']
          }
        },
        milestones: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ['id', 'description', 'date']
          }
        },
        deliverables: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              indicator: { type: Type.STRING }
            },
            required: ['id', 'title', 'description', 'indicator']
          }
        }
      },
      required: ['id', 'title', 'tasks', 'milestones', 'deliverables']
    }
  },
  results: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        indicator: { type: Type.STRING }
      },
      required: ['title', 'description', 'indicator']
    }
  },
  risks: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        category: { type: Type.STRING, enum: ['technical', 'social', 'economic', 'environmental'] },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        likelihood: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
        impact: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
        mitigation: { type: Type.STRING }
      },
      required: ['id', 'category', 'title', 'description', 'likelihood', 'impact', 'mitigation']
    }
  },
  kers: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        exploitationStrategy: { type: Type.STRING }
      },
      required: ['id', 'title', 'description', 'exploitationStrategy']
    }
  },
  coreProblem: problemNodeSchema,
  causes: { type: Type.ARRAY, items: problemNodeSchema },
  consequences: { type: Type.ARRAY, items: problemNodeSchema },
  projectTitleAcronym: {
    type: Type.OBJECT,
    properties: {
      projectTitle: { type: Type.STRING },
      projectAcronym: { type: Type.STRING }
    },
    required: ['projectTitle', 'projectAcronym']
  },
  mainAim: {
    type: Type.OBJECT,
    properties: { mainAim: { type: Type.STRING } },
    required: ['mainAim']
  },
  stateOfTheArt: {
    type: Type.OBJECT,
    properties: { stateOfTheArt: { type: Type.STRING } },
    required: ['stateOfTheArt']
  },
  proposedSolution: {
    type: Type.OBJECT,
    properties: { proposedSolution: { type: Type.STRING } },
    required: ['proposedSolution']
  },
  readinessLevels: {
    type: Type.OBJECT,
    properties: {
      TRL: readinessLevelValueSchema,
      SRL: readinessLevelValueSchema,
      ORL: readinessLevelValueSchema,
      LRL: readinessLevelValueSchema,
    },
    required: ['TRL', 'SRL', 'ORL', 'LRL']
  },
  policies: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
      required: ['name', 'description']
    }
  },
  partners: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        code: { type: Type.STRING },
        name: { type: Type.STRING },
        expertise: { type: Type.STRING },
        pmRate: { type: Type.NUMBER },
        partnerType: {
          type: Type.STRING,
          enum: [
            'faculty', 'researchInstitute', 'sme', 'publicAgency',
            'internationalAssociation', 'ministry', 'ngo', 'largeEnterprise', 'other'
          ]
        },
      },
      required: ['id', 'code', 'name', 'expertise', 'pmRate', 'partnerType']
    }
  },
};

// ─── MAPPINGS (unchanged) ────────────────────────────────────────

const SECTION_TO_CHAPTER: Record<string, string> = {
  ...SECTION_TO_CHAPTER_MAP,
  expectedResults: 'chapter6_results',
  coreProblem: 'chapter1_problemAnalysis',
  causes: 'chapter1_problemAnalysis',
  consequences: 'chapter1_problemAnalysis',
  projectTitleAcronym: 'chapter2_projectIdea',
  mainAim: 'chapter2_projectIdea',
  stateOfTheArt: 'chapter2_projectIdea',
  proposedSolution: 'chapter2_projectIdea',
  readinessLevels: 'chapter2_projectIdea',
  policies: 'chapter2_projectIdea',
};

const SECTION_TO_SCHEMA: Record<string, string> = {
  problemAnalysis: 'problemAnalysis', projectIdea: 'projectIdea',
  generalObjectives: 'objectives', specificObjectives: 'objectives',
  projectManagement: 'projectManagement', activities: 'activities',
  outputs: 'results', outcomes: 'results', impacts: 'results',
  risks: 'risks', kers: 'kers',
  expectedResults: 'results',
  coreProblem: 'coreProblem', causes: 'causes', consequences: 'consequences',
  projectTitleAcronym: 'projectTitleAcronym', mainAim: 'mainAim',
  stateOfTheArt: 'stateOfTheArt', proposedSolution: 'proposedSolution',
  readinessLevels: 'readinessLevels', policies: 'policies',
  partners: 'partners',
};

// ─── HELPERS (unchanged) ─────────────────────────────────────────

const isValidDate = (d: any): boolean => d instanceof Date && !isNaN(d.getTime());

const sanitizeActivities = (activities: any[]): any[] => {
  const taskMap = new Map<string, { startDate: Date; endDate: Date }>();
  activities.forEach(wp => {
    if (wp.tasks) {
      wp.tasks.forEach((task: any) => {
        if (task.id && task.startDate && task.endDate) {
          taskMap.set(task.id, { startDate: new Date(task.startDate), endDate: new Date(task.endDate) });
        }
      });
    }
  });
  activities.forEach(wp => {
    if (wp.tasks) {
      wp.tasks.forEach((task: any) => {
        if (task.dependencies && Array.isArray(task.dependencies)) {
          task.dependencies.forEach((dep: any) => {
            const pred = taskMap.get(dep.predecessorId);
            const curr = taskMap.get(task.id);
            if (pred && curr && isValidDate(pred.startDate) && isValidDate(pred.endDate) && isValidDate(curr.startDate)) {
              if (dep.type === 'FS' && curr.startDate <= pred.endDate) dep.type = 'SS';
            }
          });
        }
      });
    }
  });
  return activities;
};

// ═══════════════════════════════════════════════════════════════
// TEMPORAL INTEGRITY ENFORCER (unchanged)
// ═══════════════════════════════════════════════════════════════

const enforceTemporalIntegrity = (activities: any[], projectData: any): any[] => {
  const startStr = projectData.projectIdea?.startDate;
  const months = projectData.projectIdea?.durationMonths || 24;

  if (!startStr) return activities;
  if (!activities || activities.length === 0) return activities;

  const startISO = startStr;
  const endISO = calculateProjectEndDate(startStr, months);
  const projectStart = new Date(startISO + 'T00:00:00Z');
  const projectEnd = new Date(endISO + 'T00:00:00Z');

  console.log(`[TemporalIntegrity] Enforcing project envelope: ${startISO} → ${endISO} (${months} months)`);

  let fixCount = 0;

  activities.forEach((wp) => {
    if (wp.tasks && Array.isArray(wp.tasks)) {
      wp.tasks.forEach((task: any) => {
        if (task.startDate) {
          const taskStart = new Date(task.startDate);
          if (taskStart < projectStart) {
            task.startDate = startISO;
            fixCount++;
          }
        }
        if (task.endDate) {
          const taskEnd = new Date(task.endDate);
          if (taskEnd > projectEnd) {
            task.endDate = endISO;
            fixCount++;
          }
        }
        if (task.startDate && task.endDate && task.startDate > task.endDate) {
          task.startDate = task.endDate;
          fixCount++;
        }
      });
    }

    if (wp.milestones && Array.isArray(wp.milestones)) {
      wp.milestones.forEach((ms: any) => {
        if (ms.date) {
          const msDate = new Date(ms.date);
          if (msDate < projectStart) { ms.date = startISO; fixCount++; }
          if (msDate > projectEnd) { ms.date = endISO; fixCount++; }
        }
      });
    }
  });

  if (activities.length >= 2) {
    const pmWP = activities[activities.length - 1];
    const dissWP = activities[activities.length - 2];

    [pmWP, dissWP].forEach((wp) => {
      if (wp.tasks && wp.tasks.length > 0) {
        const sorted = [...wp.tasks].sort((a: any, b: any) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
        if (sorted[0].startDate !== startISO) {
          sorted[0].startDate = startISO;
          fixCount++;
        }
        const lastTask = sorted[sorted.length - 1];
        if (lastTask.endDate !== endISO) {
          lastTask.endDate = endISO;
          fixCount++;
        }
      }
    });
  }

  if (fixCount > 0) {
    console.log(`[TemporalIntegrity] Applied ${fixCount} date corrections.`);
  }

  return activities;
};

// ─── SMART MERGE (unchanged) ─────────────────────────────────────

const smartMerge = (original: any, generated: any): any => {
  if (original === undefined || original === null) return generated;
  if (generated === undefined || generated === null) return original;
  if (typeof original === 'string') return original.trim().length > 0 ? original : generated;
  if (Array.isArray(original) && Array.isArray(generated)) {
    const length = Math.max(original.length, generated.length);
    const mergedArray: any[] = [];
    for (let i = 0; i < length; i++) {
      mergedArray.push(i < original.length ? smartMerge(original[i], generated[i]) : generated[i]);
    }
    return mergedArray;
  }
  if (typeof original === 'object' && typeof generated === 'object') {
    const mergedObj = { ...generated };
    for (const key in original) {
      if (Object.prototype.hasOwnProperty.call(original, key)) {
        mergedObj[key] = smartMerge(original[key], generated?.[key]);
      }
    }
    return mergedObj;
  }
  return original !== null && original !== undefined ? original : generated;
};

// ─── TASK INSTRUCTION BUILDER (unchanged from v7.0) ──────────────

const buildTaskInstruction = (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si'
): string => {
  const SUB_TO_PARENT_TASK: Record<string, string> = {
    coreProblem: 'problemAnalysis', causes: 'problemAnalysis', consequences: 'problemAnalysis',
    projectTitleAcronym: 'projectIdea', mainAim: 'projectIdea', stateOfTheArt: 'projectIdea',
    proposedSolution: 'projectIdea', readinessLevels: 'projectIdea', policies: 'projectIdea',
  };

  const effectiveKey = SUB_TO_PARENT_TASK[sectionKey] || sectionKey;
  let taskInstr = getTaskInstruction(effectiveKey, language);

  switch (effectiveKey) {
    case 'problemAnalysis': {
      const cp = projectData.problemAnalysis?.coreProblem;
      const titleStr = cp?.title?.trim() || '';
      const descStr = cp?.description?.trim() || '';
      const contextParts: string[] = [];
      if (titleStr) contextParts.push(`Title: "${titleStr}"`);
      if (descStr) contextParts.push(`Description: "${descStr}"`);
      const userInput = contextParts.length > 0 ? contextParts.join('\n') : '(no user input yet)';
      taskInstr = taskInstr.replace('{{userInput}}', userInput);
      break;
    }
    case 'projectIdea': {
      const userTitle = projectData.projectIdea?.projectTitle?.trim() || '';
      if (userTitle) {
        const titleContext = `USER INPUT FOR PROJECT TITLE: "${userTitle}"\nTITLE RULES:\n- If the user's input is acceptable (30–200 chars, noun phrase, no acronym), KEEP IT UNCHANGED.\n- If the user's input is too short, too long, or contains a verb, IMPROVE it following the project title rules above.\n- NEVER generate a completely different title — stay on the user's topic.\n\n`;
        taskInstr = taskInstr.replace('{{titleContext}}', titleContext);
      } else {
        taskInstr = taskInstr.replace('{{titleContext}}', '');
      }
      break;
    }
    case 'partners': {
      const wpCount = (projectData.activities || []).length;
      const wpTitles = (projectData.activities || []).map((wp: any) => wp.title || wp.id).join(', ');
      const fundingModel = projectData.fundingModel || 'centralized';
      if (wpCount > 0) {
        taskInstr += `\n\nADDITIONAL CONTEXT FOR PARTNER GENERATION:\n- Funding Model: ${fundingModel}\n- Number of WPs: ${wpCount}\n- WP Titles: ${wpTitles}`;
      }
      break;
    }
    case 'activities': {
      const today = new Date().toISOString().split('T')[0];
      const pStart = projectData.projectIdea?.startDate || today;
      const pMonths = projectData.projectIdea?.durationMonths || 24;
      const pEnd = calculateProjectEndDate(pStart, pMonths);
      taskInstr = taskInstr
        .replaceAll('{{projectStart}}', pStart)
        .replaceAll('{{projectEnd}}', pEnd)
        .replaceAll('{{projectDurationMonths}}', String(pMonths));
      break;
    }
  }

  return taskInstr;
};

// ─── PROMPT BUILDER ──────────────────────────────────────────────
// ★ v7.5: Uses getRelevantContext() instead of getContext()
// ★ v7.5: Conditional IL, Academic Rigor, and Consortium rules

const getPromptAndSchemaForSection = (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate',
  currentSectionData: any = null
) => {
  // ★ v7.5: Use relevant context instead of full context
  const context = getRelevantContext(sectionKey, projectData);
  const schemaKey = SECTION_TO_SCHEMA[sectionKey];
  const schema = schemas[schemaKey];

  if (!schema) throw new Error(`Unknown section key: ${sectionKey}`);

  const config = getProviderConfig();
  const needsTextSchema = config.provider !== 'gemini';
  const textSchema = needsTextSchema ? schemaToTextInstruction(schema) : '';

  // ★ v7.5: CONDITIONAL rule injection
  const interventionLogic = INTERVENTION_LOGIC_SECTIONS.has(sectionKey)
    ? getInterventionLogicFramework() : '';
  const langDirective = getLanguageDirective(language);
  const langMismatchNotice = detectInputLanguageMismatch(projectData, language);
  const globalRules = getGlobalRules();
  const sectionRules = getRulesForSection(sectionKey, language);
  const academicRules = ACADEMIC_RIGOR_SECTIONS.has(sectionKey)
    ? getAcademicRigorRules(language) : '';
  const humanRules = getHumanizationRules(language);
  const titleRules = (sectionKey === 'projectIdea' || sectionKey === 'projectTitleAcronym')
    ? getProjectTitleRules(language) : '';

  const consortiumRules = (sectionKey === 'partners' || sectionKey === 'activities')
    ? getConsortiumAllocationRules() : '';
  const resourceRules = (sectionKey === 'partners' || sectionKey === 'activities')
    ? getResourceCoherenceRules() : '';

  let modeInstruction = getModeInstruction(mode, language);
  if ((mode === 'fill' || mode === 'enhance') && currentSectionData) {
    modeInstruction = `${modeInstruction}\nExisting data: ${JSON.stringify(currentSectionData)}`;
  }

  const taskInstruction = buildTaskInstruction(sectionKey, projectData, language);

  const qualityGates = getQualityGates(sectionKey, language);
  const qualityGateBlock = qualityGates.length > 0
    ? `\nQUALITY GATE — verify ALL before returning JSON:\n${formatRulesAsList(qualityGates)}`
    : '';

  let temporalRuleBlock = '';
  if (sectionKey === 'activities') {
    const today = new Date().toISOString().split('T')[0];
    const pStart = projectData.projectIdea?.startDate || today;
    const pMonths = projectData.projectIdea?.durationMonths || 24;
    const pEnd = calculateProjectEndDate(pStart, pMonths);
    temporalRuleBlock = getTemporalIntegrityRule(language)
      .replace(/\{\{projectStart\}\}/g, pStart)
      .replace(/\{\{projectEnd\}\}/g, pEnd)
      .replace(/\{\{projectDurationMonths\}\}/g, String(pMonths));
  }

  const SUB_SECTION_FOCUS: Record<string, string> = {
    coreProblem: 'FOCUS: Generate ONLY the Core Problem (title + description). Do NOT generate causes or consequences.',
    causes: 'FOCUS: Generate ONLY the Causes array (4-6 causes, each with title + description + citation). Do NOT generate core problem or consequences.',
    consequences: 'FOCUS: Generate ONLY the Consequences array (4-6 consequences, each with title + description + citation). Do NOT generate core problem or causes.',
    projectTitleAcronym: 'FOCUS: Generate ONLY projectTitle and projectAcronym. Follow the PROJECT TITLE RULES and ACRONYM RULES strictly. Return JSON object with exactly 2 fields.',
    mainAim: 'FOCUS: Generate ONLY the Main Aim — one comprehensive sentence starting with an infinitive verb. Return JSON object: { "mainAim": "..." }',
    stateOfTheArt: 'FOCUS: Generate ONLY the State of the Art — a thorough analysis of the current situation with ≥3 citations from real sources. Return JSON object: { "stateOfTheArt": "..." }',
    proposedSolution: 'FOCUS: Generate ONLY the Proposed Solution — start with 5-8 sentence introduction, then phases with plain text headers. Return JSON object: { "proposedSolution": "..." }',
    readinessLevels: 'FOCUS: Generate ONLY the Readiness Levels (TRL, SRL, ORL, LRL) — each with a numeric level and justification. Return JSON object with exactly 4 sub-objects.',
    policies: 'FOCUS: Generate ONLY the EU Policies array (3-5 policies, each with name + description). Do NOT generate other project idea fields.',
  };
  const focusInstruction = SUB_SECTION_FOCUS[sectionKey] || '';

  const prompt = [
    interventionLogic,
    focusInstruction ? `\n★★★ ${focusInstruction} ★★★\n` : '',
    temporalRuleBlock ? `\n${temporalRuleBlock}\n` : '',
    langDirective,
    langMismatchNotice ? `\n${langMismatchNotice}\n` : '',
    `\nGLOBAL RULES:\n${globalRules}`,
    sectionRules ? `\nDETAILED CHAPTER RULES:\n${sectionRules}` : '',
    academicRules ? `\n${academicRules}` : '',
    humanRules ? `\n${humanRules}` : '',
    titleRules ? `\n${titleRules}` : '',
    consortiumRules ? `\n${consortiumRules}` : '',
    resourceRules ? `\n${resourceRules}` : '',
    `\n${context}`,
    taskInstruction ? `\n${taskInstruction}` : '',
    modeInstruction ? `\n${modeInstruction}` : '',
    textSchema,
    qualityGateBlock,
    temporalRuleBlock ? `\n${temporalRuleBlock}` : '',
    focusInstruction ? `\n★★★ REMINDER: ${focusInstruction} ★★★` : ''
  ].filter(Boolean).join('\n');

  return { prompt, schema: needsTextSchema ? null : schema };
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: SECTION GENERATION
// ★ v7.5: Conditional KB injection + AbortSignal support
// ═══════════════════════════════════════════════════════════════

export const generateSectionContent = async (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate',
  currentSectionData: any = null,
  signal?: AbortSignal  // ★ v7.5: AbortSignal
): Promise<any> => {
  // ★ v7.5: Check abort before starting
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const { prompt, schema } = getPromptAndSchemaForSection(sectionKey, projectData, language, mode, currentSectionData);

  // ★ v7.5: Conditional KB injection — only for relevant sections
  let fullPrompt = prompt;
  if (KB_RELEVANT_SECTIONS.has(sectionKey)) {
    const kbContext = await getKnowledgeBaseContext();
    if (kbContext) fullPrompt = kbContext + '\n\n' + fullPrompt;
  }

  // ★ v7.9 EO-042: Web Search injection — only for relevant sections
  if (KB_RELEVANT_SECTIONS.has(sectionKey) && isWebSearchAvailable()) {
    try {
      var searchInfo = extractSearchTopic(sectionKey, projectData);
      if (searchInfo.topic && searchInfo.topic.length >= 10) {
        console.log('[geminiService] v7.9 WebSearch: searching for "' + searchInfo.topic.substring(0, 60) + '" region="' + searchInfo.region + '"');
        var searchResults = await searchForEvidence(searchInfo.topic, searchInfo.region, language);
        var searchBlock = formatSearchResultsForPrompt(searchResults);
        if (searchBlock) {
          fullPrompt = searchBlock + '\n\n' + fullPrompt;
          console.log('[geminiService] v7.9 WebSearch: injected ' + searchResults.length + ' results (' + searchBlock.length + ' chars) into prompt for ' + sectionKey);
        }
      }
    } catch (webSearchErr) {
      console.warn('[geminiService] v7.9 WebSearch failed (non-fatal):', webSearchErr);
    }
  }

  // ★ v7.5: Check abort after KB load
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const result = await generateContent({
    prompt: fullPrompt,
    schema: schema || undefined,
    jsonMode: true,
    sectionKey,
    signal,  // ★ v7.5: Forward signal
  });

  let parsed: any;
  try {
    const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[geminiService] Failed to parse AI response as JSON:', e);
    throw new Error('AI response was not valid JSON');
  }

  parsed = stripMarkdown(parsed);

  if (['mainAim', 'stateOfTheArt', 'proposedSolution'].includes(sectionKey)) {
    if (parsed && typeof parsed === 'object' && parsed[sectionKey]) {
      return parsed[sectionKey];
    }
  }

  if (sectionKey === 'projectIdea' && parsed?.projectTitle) {
    parsed.projectTitle = sanitizeProjectTitle(parsed.projectTitle);
  }
  if (sectionKey === 'projectTitleAcronym' && parsed?.projectTitle) {
    parsed.projectTitle = sanitizeProjectTitle(parsed.projectTitle);
  }

  if (sectionKey === 'activities' && Array.isArray(parsed)) {
    parsed = sanitizeActivities(parsed);
    parsed = enforceTemporalIntegrity(parsed, projectData);
  }

  if (sectionKey === 'partners' && Array.isArray(parsed)) {
    parsed = parsed.map((p: any, idx: number) => ({
      ...p,
      id: p.id || `partner-${idx + 1}`,
      code: p.code || (idx === 0 ? (language === 'si' ? 'KO' : 'CO') : `P${idx + 1}`),
      partnerType: (p.partnerType && isValidPartnerType(p.partnerType))
        ? p.partnerType
        : 'other',
    }));
  }

    if (mode === 'fill' && currentSectionData) {
    parsed = smartMerge(currentSectionData, parsed);
  }

  // ★ v7.6: UNIVERSAL POST-PROCESSING — ensure ALL fields are non-empty
  // Applies to EVERY section, EVERY field — no exceptions.
  const ensureNonEmptyFields = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map((item: any) => ensureNonEmptyFields(item));
    }
    if (obj && typeof obj === 'object') {
      const fixed: any = { ...obj };
      for (const [key, value] of Object.entries(fixed)) {
        if (typeof value === 'string' && value.trim() === '') {
          fixed[key] = `[AI did not generate this field — please fill manually or regenerate]`;
          console.warn(`[geminiService] ★ Empty field detected: "${key}" in section "${sectionKey}" — placeholder inserted.`);
        } else if (typeof value === 'object' && value !== null) {
          fixed[key] = ensureNonEmptyFields(value);
        }
      }
      return fixed;
    }
    return obj;
  };

  parsed = ensureNonEmptyFields(parsed);

  return parsed;
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: PER-WP ACTIVITIES GENERATION
// ★ v7.5: AbortSignal support
// ═══════════════════════════════════════════════════════════════

export const generateActivitiesPerWP = async (
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate',
  onProgress?: ((wpIndex: number, wpTotal: number, wpTitle: string) => void) | ((msg: string) => void),
  existingActivities?: any[],
  onlyIndices?: number[],
  signal?: AbortSignal  // ★ v7.5: AbortSignal
): Promise<any[]> => {
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  // Use full context for activities (they need comprehensive project view)
  const context = getContext(projectData);
  const globalRules = getGlobalRules();
  const sectionRules = getRulesForSection('activities', language);
  const academicRules = getAcademicRigorRules(language);
  const humanRules = getHumanizationRules(language);
  const interventionLogic = getInterventionLogicFramework();
  const consortiumRules = getConsortiumAllocationRules();
  const resourceRules = getResourceCoherenceRules();

  const today = new Date().toISOString().split('T')[0];
  const pStart = projectData.projectIdea?.startDate || today;
  const pMonths = projectData.projectIdea?.durationMonths || 24;
  const pEnd = calculateProjectEndDate(pStart, pMonths);

  const temporalRule = getTemporalIntegrityRule(language)
    .replace(/\{\{projectStart\}\}/g, pStart)
    .replace(/\{\{projectEnd\}\}/g, pEnd)
    .replace(/\{\{projectDurationMonths\}\}/g, String(pMonths));

  // ★ v7.5: Conditional KB for activities
  let kbContext = '';
  if (KB_RELEVANT_SECTIONS.has('activities')) {
    kbContext = await getKnowledgeBaseContext();
  }

  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  // PHASE 1: Generate scaffold
  const scaffoldPrompt = [
    kbContext || '',
    interventionLogic,
    temporalRule,
    getLanguageDirective(language),
    `\nGLOBAL RULES:\n${globalRules}`,
    sectionRules ? `\nDETAILED CHAPTER RULES:\n${sectionRules}` : '',
    academicRules ? `\n${academicRules}` : '',
    humanRules ? `\n${humanRules}` : '',
    consortiumRules ? `\n${consortiumRules}` : '',
    resourceRules ? `\n${resourceRules}` : '',
    `\n${context}`,
    `\nTASK: Create a SCAFFOLD for work packages. Return a JSON array of objects with ONLY: id, title, dateRange (startDate, endDate). Do NOT generate tasks, milestones, or deliverables.
MANDATORY WPs: Second-to-last WP MUST be "Dissemination, Communication & Exploitation", last WP MUST be "Project Management & Coordination". Both must span the full project duration (${pStart} to ${pEnd}).
WP1 MUST be foundational/analytical and include a "Capitalisation and Synergies" task.
Total 5-8 WPs.
WP/TASK ID PREFIX RULES: ${language === 'si' ? 'Use DS prefix for WP IDs (DS1, DS2...) and N prefix for Task IDs (N1.1, N1.2...).' : 'Use WP prefix for WP IDs (WP1, WP2...) and T prefix for Task IDs (T1.1, T1.2...).'}`,
    `\n${temporalRule}`
  ].filter(Boolean).join('\n');

  if (onProgress) {
    if (onProgress.length === 1) {
      (onProgress as (msg: string) => void)(language === 'si' ? 'Generiranje ogrodja delovnih paketov...' : 'Generating work package scaffold...');
    } else {
      (onProgress as (wpIndex: number, wpTotal: number, wpTitle: string) => void)(-1, 0, '');
    }
  }

  const scaffoldResult = await generateContent({
    prompt: scaffoldPrompt,
    jsonMode: true,
    sectionKey: 'activities',
    signal,  // ★ v7.5
  });

  let scaffold: any[];
  try {
    const jsonStr = scaffoldResult.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    scaffold = JSON.parse(jsonStr);
    if (!Array.isArray(scaffold)) throw new Error('Scaffold is not an array');
  } catch (e) {
    console.error('[geminiService] Failed to parse scaffold:', e);
    throw new Error('AI scaffold response was not valid JSON');
  }

  // PHASE 2: Generate each WP individually
  const fullActivities: any[] = [];

  for (let wpIdx = 0; wpIdx < scaffold.length; wpIdx++) {
    // ★ v7.5: Check abort between WP generations
    if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

    const wpScaffold = scaffold[wpIdx];
    const wpPfx = language === 'si' ? 'DS' : 'WP';
    const wpId = wpScaffold.id || `${wpPfx}${wpIdx + 1}`;

    if (onProgress) {
      if (onProgress.length === 1) {
        (onProgress as (msg: string) => void)(
          language === 'si'
            ? `Generiranje ${wpId}: ${wpScaffold.title || ''}...`
            : `Generating ${wpId}: ${wpScaffold.title || ''}...`
        );
      } else {
        (onProgress as (wpIndex: number, wpTotal: number, wpTitle: string) => void)(
          wpIdx, scaffold.length, wpScaffold.title || ''
        );
      }
    }

    const previousWPsContext = fullActivities.length > 0
      ? `\nALREADY GENERATED WORK PACKAGES:\n${JSON.stringify(fullActivities, null, 2)}`
      : '';

    const wpPrompt = [
      kbContext || '',
      interventionLogic,
      temporalRule,
      getLanguageDirective(language),
      `\nGLOBAL RULES:\n${globalRules}`,
      sectionRules ? `\nDETAILED CHAPTER RULES:\n${sectionRules}` : '',
      academicRules ? `\n${academicRules}` : '',
      humanRules ? `\n${humanRules}` : '',
      consortiumRules ? `\n${consortiumRules}` : '',
      resourceRules ? `\n${resourceRules}` : '',
      `\n${context}`,
      previousWPsContext,
      `\nSCAFFOLD:\n${JSON.stringify(scaffold, null, 2)}`,
      `\nTASK: Generate the COMPLETE work package ${wpId} ("${wpScaffold.title}").
WP/TASK ID PREFIX RULES: ${language === 'si' ? 'Use DS prefix for WP IDs (DS1, DS2...) and N prefix for Task IDs (N1.1, N1.2...). Milestone IDs: M1.1, Deliverable IDs: D1.1.' : 'Use WP prefix for WP IDs (WP1, WP2...) and T prefix for Task IDs (T1.1, T1.2...). Milestone IDs: M1.1, Deliverable IDs: D1.1.'}
Return ONE JSON object with: id, title, tasks (3-5 tasks with id, title, description, startDate, endDate, dependencies), milestones (1-2), deliverables (1-3 with id, title, description, indicator).

All task dates must be within ${wpScaffold.dateRange?.startDate || pStart} - ${wpScaffold.dateRange?.endDate || pEnd}.
Consider dependencies on tasks in previous WPs.
Every deliverable indicator MUST be BINARY and verifiable (Lump Sum compliant).
If this is WP1, include a "Capitalisation and Synergies" task and a DMP deliverable by M6.
If this is the Dissemination WP, strictly separate CDE tasks (Communication, Dissemination, Exploitation).`,
      `\n${temporalRule}`
    ].filter(Boolean).join('\n');

    if (wpIdx > 0) {
      await new Promise(r => setTimeout(r, 1500));
    }

    const wpResult = await generateContent({
      prompt: wpPrompt,
      jsonMode: true,
      sectionKey: 'activities',
      signal,  // ★ v7.5
    });

    try {
      const jsonStr = wpResult.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      let wpData = JSON.parse(jsonStr);
      if (Array.isArray(wpData)) wpData = wpData[0] || wpData;
      wpData = stripMarkdown(wpData);
      fullActivities.push(wpData);
    } catch (e) {
      console.error(`[geminiService] Failed to parse WP ${wpId}:`, e);
      fullActivities.push({
        id: wpId, title: wpScaffold.title || '',
        tasks: [], milestones: [], deliverables: []
      });
    }
  }

  let result = sanitizeActivities(fullActivities);
  result = enforceTemporalIntegrity(result, projectData);

  // Force correct prefixes
  const wpPfxFinal = language === 'si' ? 'DS' : 'WP';
  const tskPfxFinal = language === 'si' ? 'N' : 'T';
  result.forEach((wp: any, wpIdx: number) => {
    wp.id = `${wpPfxFinal}${wpIdx + 1}`;
    if (wp.tasks && Array.isArray(wp.tasks)) {
      wp.tasks.forEach((task: any, tIdx: number) => {
        const oldId = task.id;
        task.id = `${tskPfxFinal}${wpIdx + 1}.${tIdx + 1}`;
        result.forEach((otherWp: any) => {
          (otherWp.tasks || []).forEach((otherTask: any) => {
            (otherTask.dependencies || []).forEach((dep: any) => {
              if (dep.predecessorId === oldId) dep.predecessorId = task.id;
            });
          });
        });
      });
    }
    if (wp.milestones && Array.isArray(wp.milestones)) {
      wp.milestones.forEach((ms: any, mIdx: number) => { ms.id = `M${wpIdx + 1}.${mIdx + 1}`; });
    }
    if (wp.deliverables && Array.isArray(wp.deliverables)) {
      wp.deliverables.forEach((del: any, dIdx: number) => { del.id = `D${wpIdx + 1}.${dIdx + 1}`; });
    }
  });

  return result;
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: TARGETED FILL
// ★ v7.5: AbortSignal support
// ═══════════════════════════════════════════════════════════════

export const generateTargetedFill = async (
  sectionKey: string,
  projectData: any,
  currentData: any,
  language: 'en' | 'si' = 'en',
  signal?: AbortSignal  // ★ v7.5
): Promise<any> => {
  const result = await generateSectionContent(sectionKey, projectData, language, 'fill', currentData, signal);

  if (sectionKey === 'activities' && Array.isArray(result)) {
    let processed = sanitizeActivities(result);
    processed = enforceTemporalIntegrity(processed, projectData);
    return processed;
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: OBJECT FILL
// ★ v7.5: AbortSignal + conditional KB
// ═══════════════════════════════════════════════════════════════

export const generateObjectFill = async (
  sectionKey: string,
  projectData: any,
  currentData: any,
  emptyFields: string[],
  language: 'en' | 'si' = 'en',
  signal?: AbortSignal  // ★ v7.5
): Promise<any> => {
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const { prompt, schema } = getPromptAndSchemaForSection(sectionKey, projectData, language, 'fill', currentData);
  const fillInstruction = `\nEMPTY FIELDS TO FILL: ${emptyFields.join(', ')}\nFill ONLY the listed empty fields. Keep existing data UNCHANGED.`;
  const fullPrompt = prompt + fillInstruction;

  // ★ v7.5: Conditional KB
  let finalPrompt = fullPrompt;
  if (KB_RELEVANT_SECTIONS.has(sectionKey)) {
    const kbContext = await getKnowledgeBaseContext();
    if (kbContext) finalPrompt = `${kbContext}\n\n${fullPrompt}`;
  }

  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const result = await generateContent({
    prompt: finalPrompt,
    schema: schema || undefined,
    jsonMode: true,
    sectionKey,
    signal,  // ★ v7.5
  });

  let parsed: any;
  try {
    const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('AI fill response was not valid JSON');
  }

  parsed = stripMarkdown(parsed);
  return smartMerge(currentData, parsed);
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: PROJECT SUMMARY GENERATION
// ★ v7.5: No KB injection for summary (not in KB_RELEVANT_SECTIONS)
// ═══════════════════════════════════════════════════════════════

export const generateProjectSummary = async (
  projectData: any,
  language: 'en' | 'si' = 'en',
  signal?: AbortSignal  // ★ v7.5
): Promise<string> => {
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const context = getContext(projectData);
  const summaryRules = getSummaryRules(language);
  const langDirective = getLanguageDirective(language);

  const prompt = [
    langDirective,
    `\n${context}`,
    `\nSUMMARY RULES:`,
    formatRules(summaryRules),
    `\nTASK: Write a project summary based on the data above. The summary should be 150-300 words, structured in 3-4 paragraphs. Do not add new information — only condense existing data.`
  ].filter(Boolean).join('\n');

  // ★ v7.5: No KB for summary — it summarizes project data, not KB docs

  const result = await generateContent({
    prompt,
    sectionKey: 'summary',
    signal,  // ★ v7.5
  });

  return result.text.trim();
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: FIELD-LEVEL GENERATION
// ★ v7.5: No KB for field-level (too granular)
// ═══════════════════════════════════════════════════════════════

export const generateFieldContent = async (
  fieldPath: string,
  projectData: any,
  language: 'en' | 'si' = 'en',
  signal?: AbortSignal,
  options?: { userInstructions?: string; currentValue?: string; fieldLabel?: string }
): Promise<string> => {
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  var fieldRule = getFieldRules(fieldPath, language);
  var sectionKey = fieldPath.split('.')[0] || 'projectIdea';
  var context = getRelevantContext(sectionKey, projectData);
  var langDirective = getLanguageDirective(language);
  var globalRules = getGlobalRules();
  var sectionRules = getRulesForSection(sectionKey, language);
  var academicRules = ACADEMIC_RIGOR_SECTIONS.has(sectionKey) ? getAcademicRigorRules(language) : '';
  var humanRules = getHumanizationRules(language);

  var userInstr = (options && options.userInstructions && options.userInstructions.trim()) ? options.userInstructions.trim() : '';
  var currentVal = (options && options.currentValue && options.currentValue.trim()) ? options.currentValue.trim() : '';
  var label = (options && options.fieldLabel) ? options.fieldLabel : fieldPath;

  var taskBlock = '';
  if (currentVal && userInstr) {
    taskBlock = '\nTASK: Improve the field "' + label + '" according to the user instructions.\n'
      + 'Current content:\n"""\n' + currentVal + '\n"""\n'
      + 'User instructions: ' + userInstr + '\n'
      + 'Keep what is good, enhance what is requested. Return ONLY the improved text.\n';
  } else if (currentVal && !userInstr) {
    taskBlock = '\nTASK: Improve and enhance the field "' + label + '". Make it more professional, detailed, and aligned with EU project standards.\n'
      + 'Current content:\n"""\n' + currentVal + '\n"""\n'
      + 'Return ONLY the improved text.\n';
  } else if (!currentVal && userInstr) {
    taskBlock = '\nTASK: Generate content for the empty field "' + label + '" according to the user instructions and project context.\n'
      + 'User instructions: ' + userInstr + '\n'
      + 'Return ONLY the generated text.\n';
  } else {
    taskBlock = '\nTASK: Generate content for the field "' + label + '" based on the project context and field rule.\n';
  }

  var kbContext = '';
  if (KB_RELEVANT_SECTIONS.has(sectionKey)) {
    kbContext = await getKnowledgeBaseContext();
  }

  // ★ v7.9 EO-042: Web Search injection for field-level generation
  var webSearchBlock = '';
  if (KB_RELEVANT_SECTIONS.has(sectionKey) && isWebSearchAvailable()) {
    try {
      var fieldSearchInfo = extractSearchTopic(sectionKey, projectData);
      if (fieldSearchInfo.topic && fieldSearchInfo.topic.length >= 10) {
        var fieldSearchResults = await searchForEvidence(fieldSearchInfo.topic, fieldSearchInfo.region, language);
        webSearchBlock = formatSearchResultsForPrompt(fieldSearchResults);
        if (webSearchBlock) {
          console.log('[geminiService] v7.9 WebSearch (field): injected ' + fieldSearchResults.length + ' results for ' + fieldPath);
        }
      }
    } catch (fieldWebSearchErr) {
      console.warn('[geminiService] v7.9 WebSearch (field) failed (non-fatal):', fieldWebSearchErr);
    }
  }

  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  var promptParts = [
    webSearchBlock || '',
    kbContext || '',
    langDirective,
    '\nGLOBAL RULES:\n' + globalRules,
    sectionRules ? '\nDETAILED CHAPTER RULES:\n' + sectionRules : '',
    academicRules ? '\n' + academicRules : '',
    humanRules ? '\n' + humanRules : '',
    '\n' + context,
    '\nFIELD RULE: ' + fieldRule,
    taskBlock,
    '\nIMPORTANT: Return ONLY plain text content. No JSON, no field names, no quotes, no markdown headers, no bold/italic formatting.\n',
  ].filter(Boolean).join('\n');

  var result = await generateContent({
    prompt: promptParts,
    sectionKey: 'field',
    signal: signal,
    taskType: 'field',
  });

  return stripMarkdown(result.text.trim());
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: PARTNER ALLOCATIONS GENERATION
// ★ v7.5: AbortSignal support
// ═══════════════════════════════════════════════════════════════

export const generatePartnerAllocations = async (
  projectData: any,
  language: 'en' | 'si' = 'en',
  onProgress?: (msg: string) => void,
  signal?: AbortSignal  // ★ v7.5
): Promise<any[]> => {
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const partners = Array.isArray(projectData.partners) ? projectData.partners : [];
  const activities = Array.isArray(projectData.activities) ? projectData.activities : [];
  const fundingModel = projectData.fundingModel || 'centralized';
  const durationMonths = projectData.projectIdea?.durationMonths || 24;

  if (partners.length === 0) throw new Error('No partners defined');
  if (activities.length === 0) throw new Error('No activities defined');

  const taskList: { wpId: string; wpTitle: string; taskId: string; taskTitle: string; taskDesc: string; startDate: string; endDate: string }[] = [];
  activities.forEach((wp: any) => {
    (wp.tasks || []).forEach((task: any) => {
      taskList.push({
        wpId: wp.id || '', wpTitle: wp.title || '',
        taskId: task.id || '', taskTitle: task.title || '',
        taskDesc: (task.description || '').substring(0, 200),
        startDate: task.startDate || '', endDate: task.endDate || '',
      });
    });
  });

  const partnerSummary = partners.map((p: any) => ({
    id: p.id, code: p.code, name: p.name,
    expertise: (p.expertise || '').substring(0, 200),
    partnerType: p.partnerType || 'other',
    pmRate: p.pmRate || 0,
  }));

    const langDirective = getLanguageDirective(language);
  const consortiumRules = getConsortiumAllocationRules();
  const resourceRules = getResourceCoherenceRules();

  // ★ v7.7: Use correct direct cost categories based on funding model
  var CENTRALIZED_DC = [
    { key: 'labourCosts', en: 'Staff/Personnel costs', si: 'Stroški dela' },
    { key: 'subContractorCosts', en: 'Sub-contractor costs', si: 'Stroški podizvajalcev' },
    { key: 'travelCosts', en: 'Travel costs', si: 'Potni stroški' },
    { key: 'materials', en: 'Materials / Consumables', si: 'Material / Potrošni material' },
    { key: 'depreciationEquipment', en: 'Depreciation of equipment', si: 'Amortizacija opreme' },
    { key: 'otherProjectCosts', en: 'Other project costs', si: 'Drugi projektni stroški' },
    { key: 'investmentCosts', en: 'Investment costs', si: 'Investicijski stroški' },
  ];
  var DECENTRALIZED_DC = [
    { key: 'salariesReimbursements', en: 'Salaries and work-related reimbursements', si: 'Stroški plač in povračila stroškov v zvezi z delom' },
    { key: 'externalServiceCosts', en: 'External service provider costs', si: 'Stroški zunanjih izvajalcev storitev' },
    { key: 'vat', en: 'VAT', si: 'DDV' },
    { key: 'intangibleAssetInvestment', en: 'Investments in intangible assets', si: 'Investicije v neopredmetena sredstva' },
    { key: 'depreciationBasicAssets', en: 'Depreciation of basic assets', si: 'Amortizacija osnovnih sredstev' },
    { key: 'infoCommunication', en: 'Information & communication costs', si: 'Stroški informiranja in komuniciranja' },
    { key: 'tangibleAssetInvestment', en: 'Investments in tangible assets', si: 'Investicije v opredmetena osnovna sredstva' },
  ];
  var directCostDefsForPrompt = fundingModel === 'decentralized' ? DECENTRALIZED_DC : CENTRALIZED_DC;
  var labourCategoryKey = fundingModel === 'decentralized' ? 'salariesReimbursements' : 'labourCosts';
  var labourCategoryName = fundingModel === 'decentralized'
    ? (language === 'si' ? 'Stroški plač in povračila stroškov v zvezi z delom' : 'Salaries and work-related reimbursements')
    : (language === 'si' ? 'Stroški dela' : 'Staff / Personnel costs');

  // ★ v7.5: No KB for allocations (pure numerical/structural task)

  const allocPrompt = [
    langDirective,
    consortiumRules ? `\n${consortiumRules}` : '',
    resourceRules ? `\n${resourceRules}` : '',
    `
═══ PARTNER ALLOCATION GENERATION TASK ═══

You are an expert EU project budget planner. Your task is to allocate partners
to tasks with realistic hours, person-months (PM), and direct costs.

PARTNERS IN THE CONSORTIUM:
${JSON.stringify(partnerSummary, null, 2)}

TASKS IN THE PROJECT:
${JSON.stringify(taskList, null, 2)}

FUNDING MODEL: ${fundingModel}
PROJECT DURATION: ${durationMonths} months

ALLOCATION RULES:
1. EVERY task MUST have at least 1 partner allocated.
2. Most tasks should have 2-4 partners allocated.
3. The COORDINATOR (first partner, code "CO") should be allocated to ALL Project Management tasks and have a presence in most WPs.
4. Match partner EXPERTISE to task TOPIC.
5. Hours and PM must be REALISTIC: 1 PM = 143 hours (EU standard).
6. Direct costs: AT MINIMUM the PRIMARY LABOUR category for every allocation. Labour cost = hours × (pmRate / 143).
7. totalDirectCost = sum of all directCosts amounts
8. totalCost = totalDirectCost

DIRECT COST CATEGORIES FOR THIS PROJECT (funding model: ${fundingModel}):
${directCostDefsForPrompt.map(function(cat, i) { return (i + 1) + '. categoryKey: "' + cat.key + '" — ' + cat.en; }).join('\n')}

THE PRIMARY LABOUR CATEGORY KEY IS: "${labourCategoryKey}"
USE ONLY the categoryKey values listed above. Do NOT use keys from other funding models.

RESPONSE FORMAT — JSON array:
[
  {
    "wpId": "WP1",
    "taskId": "T1.1",
    "allocations": [
      {
        "partnerId": "partner-1",
        "hours": 286,
        "pm": 2.0,
        "directCosts": [
          { "id": "dc-1", "categoryKey": "${labourCategoryKey}", "name": "${labourCategoryName}", "amount": 11400 }
        ],
        "totalDirectCost": 11400,
        "totalCost": 11400
      }
    ]
  }
]

CRITICAL:
- partnerId MUST exactly match partner IDs above
- Every allocation MUST have labourCosts
- pm = hours / 143, rounded to 2 decimals
- Return EVERY task — do not skip any
═══════════════════════════════════════════════════════════════════`,
  ].filter(Boolean).join('\n');

  if (onProgress) {
    onProgress(language === 'si'
      ? 'Generiram partnerske alokacije na naloge...'
      : 'Generating partner allocations for tasks...');
  }

  const config = getProviderConfig();
  const needsTextSchema = config.provider !== 'gemini';

  const allocSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        wpId: { type: Type.STRING },
        taskId: { type: Type.STRING },
        allocations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              partnerId: { type: Type.STRING },
              hours: { type: Type.NUMBER },
              pm: { type: Type.NUMBER },
              directCosts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    categoryKey: { type: Type.STRING },
                    name: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                  },
                  required: ['id', 'categoryKey', 'name', 'amount'],
                },
              },
              totalDirectCost: { type: Type.NUMBER },
              totalCost: { type: Type.NUMBER },
            },
            required: ['partnerId', 'hours', 'pm', 'directCosts', 'totalDirectCost', 'totalCost'],
          },
        },
      },
      required: ['wpId', 'taskId', 'allocations'],
    },
  };

  let textSchemaStr = '';
  if (needsTextSchema) {
    textSchemaStr = schemaToTextInstruction(allocSchema);
  }

  const finalPrompt = textSchemaStr ? allocPrompt + textSchemaStr : allocPrompt;

  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const result = await generateContent({
    prompt: finalPrompt,
    schema: needsTextSchema ? undefined : allocSchema,
    jsonMode: true,
    sectionKey: 'partnerAllocations',
    signal,  // ★ v7.5
  });

  let parsed: any[];
  try {
    const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      if (parsed && Array.isArray((parsed as any).allocations)) {
        parsed = (parsed as any).allocations;
      } else if (parsed && Array.isArray((parsed as any).tasks)) {
        parsed = (parsed as any).tasks;
      } else {
        throw new Error('Response is not an array');
      }
    }
  } catch (e) {
    throw new Error('INVALID_JSON|' + (config.provider || 'unknown'));
  }

  // Post-process allocations
  const validPartnerIds = new Set(partners.map((p: any) => p.id));
  const partnerRateMap = new Map(partners.map((p: any) => [p.id, p.pmRate || 0]));

  const processedAllocations = parsed.map((taskAlloc: any) => {
    const allocations = (taskAlloc.allocations || [])
      .filter((a: any) => validPartnerIds.has(a.partnerId))
      .map((a: any) => {
        const hours = Math.max(0, Math.round(a.hours || 0));
        const pm = parseFloat((hours / 143).toFixed(2));
        const rate = partnerRateMap.get(a.partnerId) || 0;
        const labourCost = Math.round(hours * (rate / 143));

        const directCosts = (a.directCosts || []).map((dc: any, dcIdx: number) => {
          if (dc.categoryKey === 'labourCosts') {
            return { ...dc, id: dc.id || `dc-${Date.now()}-${dcIdx}`, amount: labourCost };
          }
          return { ...dc, id: dc.id || `dc-${Date.now()}-${dcIdx}`, amount: Math.max(0, Math.round(dc.amount || 0)) };
        });

                // ★ v7.7: Check for correct labour key based on funding model
        var hasLabour = directCosts.some(function(dc) {
          return dc.categoryKey === labourCategoryKey || dc.categoryKey === 'labourCosts' || dc.categoryKey === 'salariesReimbursements';
        });
        if (!hasLabour && hours > 0) {
          directCosts.unshift({
            id: 'dc-labour-' + Date.now(),
            categoryKey: labourCategoryKey,
            name: labourCategoryName,
            amount: labourCost,
          });
        }

        // ★ v7.7: Remap wrong-model categoryKeys to correct model
        var validKeysSet = new Set(directCostDefsForPrompt.map(function(c) { return c.key; }));
        var centralToDecentralMap = {
          'labourCosts': 'salariesReimbursements',
          'subContractorCosts': 'externalServiceCosts',
          'travelCosts': 'vat',
          'depreciationEquipment': 'depreciationBasicAssets',
          'investmentCosts': 'tangibleAssetInvestment',
          'materials': 'intangibleAssetInvestment',
          'otherProjectCosts': 'infoCommunication',
        };
        var decentralToCentralMap = {};
        Object.keys(centralToDecentralMap).forEach(function(k) {
          decentralToCentralMap[centralToDecentralMap[k]] = k;
        });
        var remapSource = fundingModel === 'decentralized' ? centralToDecentralMap : decentralToCentralMap;

        directCosts.forEach(function(dc) {
          if (!validKeysSet.has(dc.categoryKey)) {
            var remapped = remapSource[dc.categoryKey];
            if (remapped) {
              console.log('[generatePartnerAllocations] v7.7 REMAP: ' + dc.categoryKey + ' -> ' + remapped);
              var catDef = directCostDefsForPrompt.find(function(c) { return c.key === remapped; });
              dc.categoryKey = remapped;
              if (catDef) dc.name = catDef[language === 'si' ? 'si' : 'en'];
            }
          }
        });

        const totalDirectCost = directCosts.reduce((s: number, dc: any) => s + (dc.amount || 0), 0);

        return { partnerId: a.partnerId, hours, pm, directCosts, totalDirectCost, totalCost: totalDirectCost };
      });

    return { wpId: taskAlloc.wpId, taskId: taskAlloc.taskId, allocations };
  });

    // ═══════════════════════════════════════════════════════════════
  // ★ v7.6: POST-PROCESSING BUDGET ENFORCEMENT
  // Enforce RESOURCE_COHERENCE_RULES after AI generation.
  // AI often ignores percentage limits — we enforce them here.
  // ═══════════════════════════════════════════════════════════════

  // Step 1: Identify PM WP (last) and Dissemination WP (second-to-last)
  var wpIds = activities.map(function(wp) { return wp.id; });
  var pmWpId = wpIds.length > 0 ? wpIds[wpIds.length - 1] : null;
  var dissWpId = wpIds.length > 1 ? wpIds[wpIds.length - 2] : null;

  // Step 2: Calculate total budget and per-WP budgets
  var wpBudgets = {};
  var grandTotal = 0;
  processedAllocations.forEach(function(taskAlloc) {
    var wpId = taskAlloc.wpId;
    if (!wpBudgets[wpId]) wpBudgets[wpId] = 0;
    (taskAlloc.allocations || []).forEach(function(alloc) {
      var cost = alloc.totalCost || alloc.totalDirectCost || 0;
      wpBudgets[wpId] += cost;
      grandTotal += cost;
    });
  });

  if (grandTotal > 0 && pmWpId && dissWpId) {
    var pmBudget = wpBudgets[pmWpId] || 0;
    var dissBudget = wpBudgets[dissWpId] || 0;
    var pmPercent = (pmBudget / grandTotal) * 100;
    var dissPercent = (dissBudget / grandTotal) * 100;

    // Step 3: Determine PM WP max percentage based on total budget
    var pmMaxPercent = 15;
    if (grandTotal > 10000000) pmMaxPercent = 5;
    else if (grandTotal > 5000000) pmMaxPercent = 7;
    else if (grandTotal > 3000000) pmMaxPercent = 7;
    else if (grandTotal > 1000000) pmMaxPercent = 10;
    else if (grandTotal > 500000) pmMaxPercent = 10;

    var dissTargetPercent = 15;
    var budgetAdjusted = false;

    console.log('[generatePartnerAllocations] v7.6 BUDGET CHECK: grandTotal=' + Math.round(grandTotal) + ' EUR, PM=' + pmPercent.toFixed(1) + '% (max ' + pmMaxPercent + '%), Diss=' + dissPercent.toFixed(1) + '% (target ~' + dissTargetPercent + '%)');

    // Step 4: Scale down PM WP if over limit
    if (pmPercent > pmMaxPercent) {
      var pmTargetBudget = grandTotal * (pmMaxPercent / 100);
      var pmScale = pmTargetBudget / pmBudget;
      console.log('[generatePartnerAllocations] v7.6 SCALE PM: ' + pmPercent.toFixed(1) + '% -> ' + pmMaxPercent + '% (scale factor: ' + pmScale.toFixed(3) + ')');

      processedAllocations.forEach(function(taskAlloc) {
        if (taskAlloc.wpId === pmWpId) {
          (taskAlloc.allocations || []).forEach(function(alloc) {
            alloc.hours = Math.max(1, Math.round(alloc.hours * pmScale));
            alloc.pm = parseFloat((alloc.hours / 143).toFixed(2));
            alloc.directCosts = (alloc.directCosts || []).map(function(dc) {
              return { id: dc.id, categoryKey: dc.categoryKey, name: dc.name, amount: Math.round(dc.amount * pmScale) };
            });
            alloc.totalDirectCost = alloc.directCosts.reduce(function(s, dc) { return s + (dc.amount || 0); }, 0);
            alloc.totalCost = alloc.totalDirectCost;
          });
        }
      });
      budgetAdjusted = true;
    }

    // Step 5: Scale down Dissemination WP if significantly over target (>20%)
    if (dissPercent > 20) {
      var dissTargetBudget = grandTotal * (dissTargetPercent / 100);
      var dissScale = dissTargetBudget / dissBudget;
      console.log('[generatePartnerAllocations] v7.6 SCALE DISS: ' + dissPercent.toFixed(1) + '% -> ~' + dissTargetPercent + '% (scale factor: ' + dissScale.toFixed(3) + ')');

      processedAllocations.forEach(function(taskAlloc) {
        if (taskAlloc.wpId === dissWpId) {
          (taskAlloc.allocations || []).forEach(function(alloc) {
            alloc.hours = Math.max(1, Math.round(alloc.hours * dissScale));
            alloc.pm = parseFloat((alloc.hours / 143).toFixed(2));
            alloc.directCosts = (alloc.directCosts || []).map(function(dc) {
              return { id: dc.id, categoryKey: dc.categoryKey, name: dc.name, amount: Math.round(dc.amount * dissScale) };
            });
            alloc.totalDirectCost = alloc.directCosts.reduce(function(s, dc) { return s + (dc.amount || 0); }, 0);
            alloc.totalCost = alloc.totalDirectCost;
          });
        }
      });
      budgetAdjusted = true;
    }

    if (budgetAdjusted) {
      // Recalculate final totals for logging
      var newGrandTotal = 0;
      var newPmBudget = 0;
      var newDissBudget = 0;
      processedAllocations.forEach(function(taskAlloc) {
        (taskAlloc.allocations || []).forEach(function(alloc) {
          var cost = alloc.totalCost || 0;
          newGrandTotal += cost;
          if (taskAlloc.wpId === pmWpId) newPmBudget += cost;
          if (taskAlloc.wpId === dissWpId) newDissBudget += cost;
        });
      });
      console.log('[generatePartnerAllocations] v7.6 AFTER ADJUSTMENT: grandTotal=' + Math.round(newGrandTotal) + ' EUR, PM=' + (newGrandTotal > 0 ? (newPmBudget / newGrandTotal * 100).toFixed(1) : '0') + '%, Diss=' + (newGrandTotal > 0 ? (newDissBudget / newGrandTotal * 100).toFixed(1) : '0') + '%');
    }
  }

  console.log('[generatePartnerAllocations] Generated allocations for ' + processedAllocations.length + ' tasks');

  return processedAllocations;

};

// ═══════════════════════════════════════════════════════════════
// END OF geminiService.ts v7.5
// ═══════════════════════════════════════════════════════════════
