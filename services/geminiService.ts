// services/geminiService.ts
// ═══════════════════════════════════════════════════════════════
// AI content generation service — THIN LAYER.
//
// THIS FILE CONTAINS ZERO CONTENT RULES.
// ALL rules come from services/Instructions.ts.
// This file is responsible ONLY for:
//  - Building project context strings
//  - Assembling prompts from Instructions.ts rule blocks
//  - Calling the AI provider
//  - Post-processing (JSON parsing, sanitization, merging)
//
// v7.0 — 2026-02-22 — FULL v7.0 ALIGNMENT WITH Instructions.ts v7.0
//   - CHANGED: All imports updated to v7.0 accessor functions from Instructions.ts
//   - CHANGED: schemas.partners now includes partnerType field (enum, 9 values, REQUIRED)
//   - NEW: Intervention Logic Framework injected into every prompt
//   - NEW: Consortium Allocation Rules injected for partners + activities
//   - NEW: Resource Coherence Rules injected for activities + partners
//   - NEW: Cross-Chapter Consistency Gate available for quality checks
//   - CHANGED: buildTaskInstruction uses getTaskInstruction() directly
//   - CHANGED: getPromptAndSchemaForSection uses buildFullPromptContext() helper
//   - CHANGED: Post-processing for partners includes partnerType validation + fallback
//   - CHANGED: Partner code fallback: idx===0 → 'CO', else P{idx+1}
//   - All previous v6.0 / v5.6 changes preserved.
//
// v6.0 — 2026-02-22 — PARTNERS (CONSORTIUM) GENERATION
// v5.6 — 2026-02-21 — CONSOLIDATED LANGUAGE DETECTION
// v5.5 — 2026-02-21 — KNOWLEDGE BASE INTEGRATION
// v5.4 — 2026-02-16 — SUB-SECTION GENERATION
// v5.0 — 2026-02-16 — PER-WP GENERATION + DATE FIX + SUMMARY FIX + ACRONYM
// v4.7 — 2026-02-15 — TARGETED FILL
// v4.6 — 2026-02-15 — TEMPORAL INTEGRITY ENFORCER
// v4.5 — 2026-02-14 — DYNAMIC MAX_TOKENS
// v4.4 — 2026-02-14 — DELIVERABLE TITLE SCHEMA
// v4.3 — 2026-02-14 — PROMPT ORDER + SCHEMA FIX
// v4.1 — 2026-02-14 — SINGLE SOURCE OF TRUTH REFACTOR
// ═══════════════════════════════════════════════════════════════

import { storageService } from './storageService.ts';
// ★ v5.5 [A]: Knowledge Base import
import { knowledgeBaseService } from './knowledgeBaseService.ts';

// ★ v7.0: Updated imports — all from Instructions.ts v7.0 accessor functions
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

// ★ v5.6: Added detectTextLanguage import for consolidated language detection
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
    // ★ v7.0: Use getLanguageMismatchTemplate() and replace placeholders
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
// ★ v5.5 [B]: KNOWLEDGE BASE CONTEXT
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

// ─── PROJECT CONTEXT BUILDER ─────────────────────────────────────
// ★ v6.0: Added partners + fundingModel to context
// ★ v7.0: Unchanged from v6.0 — context structure is stable

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

  // ★ v6.0: Partners and funding model context
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

// ─── JSON SCHEMAS ────────────────────────────────────────────────

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

  // ★ v5.4: SUB-SECTION SCHEMAS
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

  // ★ v7.0: Partners (Consortium) schema — added partnerType with enum
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
            'faculty',
            'researchInstitute',
            'sme',
            'publicAgency',
            'internationalAssociation',
            'ministry',
            'ngo',
            'largeEnterprise',
            'other'
          ]
        },
      },
      required: ['id', 'code', 'name', 'expertise', 'pmRate', 'partnerType']
    }
  },
};

// ─── MAPPINGS ────────────────────────────────────────────────────
// ★ v7.0: Uses SECTION_TO_CHAPTER_MAP from Instructions.ts as primary,
//          with local extensions for sub-section keys

const SECTION_TO_CHAPTER: Record<string, string> = {
  ...SECTION_TO_CHAPTER_MAP,
  // Sub-section mappings (not in Instructions.ts map)
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
  // Sub-section schema mappings
  coreProblem: 'coreProblem', causes: 'causes', consequences: 'consequences',
  projectTitleAcronym: 'projectTitleAcronym', mainAim: 'mainAim',
  stateOfTheArt: 'stateOfTheArt', proposedSolution: 'proposedSolution',
  readinessLevels: 'readinessLevels', policies: 'policies',
  // Partners
  partners: 'partners',
};
// ─── HELPERS ─────────────────────────────────────────────────────

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
// ★ v4.6: TEMPORAL INTEGRITY ENFORCER
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
            console.warn(`[TemporalIntegrity] FIX: ${task.id} startDate ${task.startDate} → ${startISO} (before project start)`);
            task.startDate = startISO;
            fixCount++;
          }
        }
        if (task.endDate) {
          const taskEnd = new Date(task.endDate);
          if (taskEnd > projectEnd) {
            console.warn(`[TemporalIntegrity] FIX: ${task.id} endDate ${task.endDate} → ${endISO} (after project end)`);
            task.endDate = endISO;
            fixCount++;
          }
        }
        if (task.startDate && task.endDate && task.startDate > task.endDate) {
          console.warn(`[TemporalIntegrity] FIX: ${task.id} startDate > endDate after clamping → setting startDate = endDate`);
          task.startDate = task.endDate;
          fixCount++;
        }
      });
    }

    if (wp.milestones && Array.isArray(wp.milestones)) {
      wp.milestones.forEach((ms: any) => {
        if (ms.date) {
          const msDate = new Date(ms.date);
          if (msDate < projectStart) {
            console.warn(`[TemporalIntegrity] FIX: milestone ${ms.id} date ${ms.date} → ${startISO}`);
            ms.date = startISO;
            fixCount++;
          }
          if (msDate > projectEnd) {
            console.warn(`[TemporalIntegrity] FIX: milestone ${ms.id} date ${ms.date} → ${endISO}`);
            ms.date = endISO;
            fixCount++;
          }
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
          console.warn(`[TemporalIntegrity] FIX: ${wp.id} first task startDate → ${startISO}`);
          sorted[0].startDate = startISO;
          fixCount++;
        }
        const lastTask = sorted[sorted.length - 1];
        if (lastTask.endDate !== endISO) {
          console.warn(`[TemporalIntegrity] FIX: ${wp.id} last task endDate → ${endISO}`);
          lastTask.endDate = endISO;
          fixCount++;
        }
      }
    });
  }

  if (fixCount > 0) {
    console.log(`[TemporalIntegrity] Applied ${fixCount} date corrections.`);
  } else {
    console.log(`[TemporalIntegrity] All dates within envelope. No corrections needed.`);
  }

  return activities;
};

// ─── SMART MERGE ─────────────────────────────────────────────────

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

// ─── TASK INSTRUCTION BUILDER ────────────────────────────────────
// ★ v7.0: Refactored to use getTaskInstruction() from Instructions.ts v7.0
//          with placeholder replacement done here

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

  // ★ v7.0: Get raw task instruction from Instructions.ts
  let taskInstr = getTaskInstruction(effectiveKey, language);

  // Replace placeholders based on section
  switch (effectiveKey) {
    case 'problemAnalysis': {
      const cp = projectData.problemAnalysis?.coreProblem;
      const titleStr = cp?.title?.trim() || '';
      const descStr = cp?.description?.trim() || '';
      const contextParts: string[] = [];
      if (titleStr) contextParts.push(`Title: "${titleStr}"`);
      if (descStr) contextParts.push(`Description: "${descStr}"`);
      const userInput = contextParts.length > 0
        ? contextParts.join('\n')
        : '(no user input yet)';
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
      // Partners instruction doesn't use standard placeholders — context is injected via getContext()
      // But we add supplementary context about WPs if available
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
// ★ v7.0: Now includes Intervention Logic Framework, Consortium Rules,
//          Resource Coherence Rules, and uses v7.0 getter functions

const getPromptAndSchemaForSection = (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate',
  currentSectionData: any = null
) => {
  const context = getContext(projectData);
  const schemaKey = SECTION_TO_SCHEMA[sectionKey];
  const schema = schemas[schemaKey];

  if (!schema) throw new Error(`Unknown section key: ${sectionKey}`);

  const config = getProviderConfig();
  const needsTextSchema = config.provider !== 'gemini';
  const textSchema = needsTextSchema ? schemaToTextInstruction(schema) : '';

  // ★ v7.0: Get all rule components from Instructions.ts v7.0
  const interventionLogic = getInterventionLogicFramework();
  const langDirective = getLanguageDirective(language);
  const langMismatchNotice = detectInputLanguageMismatch(projectData, language);
  const globalRules = getGlobalRules();
  const sectionRules = getRulesForSection(sectionKey, language);
  const academicRules = getAcademicRigorRules(language);
  const humanRules = getHumanizationRules(language);
  const titleRules = (sectionKey === 'projectIdea' || sectionKey === 'projectTitleAcronym')
    ? getProjectTitleRules(language) : '';

  // ★ v7.0: Consortium and Resource rules for relevant sections
  const consortiumRules = (sectionKey === 'partners' || sectionKey === 'activities')
    ? getConsortiumAllocationRules() : '';
  const resourceRules = (sectionKey === 'partners' || sectionKey === 'activities')
    ? getResourceCoherenceRules() : '';

  // Mode instruction with existing data context
  let modeInstruction = getModeInstruction(mode, language);
  if ((mode === 'fill' || mode === 'enhance') && currentSectionData) {
    modeInstruction = `${modeInstruction}\nExisting data: ${JSON.stringify(currentSectionData)}`;
  }

  // Task instruction with placeholders replaced
  const taskInstruction = buildTaskInstruction(sectionKey, projectData, language);

  // Quality gates
  const qualityGates = getQualityGates(sectionKey, language);
  const qualityGateBlock = qualityGates.length > 0
    ? `\nQUALITY GATE — verify ALL before returning JSON:\n${formatRulesAsList(qualityGates)}`
    : '';

  // ★ v4.6: For activities, inject TEMPORAL_INTEGRITY_RULE at BEGINNING and END
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

  // ★ v5.4: Sub-section focus instruction
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

  // ★ v7.0: Assemble prompt with Intervention Logic Framework at the top
  const prompt = [
    // Intervention Logic Framework — foundational context for EVERY prompt
    interventionLogic,
    // Sub-section focus (if applicable)
    focusInstruction ? `\n★★★ ${focusInstruction} ★★★\n` : '',
    // Temporal integrity (beginning — for activities)
    temporalRuleBlock ? `\n${temporalRuleBlock}\n` : '',
    // Language directive
    langDirective,
    // Language mismatch notice
    langMismatchNotice ? `\n${langMismatchNotice}\n` : '',
    // Global rules
    `\nGLOBAL RULES:\n${globalRules}`,
    // Chapter/section rules
    sectionRules ? `\nDETAILED CHAPTER RULES:\n${sectionRules}` : '',
    // Academic rigor
    academicRules ? `\n${academicRules}` : '',
    // Humanization
    humanRules ? `\n${humanRules}` : '',
    // Title rules (for projectIdea)
    titleRules ? `\n${titleRules}` : '',
    // Consortium rules (for partners + activities)
    consortiumRules ? `\n${consortiumRules}` : '',
    // Resource coherence rules (for partners + activities)
    resourceRules ? `\n${resourceRules}` : '',
    // Project context
    `\n${context}`,
    // Task instruction
    taskInstruction ? `\n${taskInstruction}` : '',
    // Mode instruction
    modeInstruction ? `\n${modeInstruction}` : '',
    // Text schema (for OpenRouter)
    textSchema,
    // Quality gate
    qualityGateBlock,
    // Temporal integrity (end — for activities, repeated for emphasis)
    temporalRuleBlock ? `\n${temporalRuleBlock}` : '',
    // Sub-section focus reminder
    focusInstruction ? `\n★★★ REMINDER: ${focusInstruction} ★★★` : ''
  ].filter(Boolean).join('\n');

  return { prompt, schema: needsTextSchema ? null : schema };
};
// ═══════════════════════════════════════════════════════════════
// PUBLIC API: SECTION GENERATION
// ★ v7.0: Partners post-processing includes partnerType validation
// ═══════════════════════════════════════════════════════════════

export const generateSectionContent = async (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate',
  currentSectionData: any = null
): Promise<any> => {
  const { prompt, schema } = getPromptAndSchemaForSection(sectionKey, projectData, language, mode, currentSectionData);

  // ★ v5.5: Inject Knowledge Base context
  const kbContext = await getKnowledgeBaseContext();
  const fullPrompt = kbContext ? `${kbContext}\n\n${prompt}` : prompt;

  const result = await generateContent({
    prompt: fullPrompt,
    schema: schema || undefined,
    jsonMode: true,
    sectionKey
  });

  let parsed: any;
  try {
    const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[geminiService] Failed to parse AI response as JSON:', e);
    throw new Error('AI response was not valid JSON');
  }

  // Strip markdown from all string values
  parsed = stripMarkdown(parsed);

  // ★ v5.4: Post-process sub-sections — unwrap string values
  if (['mainAim', 'stateOfTheArt', 'proposedSolution'].includes(sectionKey)) {
    if (parsed && typeof parsed === 'object' && parsed[sectionKey]) {
      return parsed[sectionKey];
    }
  }

  // ★ v5.0: Sanitize project title
  if (sectionKey === 'projectIdea' && parsed?.projectTitle) {
    parsed.projectTitle = sanitizeProjectTitle(parsed.projectTitle);
  }
  if (sectionKey === 'projectTitleAcronym' && parsed?.projectTitle) {
    parsed.projectTitle = sanitizeProjectTitle(parsed.projectTitle);
  }

  // ★ v4.6: For activities, enforce temporal integrity
  if (sectionKey === 'activities' && Array.isArray(parsed)) {
    parsed = sanitizeActivities(parsed);
    parsed = enforceTemporalIntegrity(parsed, projectData);
  }

  // ★ v7.0: For partners, ensure IDs, codes, and partnerType with validation
  if (sectionKey === 'partners' && Array.isArray(parsed)) {
    parsed = parsed.map((p: any, idx: number) => ({
      ...p,
      id: p.id || `partner-${idx + 1}`,
      code: p.code || (idx === 0 ? 'CO' : `P${idx + 1}`),
      partnerType: (p.partnerType && isValidPartnerType(p.partnerType))
        ? p.partnerType
        : 'other',
    }));
    console.log(`[geminiService] Partners post-processed: ${parsed.length} partners, types: ${parsed.map((p: any) => p.partnerType).join(', ')}`);
  }

  // ★ Fill mode: merge with existing data
  if (mode === 'fill' && currentSectionData) {
    return smartMerge(currentSectionData, parsed);
  }

  return parsed;
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: PER-WP ACTIVITIES GENERATION
// ★ v7.0: Uses v7.0 getter functions, includes Intervention Logic
// ═══════════════════════════════════════════════════════════════

export const generateActivitiesPerWP = async (
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate',
  existingActivities: any[] = [],
  onProgress?: (msg: string) => void
): Promise<any[]> => {
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

  // ★ v5.5: Knowledge Base context
  const kbContext = await getKnowledgeBaseContext();

  // PHASE 1: Generate scaffold (WP IDs, titles, date ranges)
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

  if (onProgress) onProgress(language === 'si' ? 'Generiranje ogrodja delovnih paketov...' : 'Generating work package scaffold...');

  const scaffoldResult = await generateContent({
    prompt: scaffoldPrompt,
    jsonMode: true,
    sectionKey: 'activities'
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
    const wpScaffold = scaffold[wpIdx];
    const wpPfx = language === 'si' ? 'DS' : 'WP';
    const wpId = wpScaffold.id || `${wpPfx}${wpIdx + 1}`;

    if (onProgress) {
      onProgress(language === 'si'
        ? `Generiranje ${wpId}: ${wpScaffold.title || ''}...`
        : `Generating ${wpId}: ${wpScaffold.title || ''}...`);
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
      sectionKey: 'activities'
    });

    try {
      const jsonStr = wpResult.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      let wpData = JSON.parse(jsonStr);

      if (Array.isArray(wpData)) {
        wpData = wpData[0] || wpData;
      }

      wpData = stripMarkdown(wpData);
      fullActivities.push(wpData);
    } catch (e) {
      console.error(`[geminiService] Failed to parse WP ${wpId}:`, e);
      fullActivities.push({
        id: wpId,
        title: wpScaffold.title || '',
        tasks: [],
        milestones: [],
        deliverables: []
      });
    }
  }

    let result = sanitizeActivities(fullActivities);
  result = enforceTemporalIntegrity(result, projectData);

  // ★ v7.4: Force correct WP/Task/Milestone/Deliverable prefixes based on language
  const wpPfxFinal = language === 'si' ? 'DS' : 'WP';
  const tskPfxFinal = language === 'si' ? 'N' : 'T';
  result.forEach((wp: any, wpIdx: number) => {
    wp.id = `${wpPfxFinal}${wpIdx + 1}`;
    if (wp.tasks && Array.isArray(wp.tasks)) {
      wp.tasks.forEach((task: any, tIdx: number) => {
        const oldId = task.id;
        task.id = `${tskPfxFinal}${wpIdx + 1}.${tIdx + 1}`;
        // Fix dependencies referencing old IDs
        result.forEach((otherWp: any) => {
          (otherWp.tasks || []).forEach((otherTask: any) => {
            (otherTask.dependencies || []).forEach((dep: any) => {
              if (dep.predecessorId === oldId) {
                dep.predecessorId = task.id;
              }
            });
          });
        });
      });
    }
    if (wp.milestones && Array.isArray(wp.milestones)) {
      wp.milestones.forEach((ms: any, mIdx: number) => {
        ms.id = `M${wpIdx + 1}.${mIdx + 1}`;
      });
    }
    if (wp.deliverables && Array.isArray(wp.deliverables)) {
      wp.deliverables.forEach((del: any, dIdx: number) => {
        del.id = `D${wpIdx + 1}.${dIdx + 1}`;
      });
    }
  });

  return result;
};


// ═══════════════════════════════════════════════════════════════
// PUBLIC API: TARGETED FILL
// ═══════════════════════════════════════════════════════════════

export const generateTargetedFill = async (
  sectionKey: string,
  projectData: any,
  currentData: any,
  language: 'en' | 'si' = 'en'
): Promise<any> => {
  const result = await generateSectionContent(sectionKey, projectData, language, 'fill', currentData);

  if (sectionKey === 'activities' && Array.isArray(result)) {
    let processed = sanitizeActivities(result);
    processed = enforceTemporalIntegrity(processed, projectData);
    return processed;
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: OBJECT FILL
// ═══════════════════════════════════════════════════════════════

export const generateObjectFill = async (
  sectionKey: string,
  projectData: any,
  currentData: any,
  emptyFields: string[],
  language: 'en' | 'si' = 'en'
): Promise<any> => {
  const { prompt, schema } = getPromptAndSchemaForSection(sectionKey, projectData, language, 'fill', currentData);

  const fillInstruction = `\nEMPTY FIELDS TO FILL: ${emptyFields.join(', ')}\nFill ONLY the listed empty fields. Keep existing data UNCHANGED.`;

  const fullPrompt = prompt + fillInstruction;

  const kbContext = await getKnowledgeBaseContext();
  const finalPrompt = kbContext ? `${kbContext}\n\n${fullPrompt}` : fullPrompt;

  const result = await generateContent({
    prompt: finalPrompt,
    schema: schema || undefined,
    jsonMode: true,
    sectionKey
  });

  let parsed: any;
  try {
    const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[geminiService] Failed to parse fill response:', e);
    throw new Error('AI fill response was not valid JSON');
  }

  parsed = stripMarkdown(parsed);

  return smartMerge(currentData, parsed);
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: PROJECT SUMMARY GENERATION
// ★ v7.0: Uses getSummaryRules() from Instructions.ts v7.0
// ═══════════════════════════════════════════════════════════════

export const generateProjectSummary = async (
  projectData: any,
  language: 'en' | 'si' = 'en'
): Promise<string> => {
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

  const kbContext = await getKnowledgeBaseContext();
  const finalPrompt = kbContext ? `${kbContext}\n\n${prompt}` : prompt;

  const result = await generateContent({
    prompt: finalPrompt,
    sectionKey: 'summary'
  });

  return result.text.trim();
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API: FIELD-LEVEL GENERATION
// ★ v7.0: Uses getFieldRules() from Instructions.ts v7.0
// ═══════════════════════════════════════════════════════════════

export const generateFieldContent = async (
  fieldPath: string,
  projectData: any,
  language: 'en' | 'si' = 'en'
): Promise<string> => {
  const fieldRule = getFieldRules(fieldPath, language);
  const context = getContext(projectData);
  const langDirective = getLanguageDirective(language);

  const prompt = [
    langDirective,
    `\n${context}`,
    `\nFIELD RULE: ${fieldRule}`,
    `\nTASK: Generate content for the field "${fieldPath}" based on the project context and field rule.`
  ].filter(Boolean).join('\n');

  const result = await generateContent({
    prompt,
    sectionKey: 'field'
  });

  return stripMarkdown(result.text.trim());
};
// ═══════════════════════════════════════════════════════════════
// PUBLIC API: PARTNER ALLOCATIONS GENERATION (v7.1)
// ═══════════════════════════════════════════════════════════════

export const generatePartnerAllocations = async (
  projectData: any,
  language: 'en' | 'si' = 'en',
  onProgress?: (msg: string) => void
): Promise<any[]> => {
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
        wpId: wp.id || '',
        wpTitle: wp.title || '',
        taskId: task.id || '',
        taskTitle: task.title || '',
        taskDesc: (task.description || '').substring(0, 200),
        startDate: task.startDate || '',
        endDate: task.endDate || '',
      });
    });
  });

  const partnerSummary = partners.map((p: any) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    expertise: (p.expertise || '').substring(0, 200),
    partnerType: p.partnerType || 'other',
    pmRate: p.pmRate || 0,
  }));

  const langDirective = getLanguageDirective(language);
  const consortiumRules = getConsortiumAllocationRules();
  const resourceRules = getResourceCoherenceRules();
  const kbContext = await getKnowledgeBaseContext();

  const allocPrompt = [
    kbContext || '',
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
4. Match partner EXPERTISE to task TOPIC:
   - Research/analytical tasks → academic/research partners
   - Implementation/pilot tasks → SMEs, public agencies, NGOs
   - Dissemination tasks → all partners (lighter allocation for technical partners)
   - Project Management tasks → coordinator (heavy), all others (light)
5. Hours and PM must be REALISTIC:
   - 1 PM = 143 hours (EU standard)
   - A partner on a 6-month task typically contributes 0.2–2.0 PM
   - WP leaders get more PM than participants
   - The coordinator typically has the highest total PM
6. Direct costs: AT MINIMUM "labourCosts" for every allocation.
   Labour cost = hours × (pmRate / 143).
   Additional costs where logical:
   - Travel costs: 500–3000 EUR per partner per task (meetings, workshops, pilots)
   - Materials: 200–2000 EUR (development/pilot tasks)
   - Sub-contractors: 2000–15000 EUR (only where external expertise needed)
7. totalDirectCost = sum of all directCosts amounts
8. totalCost = totalDirectCost (indirect costs calculated separately)

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
          { "id": "dc-1", "categoryKey": "labourCosts", "name": "Staff / Personnel costs", "amount": 11400 },
          { "id": "dc-2", "categoryKey": "travelCosts", "name": "Travel costs", "amount": 1500 }
        ],
        "totalDirectCost": 12900,
        "totalCost": 12900
      }
    ]
  }
]

CRITICAL:
- partnerId MUST exactly match partner IDs above
- categoryKey: "labourCosts", "travelCosts", "materials", "subContractorCosts"
- labourCosts amount = hours × (pmRate / 143), rounded
- Every allocation MUST have labourCosts
- pm = hours / 143, rounded to 2 decimals
- Return EVERY task — do not skip any
- Do NOT invent task IDs
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

  const result = await generateContent({
    prompt: finalPrompt,
    schema: needsTextSchema ? undefined : allocSchema,
    jsonMode: true,
    sectionKey: 'partnerAllocations',
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
    console.error('[generatePartnerAllocations] Failed to parse response:', e);
    throw new Error('INVALID_JSON|' + (config.provider || 'unknown'));
  }

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

        const hasLabour = directCosts.some((dc: any) => dc.categoryKey === 'labourCosts');
        if (!hasLabour && hours > 0) {
          directCosts.unshift({
            id: `dc-labour-${Date.now()}`,
            categoryKey: 'labourCosts',
            name: language === 'si' ? 'Stroški dela' : 'Staff / Personnel costs',
            amount: labourCost,
          });
        }

        const totalDirectCost = directCosts.reduce((s: number, dc: any) => s + (dc.amount || 0), 0);

        return {
          partnerId: a.partnerId,
          hours,
          pm,
          directCosts,
          totalDirectCost,
          totalCost: totalDirectCost,
        };
      });

    return {
      wpId: taskAlloc.wpId,
      taskId: taskAlloc.taskId,
      allocations,
    };
  });

  console.log(`[generatePartnerAllocations] Generated allocations for ${processedAllocations.length} tasks, ${processedAllocations.reduce((s: number, t: any) => s + (t.allocations?.length || 0), 0)} total partner-task pairs`);

  return processedAllocations;
};
// ═══════════════════════════════════════════════════════════════
// END OF geminiService.ts v7.0
// ═══════════════════════════════════════════════════════════════
