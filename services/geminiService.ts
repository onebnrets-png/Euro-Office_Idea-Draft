// services/geminiService.ts
// ═══════════════════════════════════════════════════════════════
// AI content generation service.
//
// THIS FILE CONTAINS NO CONTENT RULES.
// All content rules, field rules, translation rules, and summary
// rules are read from services/Instructions.ts — the single
// source of truth.
//
// This file is responsible only for:
//  - Building project context strings
//  - Assembling prompts by combining Instructions rules + context
//  - Calling the AI provider
//  - Post-processing responses (JSON parsing, sanitization, merging)
//
// v3.4 — 2026-02-14 — FIXES:
//   1. getContext() includes sections when EITHER title OR description exists
//   2. generateFieldContent() injects sibling field values into prompt
//   3. Strong bilingual language directive in every prompt
//   4. New 'enhance' mode for professional deepening of existing content
//   5. Quality Enforcement block at the end of every section prompt
//   6. Strengthened section-specific task instructions with explicit
//      citation/depth requirements
//   7. INPUT LANGUAGE DETECTION — detects mismatch between UI language
//      and actual text language, warns in prompt so AI stays on topic
//   8. ACADEMIC RIGOR RULES — mandatory anti-hallucination and citation
//      enforcement block injected into every prompt
// ═══════════════════════════════════════════════════════════════

import { storageService } from './storageService.ts';
import {
  getAppInstructions,
  getFieldRule,
  getTranslationRules,
  getSummaryRules
} from './Instructions.ts';
import { detectProjectLanguage as detectLanguage } from '../utils.ts';
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

// ─── STRONG LANGUAGE DIRECTIVE (used in every prompt) ────────────

const getLanguageDirective = (language: 'en' | 'si'): string => {
  if (language === 'si') {
    return `═══ LANGUAGE DIRECTIVE (MANDATORY — OVERRIDES ALL OTHER INSTRUCTIONS) ═══
You MUST write ALL output content — every title, every description,
every indicator, every single text value — EXCLUSIVELY in Slovenian
(slovenščina). Do NOT use English for ANY field value, even if the
context below is partially or fully in English. Translate concepts
into Slovenian; do not copy English phrases.
═══════════════════════════════════════════════════════════════════`;
  }
  return `═══ LANGUAGE DIRECTIVE (MANDATORY — OVERRIDES ALL OTHER INSTRUCTIONS) ═══
You MUST write ALL output content — every title, every description,
every indicator, every single text value — EXCLUSIVELY in British
English. Do NOT use any other language, even if the context below
is partially or fully in Slovenian.
═══════════════════════════════════════════════════════════════════`;
};

// ─── INPUT LANGUAGE DETECTION (v3.4 — NEW) ───────────────────────
// Detects when user input is in a different language than the UI mode.
// Returns a prompt fragment that tells the AI to respect the content
// semantics regardless of language mismatch.

const detectInputLanguageMismatch = (
  projectData: any,
  uiLanguage: 'en' | 'si'
): string => {
  // Gather all non-empty string values from the project
  const collectStrings = (obj: any, depth: number = 0): string[] => {
    if (depth > 5 || !obj) return [];
    const strings: string[] = [];
    if (typeof obj === 'string' && obj.trim().length > 10) {
      strings.push(obj.trim());
    } else if (Array.isArray(obj)) {
      obj.forEach((item) => strings.push(...collectStrings(item, depth + 1)));
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach((val) => strings.push(...collectStrings(val, depth + 1)));
    }
    return strings;
  };

  const allTexts = collectStrings(projectData);
  if (allTexts.length === 0) return '';

  // Sample up to 5 texts for detection
  const sample = allTexts.slice(0, 5).join(' ');

  // Simple heuristic: Slovenian-specific characters and common words
  const slovenianMarkers = /[čšžČŠŽ]|(\b(je|za|na|ki|ali|ter|pri|kot|ter|ima|biti|sem|ker|tudi|vse|med|lahko|zelo|brez|kako|kateri|vendar|zato|skupaj|potrebno|obstoječi|dejavnosti|razvoj|sodelovanje|vzpostaviti|okrepiti|zagotoviti|vzroke|posledice)\b)/gi;
  const englishMarkers = /\b(the|is|are|was|were|been|being|have|has|had|will|would|shall|should|can|could|may|might|must|and|but|or|which|that|this|these|those|with|from|into|upon|about|between|through|during|before|after|above|below|against)\b/gi;

  const slMatches = (sample.match(slovenianMarkers) || []).length;
  const enMatches = (sample.match(englishMarkers) || []).length;

  // Determine dominant language of input
  let detectedLang: 'si' | 'en' | 'unknown' = 'unknown';
  if (slMatches > enMatches * 1.5) {
    detectedLang = 'si';
  } else if (enMatches > slMatches * 1.5) {
    detectedLang = 'en';
  }

  if (detectedLang === 'unknown' || detectedLang === uiLanguage) {
    return ''; // No mismatch or can't determine
  }

  // Mismatch detected!
  const detectedName = detectedLang === 'si' ? 'Slovenian' : 'English';
  const targetName = uiLanguage === 'si' ? 'Slovenian' : 'English';

  return `═══ INPUT LANGUAGE NOTICE ═══
The user's existing content appears to be written in ${detectedName},
but the current application language is set to ${targetName}.
INSTRUCTIONS:
1. UNDERSTAND and PRESERVE the semantic meaning of the user's input regardless of its language.
2. Generate ALL new content in ${targetName} as required by the Language Directive.
3. If enhancing existing content, translate it into ${targetName} while improving it.
4. Do NOT discard or ignore the user's input just because it is in a different language.
5. The user's input defines the TOPIC — always stay on that topic.
═══════════════════════════════════════════════════════════════════`;
};

// ─── ACADEMIC RIGOR RULES (v3.4 — NEW) ──────────────────────────
// Injected into every section prompt to enforce citation quality,
// prevent hallucination, and ensure professional depth regardless
// of which LLM is used.

const getAcademicRigorRules = (language: 'en' | 'si'): string => {
  if (language === 'si') {
    return `═══ OBVEZNA PRAVILA AKADEMSKE STROGOSTI IN CITIRANJA ═══
Ta pravila veljajo za VSO generirano vsebino BREZ IZJEME.

1. VSEBINA TEMELJI IZKLJUČNO NA DOKAZIH
   - Vsaka trditev, statistika ali trend MORA biti podprta s preverljivim virom.
   - NE generiraj verjetno zvenečih, a nepreverivih izjav.
   - Če ne moreš citirati RESNIČNEGA vira za trditev, te trditve NE vključi.
   - Prednostni viri: Eurostat, OECD, Svetovna banka, poročila Evropske komisije,
     agencije OZN, recenzirane revije, nacionalni statistični uradi, ACER, IEA,
     JRC, EEA, CEDEFOP, Eurofound, WHO.

2. FORMAT CITIRANJA
   - Uporabi inline citate: (Avtor/Organizacija, Leto) ali (Naslov poročila, Leto).
   - Primeri:
     • "Digitalizacija energetskih sistemov zaostaja za potrebami
        (Evropska komisija, Akcijski načrt za digitalno energijo, 2022)."
     • "Delež OVE v EU je dosegel 22,1 % (Eurostat, SHARES 2023)."
     • "Investicije v pametna omrežja v EU so znašale 4,7 mrd EUR
        (ACER, Poročilo o spremljanju trga, 2023)."
   - MINIMUM 2–3 citati na večji odstavek ali skupino trditev.

3. ZAHTEVE ZA KVANTITATIVNE PODATKE
   - Vključi specifične številke, odstotke, denarne vrednosti, kjer je relevantno.
   - VEDNO navedi leto/obdobje, na katerega se podatki nanašajo.
   - Primerjaj s povprečji EU ali referenčnimi vrednostmi, kjer je mogoče.
   - Uporabi razpone, če natančni podatki niso znani: "med 15–20 %" ne "okrog 15 %".

4. STROKOVNA EU TERMINOLOGIJA
   - Uporabi uradno EU terminologijo pravilno in dosledno.
   - Sklicuj se na relevantne EU strategije: Zeleni dogovor, REPowerEU,
     Digitalno desetletje, Industrijska strategija EU, Kohezijska politika itd.
   - Uporabi izraze iz EU metodologije logičnega okvira natančno.

5. ANALITIČNA GLOBINA
   - Opisi problemov morajo identificirati TEMELJNE VZROKE, ne le simptomov.
   - Uporabi sistemsko razmišljanje: prikaži medsebojne povezave med vzroki in posledicami.
   - Razlikuj med korelacijo in vzročnostjo.

6. POLITIKA NIČELNE HALUCINACIJE
   - NIKOLI ne izmišljuj imen organizacij, projektov ali študij.
   - NIKOLI ne izmišljuj statistik ali odstotkov.
   - Če je potreben specifičen podatek, ki ga ne poznaš, napiši:
     "[Vstavite preverjen podatek: <opis potrebnega>]"
     namesto da izmisliš številko.
   - VEDNO je bolje pustiti označbo za preverjanje kot halucinirati.

7. STANDARD DVOJNE PREVERJAVE
   - Pred vključitvijo katerekoli dejstvene trditve preveri:
     a) Ali ta organizacija/poročilo dejansko obstaja?
     b) Ali je ta statistika verjetna in iz verodostojnega vira?
     c) Ali je leto/datum točen?
   - Če obstaja KAKRŠENKOLI dvom, uporabi format označbe iz pravila 6.
═══════════════════════════════════════════════════════════════════`;
  }

  return `═══ MANDATORY ACADEMIC RIGOR & CITATION RULES ═══
These rules apply to ALL generated content WITHOUT EXCEPTION.

1. EVIDENCE-BASED CONTENT ONLY
   - Every claim, statistic, or trend MUST be supported by a verifiable source.
   - Do NOT generate plausible-sounding but unverifiable statements.
   - If you cannot cite a REAL source for a claim, do NOT include that claim.
   - Preferred sources: Eurostat, OECD, World Bank, European Commission reports,
     UN agencies, peer-reviewed journals, national statistical offices, ACER, IEA,
     JRC, EEA, CEDEFOP, Eurofound, WHO.

2. CITATION FORMAT
   - Use inline citations: (Author/Organization, Year) or (Report Title, Year).
   - Examples:
     • "Digitisation of energy systems lags behind demand
        (European Commission, Digital Energy Action Plan, 2022)."
     • "The share of RES in the EU reached 22.1 % (Eurostat, SHARES 2023)."
     • "Smart grid investments in the EU totalled EUR 4.7 billion
        (ACER, Market Monitoring Report, 2023)."
   - MINIMUM 2–3 citations per major paragraph or claim cluster.

3. QUANTITATIVE DATA REQUIREMENTS
   - Include specific numbers, percentages, monetary values where relevant.
   - ALWAYS state the year/period the data refers to.
   - Compare with EU averages or benchmarks where applicable.
   - Use ranges if exact figures are uncertain: "between 15–20 %" not "about 15 %".

4. PROFESSIONAL EU TERMINOLOGY
   - Use official EU programme terminology correctly and consistently.
   - Reference relevant EU strategies: Green Deal, REPowerEU, Digital Decade,
     EU Industrial Strategy, Cohesion Policy, etc.
   - Use terms from the EU logical framework methodology accurately.

5. ANALYTICAL DEPTH
   - Problem descriptions must identify ROOT CAUSES, not just symptoms.
   - Use systems thinking: show interconnections between causes and effects.
   - Distinguish between correlation and causation.

6. ZERO-HALLUCINATION POLICY
   - NEVER invent organisation names, project names, or study titles.
   - NEVER fabricate statistics or percentages.
   - If a specific data point is needed but unknown, write:
     "[Insert verified data: <description of what is needed>]"
     rather than inventing a number.
   - It is ALWAYS better to leave a placeholder than to hallucinate.

7. DOUBLE-VERIFICATION STANDARD
   - Before including any factual claim, verify:
     a) Does this organisation/report actually exist?
     b) Is this statistic plausible and from a credible source?
     c) Is the year/date accurate?
   - If ANY doubt exists, use the placeholder format from rule 6.
═══════════════════════════════════════════════════════════════════`;
};

// ─── QUALITY ENFORCEMENT (appended to every section prompt) ──────

const getQualityEnforcement = (sectionKey: string, language: 'en' | 'si'): string => {
  const checks: Record<string, { en: string[]; si: string[] }> = {
    problemAnalysis: {
      en: [
        'Every cause description contains ≥1 specific citation in format (Source Name, Year) — e.g. (Eurostat, 2023)',
        'Every consequence description contains ≥1 specific citation in format (Source Name, Year)',
        'The core problem statement includes at least one quantitative indicator (percentage, number, trend)',
        'Every description paragraph has ≥3 substantive, analytical sentences — no filler',
        'No vague phrases such as "various stakeholders", "different aspects", "multiple factors" — be specific',
        'At least 4 distinct, non-overlapping causes are listed',
        'At least 4 distinct consequences are listed, with at least one referencing an EU-level policy concern',
        'Causes are logically ordered: root causes first, then proximate causes',
        'All cited sources are real, verifiable EU/international publications — do NOT fabricate statistics',
        'If you are unsure about a specific number, use "[Insert verified data: ...]" placeholder instead of inventing',
      ],
      si: [
        'Vsak opis vzroka vsebuje ≥1 specifičen citat v formatu (Ime vira, Leto) — npr. (Eurostat, 2023)',
        'Vsak opis posledice vsebuje ≥1 specifičen citat v formatu (Ime vira, Leto)',
        'Izjava o osrednjem problemu vključuje vsaj en kvantitativni kazalnik (odstotek, število, trend)',
        'Vsak opisni odstavek ima ≥3 vsebinske, analitične stavke — brez polnil',
        'Brez nejasnih fraz kot "različni deležniki", "različni vidiki", "številni dejavniki" — bodi specifičen',
        'Navedenih je vsaj 5 ločenih, neprekrivajočih se vzrokov',
        'Navedene so vsaj 4 ločene posledice, vsaj ena se sklicuje na skrb na ravni EU politike',
        'Vzroki so logično urejeni: najprej temeljni vzroki, nato neposredni',
        'Vsi navedeni viri so resnični, preverljivi EU/mednarodni dokumenti — NE izmišljuj statistik',
        'Če nisi prepričan o specifični številki, uporabi označbo "[Vstavite preverjen podatek: ...]" namesto izmišljevanja',
      ]
    },
    projectIdea: {
      en: [
        'State of the Art references ≥3 specific existing projects, products, or studies with names and years',
        'Proposed Solution is structured in clear phases with specific methodological descriptions',
        'Main Aim is one comprehensive sentence starting with "The main aim..."',
        'At least 3 relevant EU policies are listed with specific descriptions of alignment',
        'All readiness levels include a specific justification (not just the number)',
        'All cited projects and policies are real and verifiable — no fabricated names',
      ],
      si: [
        'Stanje tehnike navaja ≥3 specifične obstoječe projekte, produkte ali študije z imeni in letnicami',
        'Predlagana rešitev je strukturirana v jasne faze s specifičnimi metodološkimi opisi',
        'Glavni cilj je en celovit stavek, ki se začne z "Glavni cilj..."',
        'Navedene so vsaj 3 relevantne EU politike s specifičnimi opisi usklajenosti',
        'Vse stopnje pripravljenosti vključujejo specifično utemeljitev (ne samo številke)',
        'Vsi navedeni projekti in politike so resnični in preverljivi — brez izmišljenih imen',
      ]
    },
    _default: {
      en: [
        'Every description has ≥3 substantive sentences',
        'All titles begin with an infinitive verb',
        'No vague filler phrases — be specific and analytical',
        'Content is directly linked to the project context and problem analysis',
        'Any cited source must be real and verifiable',
      ],
      si: [
        'Vsak opis ima ≥3 vsebinske stavke',
        'Vsi naslovi se začnejo z glagolom v nedoločniku',
        'Brez nejasnih fraz — bodi specifičen in analitičen',
        'Vsebina je neposredno povezana s kontekstom projekta in analizo problemov',
        'Vsak naveden vir mora biti resničen in preverljiv',
      ]
    }
  };

  const lang = language;
  const sectionChecks = checks[sectionKey]?.[lang] || checks._default[lang];

  const header = language === 'si'
    ? '═══ KONTROLA KAKOVOSTI — PREVERI PRED ODDAJO ODGOVORA ═══'
    : '═══ QUALITY GATE — VERIFY BEFORE RETURNING YOUR RESPONSE ═══';
  const footer = language === 'si'
    ? 'Če katerakoli točka NI izpolnjena, POPRAVI odgovor preden ga vrneš.'
    : 'If ANY check FAILS, REVISE your response before returning it.';

  return `\n${header}\n${sectionChecks.map((c, i) => `☐ ${i + 1}. ${c}`).join('\n')}\n${footer}\n═══════════════════════════════════════════════════════════════════`;
};

// ─── PROJECT CONTEXT BUILDER (v3.3 — fixed) ─────────────────────

const getContext = (projectData: any): string => {
  const sections: string[] = [];

  const pa = projectData.problemAnalysis;
  if (pa?.coreProblem?.title || pa?.coreProblem?.description ||
      pa?.causes?.length > 0 || pa?.consequences?.length > 0) {
    sections.push(`Problem Analysis:\n${JSON.stringify(pa, null, 2)}`);
  }

  const pi = projectData.projectIdea;
  if (pi?.mainAim || pi?.stateOfTheArt || pi?.proposedSolution || pi?.projectTitle) {
    sections.push(`Project Idea:\n${JSON.stringify(pi, null, 2)}`);
  }

  if (projectData.generalObjectives?.length > 0) {
    sections.push(`General Objectives:\n${JSON.stringify(projectData.generalObjectives, null, 2)}`);
  }
  if (projectData.specificObjectives?.length > 0) {
    sections.push(`Specific Objectives:\n${JSON.stringify(projectData.specificObjectives, null, 2)}`);
  }
  if (projectData.activities?.length > 0) {
    sections.push(`Activities (Work Packages):\n${JSON.stringify(projectData.activities, null, 2)}`);
  }
  if (projectData.outputs?.length > 0) {
    sections.push(`Outputs:\n${JSON.stringify(projectData.outputs, null, 2)}`);
  }
  if (projectData.outcomes?.length > 0) {
    sections.push(`Outcomes:\n${JSON.stringify(projectData.outcomes, null, 2)}`);
  }
  if (projectData.impacts?.length > 0) {
    sections.push(`Impacts:\n${JSON.stringify(projectData.impacts, null, 2)}`);
  }

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
      if (sType === 'array') {
        return { type: 'array', items: simplify(s.items) };
      }
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
    required: ['mainAim', 'stateOfTheArt', 'proposedSolution', 'policies', 'readinessLevels']
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
              description: { type: Type.STRING }
            },
            required: ['id', 'description']
          }
        },
        deliverables: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              indicator: { type: Type.STRING }
            },
            required: ['id', 'description', 'indicator']
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
        category: { type: Type.STRING, enum: ['Technical', 'Social', 'Economic'] },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        likelihood: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
        impact: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
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
  }
};

// ─── SECTION → CHAPTER MAPPING ───────────────────────────────────

const SECTION_TO_CHAPTER: Record<string, string> = {
  problemAnalysis: '1',
  projectIdea: '2',
  generalObjectives: '3_AND_4',
  specificObjectives: '3_AND_4',
  projectManagement: '5',
  activities: '5',
  risks: '5',
  outputs: '6',
  outcomes: '6',
  impacts: '6',
  kers: '6',
};

// ─── SECTION → SCHEMA MAPPING ────────────────────────────────────

const SECTION_TO_SCHEMA: Record<string, string> = {
  problemAnalysis: 'problemAnalysis',
  projectIdea: 'projectIdea',
  generalObjectives: 'objectives',
  specificObjectives: 'objectives',
  projectManagement: 'projectManagement',
  activities: 'activities',
  outputs: 'results',
  outcomes: 'results',
  impacts: 'results',
  risks: 'risks',
  kers: 'kers',
};

// ─── HELPERS ─────────────────────────────────────────────────────

const isValidDate = (d: any): boolean => d instanceof Date && !isNaN(d.getTime());

const sanitizeActivities = (activities: any[]): any[] => {
  const taskMap = new Map<string, { startDate: Date; endDate: Date }>();

  activities.forEach(wp => {
    if (wp.tasks) {
      wp.tasks.forEach((task: any) => {
        if (task.id && task.startDate && task.endDate) {
          taskMap.set(task.id, {
            startDate: new Date(task.startDate),
            endDate: new Date(task.endDate)
          });
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
            if (
              pred && curr &&
              isValidDate(pred.startDate) && isValidDate(pred.endDate) &&
              isValidDate(curr.startDate)
            ) {
              if (dep.type === 'FS' && curr.startDate <= pred.endDate) {
                dep.type = 'SS';
              }
            }
          });
        }
      });
    }
  });

  return activities;
};

const smartMerge = (original: any, generated: any): any => {
  if (original === undefined || original === null) return generated;
  if (generated === undefined || generated === null) return original;
  if (typeof original === 'string') return original.trim().length > 0 ? original : generated;

  if (Array.isArray(original) && Array.isArray(generated)) {
    const length = Math.max(original.length, generated.length);
    const mergedArray: any[] = [];
    for (let i = 0; i < length; i++) {
      mergedArray.push(
        i < original.length ? smartMerge(original[i], generated[i]) : generated[i]
      );
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

// ─── RULES ASSEMBLER (reads from Instructions.ts) ───────────────

const getRulesForSection = (sectionKey: string, language: 'en' | 'si'): string => {
  const instructions = getAppInstructions(language);
  const chapterKey = SECTION_TO_CHAPTER[sectionKey];

  if (chapterKey && instructions.CHAPTERS?.[chapterKey]) {
    const rules = instructions.CHAPTERS[chapterKey].RULES || [];
    if (rules.length > 0) {
      const header = language === 'si'
        ? 'STROGA PRAVILA ZA TA RAZDELEK'
        : 'STRICT RULES FOR THIS SECTION';
      return `\n${header}:\n- ${rules.join('\n- ')}\n`;
    }
  }
  return '';
};

// ─── PROMPT BUILDER (v3.4) ───────────────────────────────────────

const getPromptAndSchemaForSection = (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate',
  currentSectionData: any = null
) => {
  const context = getContext(projectData);
  const instructions = getAppInstructions(language);
  const globalRules = instructions.GLOBAL_RULES;
  const sectionRules = getRulesForSection(sectionKey, language);
  const schemaKey = SECTION_TO_SCHEMA[sectionKey];
  const schema = schemas[schemaKey];

  if (!schema) {
    throw new Error(`Unknown section key: ${sectionKey}`);
  }

  const config = getProviderConfig();
  const needsTextSchema = config.provider !== 'gemini';
  const textSchema = needsTextSchema ? schemaToTextInstruction(schema) : '';

  // v3.4: Language directive
  const langDirective = getLanguageDirective(language);

  // v3.4: Input language mismatch detection
  const langMismatchNotice = detectInputLanguageMismatch(projectData, language);

  // v3.4: Academic rigor rules
  const academicRules = getAcademicRigorRules(language);

  // v3.3/3.4: Mode instruction (fill / enhance / regenerate)
  let modeInstruction: string;

  if (mode === 'fill') {
    modeInstruction = language === 'si'
      ? `\nNAČIN: DOPOLNJEVANJE MANJKAJOČEGA.\nObstoječi podatki: ${JSON.stringify(currentSectionData)}\nPRAVILA:\n1. OHRANI vsa obstoječa neprazna polja natančno takšna, kot so — NE spreminjaj jih.\n2. GENERIRAJ strokovno vsebino SAMO za polja, ki so prazni nizi ("") ali manjkajoča.\n3. Če ima seznam manj elementov od priporočenega, DODAJ NOVE ELEMENTE.\n4. Zagotovi veljaven JSON objekt.\n`
      : `\nMODE: FILL MISSING ONLY.\nExisting data: ${JSON.stringify(currentSectionData)}\nRULES:\n1. KEEP all existing non-empty fields exactly as they are — do NOT modify them.\n2. GENERATE professional content ONLY for fields that are empty strings ("") or missing.\n3. If a list has fewer items than recommended, ADD NEW ITEMS.\n4. Ensure valid JSON output.\n`;

  } else if (mode === 'enhance') {
    modeInstruction = language === 'si'
      ? `\nNAČIN: STROKOVNA IZBOLJŠAVA OBSTOJEČEGA BESEDILA.\nObstoječi podatki: ${JSON.stringify(currentSectionData)}\n\nNaloga: STROKOVNO IZBOLJŠAJ, POGLOBI in DODELAJ obstoječo vsebino po pravilih EU projektov.\n\nPRAVILA:\n1. OHRANI pomen in tematiko — NE spreminjaj vsebinskega fokusa ali teme.\n2. IZBOLJŠAJ: dodaj strokovno EU terminologijo, poglobi argumente.\n3. DODAJ CITATE: vsak vzrok/posledica/opis MORA vsebovati vsaj en specifičen citat iz REALNEGA, PREVERLJIVEGA vira v formatu (Ime vira, Leto).\n4. PODALJŠAJ: kratka polja razširi na vsaj 3–5 vsebinskih, analitičnih stavkov.\n5. DOPOLNI: če je seznam kratek, DODAJ NOVE ELEMENTE.\n6. POPRAVI: odpravi slovnične napake, nedoslednosti, nejasnosti.\n7. NE BRIŠI: nikoli ne odstranjuj obstoječih elementov.\n8. NE HALUCIENIRAJ: vsi citati in statistike morajo biti resnični. Če nisi prepričan, uporabi "[Vstavite preverjen podatek: ...]".\n9. Zagotovi veljaven JSON objekt.\n`
      : `\nMODE: PROFESSIONAL ENHANCEMENT OF EXISTING CONTENT.\nExisting data: ${JSON.stringify(currentSectionData)}\n\nTask: PROFESSIONALLY ENHANCE, DEEPEN, and REFINE the existing content according to EU project proposal standards.\n\nRULES:\n1. PRESERVE the meaning and topic of every field — do NOT change the subject or thematic focus.\n2. ENHANCE: add professional EU terminology, deepen arguments with specific evidence.\n3. ADD CITATIONS: every cause/consequence/description MUST contain at least one specific citation from a REAL, VERIFIABLE source in format (Source Name, Year).\n4. EXPAND: extend short fields to at least 3–5 substantive, analytical sentences.\n5. SUPPLEMENT: if a list has fewer items than recommended, ADD NEW ITEMS.\n6. CORRECT: fix grammatical errors, inconsistencies, ambiguities.\n7. NEVER REMOVE: do not delete existing items or list entries.\n8. ZERO HALLUCINATION: all citations and statistics must be real. If unsure, use "[Insert verified data: ...]".\n9. Ensure valid JSON output.\n`;

  } else {
    modeInstruction = language === 'si'
      ? "NAČIN: POPOLNA PONOVNA GENERACIJA.\nGeneriraj popolnoma nov, celovit, strokoven odgovor za ta razdelek na podlagi konteksta. Vsak opis MORA vsebovati specifične citate iz REALNIH, PREVERLJIVIH virov. Če ne poznaš specifičnega podatka, uporabi označbo '[Vstavite preverjen podatek: ...]'."
      : "MODE: FULL REGENERATION.\nGenerate a completely new, comprehensive, professional response for this section based on the context. Every description MUST contain specific citations from REAL, VERIFIABLE sources. If you do not know a specific figure, use the placeholder '[Insert verified data: ...]'.";
  }

  const globalRulesHeader = language === 'si' ? 'GLOBALNA PRAVILA' : 'GLOBAL RULES';

  // Section-specific task instruction
  const taskInstruction = getSectionTaskInstruction(sectionKey, projectData, language);

  // Quality enforcement as the LAST element (highest attention due to recency bias)
  const qualityGate = getQualityEnforcement(sectionKey, language);

  // v3.4: Prompt order optimized for AI attention:
  // 1. Language (FIRST — highest priority)
  // 2. Input language mismatch notice (if applicable)
  // 3. Academic rigor rules (critical — sets the standard)
  // 4. Context (what the project is about)
  // 5. Mode (what to do)
  // 6. Global rules
  // 7. Section rules
  // 8. Schema (if needed)
  // 9. Task instruction
  // 10. Quality gate (LAST — second highest priority due to recency bias)
  const prompt = [
    langDirective,
    langMismatchNotice,
    academicRules,
    context,
    modeInstruction,
    `${globalRulesHeader}:\n${globalRules}`,
    sectionRules,
    textSchema,
    taskInstruction,
    qualityGate
  ].filter(Boolean).join('\n\n');

  return { prompt, schema };
};

// ─── SECTION-SPECIFIC TASK INSTRUCTIONS (v3.4 — strengthened) ────

const getSectionTaskInstruction = (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si'
): string => {
  switch (sectionKey) {
    case 'problemAnalysis': {
      const cp = projectData.problemAnalysis?.coreProblem;
      const titleStr = cp?.title?.trim() || '';
      const descStr = cp?.description?.trim() || '';

      let contextParts: string[] = [];
      if (titleStr) contextParts.push(language === 'si' ? `Naslov: "${titleStr}"` : `Title: "${titleStr}"`);
      if (descStr) contextParts.push(language === 'si' ? `Opis: "${descStr}"` : `Description: "${descStr}"`);

      const userInput = contextParts.length > 0
        ? contextParts.join('\n')
        : (language === 'si' ? '(uporabnik še ni vnesel podatkov)' : '(no user input yet)');

      return language === 'si'
        ? `UPORABNIKOV VNOS ZA OSREDNJI PROBLEM:\n${userInput}\n\nNALOGA: Na podlagi ZGORNJEGA VNOSA ustvari (ali dopolni) podrobno analizo problemov.\n\nOBVEZNE ZAHTEVE:\n- Generirani naslov in opis MORATA biti neposredno vsebinsko povezana z uporabnikovim vnosom.\n- NE izmišljuj nepovezanih tem.\n- Vsak VZROK mora vsebovati: naslov (samostalnik ali gerund), opis s 3–5 stavki, IN vsaj 1 specifičen statistični podatek s citacijo iz REALNEGA vira — npr. "(Eurostat, 2023: 47 % energetskih omrežij v EU...)".\n- Vsaka POSLEDICA mora vsebovati: naslov, opis s 3–5 stavki, IN vsaj 1 citat iz REALNEGA vira.\n- Osrednji problem MORA vključevati vsaj en kvantitativni kazalnik.\n- NIKOLI ne piši generičnih opisov brez podatkov.\n- Če ne poznaš specifične številke, napiši "[Vstavite preverjen podatek: <opis>]" — NE izmišljuj.`
        : `USER INPUT FOR CORE PROBLEM:\n${userInput}\n\nTASK: Based STRICTLY on the USER INPUT ABOVE, create (or complete) a detailed problem analysis.\n\nMANDATORY REQUIREMENTS:\n- The generated title and description MUST be directly related to the user's input.\n- Do NOT invent unrelated topics.\n- Every CAUSE must contain: a title (noun/gerund), a 3–5 sentence description, AND at least 1 specific statistical data point with citation from a REAL source — e.g. "(Eurostat, 2023: 47% of EU energy grids...)".\n- Every CONSEQUENCE must contain: a title, a 3–5 sentence description, AND at least 1 citation from a REAL source.\n- The core problem MUST include at least one quantitative indicator.\n- NEVER write generic descriptions without evidence.\n- If you do not know a specific figure, write "[Insert verified data: <description>]" — do NOT fabricate.`;
    }

    case 'projectIdea':
      return language === 'si'
        ? 'Na podlagi analize problemov razvij (ali dopolni) celovito projektno idejo.\n\nOBVEZNE ZAHTEVE:\n- Stanje tehnike (State of the Art) MORA navajati vsaj 3 specifične obstoječe projekte ali študije z imeni in letnicami — SAMO RESNIČNE, PREVERLJIVE projekte.\n- Predlagana rešitev MORA biti strukturirana v jasne faze (Faza 1, 2, 3...) s specifičnimi metodami.\n- EU politike morajo biti resnične in preverljive — NE izmišljuj imen politik.\n- Če ne poznaš specifičnega projekta, napiši "[Vstavite preverjen projekt: <tematika>]".'
        : 'Based on the problem analysis, develop (or complete) a comprehensive project idea.\n\nMANDATORY REQUIREMENTS:\n- State of the Art MUST reference at least 3 specific existing projects or studies with names and years — ONLY REAL, VERIFIABLE projects.\n- Proposed Solution MUST be structured in clear phases (Phase 1, 2, 3...) with specific methods.\n- EU policies must be real and verifiable — do NOT invent policy names.\n- If you do not know a specific project, write "[Insert verified project: <topic>]".';

    case 'generalObjectives':
      return language === 'si'
        ? 'Opredeli (ali dopolni) 3 do 5 širokih splošnih ciljev.\n\nOBVEZNO: Vsak naslov cilja se MORA začeti z glagolom v nedoločniku (npr. "Okrepiti...", "Razviti...", "Vzpostaviti...").\nVsak opis mora imeti vsaj 3 vsebinske stavke.'
        : 'Define (or complete) 3 to 5 broader general objectives.\n\nMANDATORY: Every objective title MUST begin with an infinitive verb (e.g. "Strengthen...", "Develop...", "Establish...").\nEvery description must have at least 3 substantive sentences.';

    case 'specificObjectives':
      return language === 'si'
        ? 'Opredeli (ali dopolni) vsaj 5 specifičnih S.M.A.R.T. ciljev.\n\nOBVEZNO: Vsak naslov cilja se MORA začeti z glagolom v nedoločniku.\nVsak cilj mora imeti merljiv kazalnik (KPI), ki meri uspeh, ne le dokončanje naloge.'
        : 'Define (or complete) at least 5 specific S.M.A.R.T. objectives.\n\nMANDATORY: Every objective title MUST begin with an infinitive verb.\nEvery objective must have a measurable indicator (KPI) that measures success, not just task completion.';

    case 'projectManagement':
      return language === 'si'
        ? 'Ustvari VISOKO PROFESIONALEN, PODROBEN razdelek o upravljanju in organizaciji projekta.\n\nVsebovati mora: koordinacijo, usmerjevalni odbor, WP voditelje, mehanizme odločanja, zagotavljanje kakovosti, obvladovanje konfliktov in poročanje.'
        : "Create a HIGHLY PROFESSIONAL, DETAILED project management and organization section.\n\nMust include: coordination structure, steering committee, WP leaders, decision-making mechanisms, quality assurance, conflict resolution, and reporting.";

    case 'activities': {
      const today = new Date().toISOString().split('T')[0];
      const projectStart = projectData.projectIdea?.startDate || today;
      return language === 'si'
        ? `Projekt se strogo začne dne ${projectStart}. Vsi začetni datumi nalog MORAJO biti na ali po tem datumu.\n\nNa podlagi specifičnih ciljev oblikuj (ali dopolni) podroben nabor delovnih sklopov (DS).\n\nOBVEZNO:\n- Vsak DS mora imeti: naslov z nedoločniškim glagolom, vsaj 3 naloge, vsaj 1 mejnik, vsaj 1 predvideni rezultat.\n- Predvideni rezultati morajo biti preverljivi z "desk review" — konkretni dokazi (PDF poročilo, spletna platforma, podpisan seznam prisotnih).\n- NE uporabljaj nejasnih opisov kot "izboljšano sodelovanje".`
        : `The project starts strictly on ${projectStart}. All task Start Dates MUST be on or after this date.\n\nBased on specific objectives, design (or complete) a detailed set of Work Packages (WPs).\n\nMANDATORY:\n- Each WP must have: title with infinitive verb, at least 3 tasks, at least 1 milestone, at least 1 deliverable.\n- Deliverables must be verifiable via desk review — concrete evidence (PDF report, web platform, signed attendance list).\n- Do NOT use vague descriptions like "improved cooperation".`;
    }

    case 'outputs':
      return language === 'si'
        ? 'Navedi (ali dopolni) vsaj 6 zelo podrobnih, oprijemljivih neposrednih rezultatov.\n\nVsak rezultat mora imeti: naslov z nedoločniškim glagolom, opis s 3+ stavki, in merljiv kazalnik.'
        : 'List (or complete) at least 6 very detailed, tangible outputs.\n\nEach output must have: title with infinitive verb, description with 3+ sentences, and a measurable indicator.';

    case 'outcomes':
      return language === 'si'
        ? 'Opiši (ali dopolni) vsaj 6 vmesnih učinkov (srednjeročne spremembe).\n\nVsak učinek mora imeti: naslov z nedoločniškim glagolom, opis s 3+ stavki, in merljiv kazalnik.'
        : 'Describe (or complete) at least 6 medium-term outcomes.\n\nEach outcome must have: title with infinitive verb, description with 3+ sentences, and a measurable indicator.';

    case 'impacts':
      return language === 'si'
        ? 'Opiši (ali dopolni) vsaj 6 dolgoročnih vplivov.\n\nVsak vpliv mora imeti: naslov z nedoločniškim glagolom, opis s 3+ stavki (vključno s Pathway to Impact narativom), in merljiv kazalnik.'
        : 'Describe (or complete) at least 6 long-term impacts.\n\nEach impact must have: title with infinitive verb, description with 3+ sentences (including Pathway to Impact narrative), and a measurable indicator.';

    case 'risks':
      return language === 'si'
        ? 'Identificiraj (ali dopolni) vsaj 5 potencialnih kritičnih tveganj (Tehnično, Družbeno, Ekonomsko).\n\nVsako tveganje mora imeti: specifičen naslov, podroben opis, utemeljeno verjetnost in vpliv, ter konkretne ukrepe za ublažitev.'
        : 'Identify (or complete) at least 5 potential critical risks (Technical, Social, Economic).\n\nEach risk must have: specific title, detailed description, justified likelihood and impact, and concrete mitigation measures.';

    case 'kers':
      return language === 'si'
        ? 'Identificiraj (ali dopolni) vsaj 5 ključnih izkoriščljivih rezultatov (KIR).\n\nVsak KIR mora imeti: specifičen naslov, podroben opis, in konkretno strategijo izkoriščanja.'
        : 'Identify (or complete) at least 5 Key Exploitable Results (KERs).\n\nEach KER must have: specific title, detailed description, and a concrete exploitation strategy.';

    default:
      return '';
  }
};

// ─── MAIN GENERATION FUNCTIONS ───────────────────────────────────

export const generateSectionContent = async (
  sectionKey: string,
  projectData: any,
  language: 'en' | 'si' = 'en',
  mode: string = 'regenerate'
) => {
  const currentSectionData = projectData[sectionKey];
  const { prompt, schema } = getPromptAndSchemaForSection(
    sectionKey, projectData, language, mode, currentSectionData
  );

  const config = getProviderConfig();
  const useNativeSchema = config.provider === 'gemini';

  const result = await generateContent({
    prompt,
    jsonSchema: useNativeSchema ? schema : undefined,
    jsonMode: !useNativeSchema,
  });

  const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  let parsedData = JSON.parse(jsonStr);

  if (sectionKey === 'projectIdea' && jsonStr.startsWith('[')) {
    throw new Error("API returned an array for projectIdea section, expected an object.");
  }

  if (sectionKey === 'activities' && Array.isArray(parsedData)) {
    parsedData = sanitizeActivities(parsedData);
  }

  if (sectionKey === 'projectIdea' && parsedData.proposedSolution) {
    let text = parsedData.proposedSolution;
    text = text.replace(
      /([^\n])\s*((?:\*\*|__)?(?:Faza|Phase)\s+\d+(?::|\.)(?:\*\*|__)?)/g,
      '$1\n\n$2'
    );
    parsedData.proposedSolution = text;
  }

  // Only smartMerge in 'fill' mode
  // 'enhance' mode: AI returns the full improved version — use directly
  // 'regenerate' mode: AI returns completely new content — use directly
  if (mode === 'fill' && currentSectionData) {
    parsedData = smartMerge(currentSectionData, parsedData);
  }

  return parsedData;
};

// ─── FIELD CONTENT GENERATION (v3.4) ─────────────────────────────

export const generateFieldContent = async (
  path: (string | number)[],
  projectData: any,
  language: 'en' | 'si' = 'en'
) => {
  const context = getContext(projectData);
  const fieldName = String(path[path.length - 1]);
  const sectionName = String(path[0]);

  const instructions = getAppInstructions(language);
  const globalRules = instructions.GLOBAL_RULES;
  const globalRulesHeader = language === 'si' ? 'GLOBALNA PRAVILA' : 'GLOBAL RULES';

  const langDirective = getLanguageDirective(language);

  // v3.4: Input language mismatch detection for field generation too
  const langMismatchNotice = detectInputLanguageMismatch(projectData, language);

  // v3.4: Academic rigor rules for field generation
  const academicRules = getAcademicRigorRules(language);

  const fieldRule = getFieldRule(fieldName, language);
  const fieldRuleText = fieldRule
    ? `\n${language === 'si' ? 'PRAVILO ZA TO POLJE' : 'FIELD-SPECIFIC RULE'}:\n${fieldRule}\n`
    : '';

  // v3.3: Inject sibling field values
  let siblingContext = '';
  try {
    let parentObj: any = projectData;
    for (let i = 0; i < path.length - 1; i++) {
      if (parentObj && parentObj[path[i]] !== undefined) {
        parentObj = parentObj[path[i]];
      } else {
        parentObj = null;
        break;
      }
    }
    if (parentObj && typeof parentObj === 'object') {
      const siblings: string[] = [];
      for (const [key, value] of Object.entries(parentObj)) {
        if (key !== fieldName && typeof value === 'string' && value.trim().length > 0) {
          siblings.push(`  ${key}: "${value}"`);
        }
      }
      if (siblings.length > 0) {
        const header = language === 'si'
          ? 'OBSTOJEČI PODATKI V ISTEM RAZDELKU (uporabi kot osnovo)'
          : 'EXISTING DATA IN THE SAME SECTION (use as the basis for generation)';
        siblingContext = `\n${header}:\n${siblings.join('\n')}\n`;
      }
    }
  } catch (e) {
    console.warn('[generateFieldContent] Could not extract sibling context:', e);
  }

  let specificContext = '';
  let extraInstruction = '';

  if (path.includes('milestones')) {
    if (fieldName === 'date') {
      const projectStartDate = projectData.projectIdea?.startDate || new Date().toISOString().split('T')[0];
      const wpIdx = path[1];
      const msIdx = path[3];
      const milestoneDesc = projectData.activities?.[wpIdx as number]?.milestones?.[msIdx as number]?.description || '';
      specificContext = language === 'si' ? 'datum za mejnik' : 'a date for a Milestone';
      extraInstruction = `\nCONTEXT:\n- Project Start Date: ${projectStartDate}\n- Milestone Description: "${milestoneDesc}"\nTASK: Estimate a realistic completion date.\nFORMAT: Return ONLY 'YYYY-MM-DD'. No other text.`;
    } else {
      specificContext = language === 'si'
        ? `mejnik v delovnem sklopu na poti ${JSON.stringify(path)}`
        : `a Milestone in the Work Package defined in the path ${JSON.stringify(path)}`;
    }
  } else if (path.includes('tasks')) {
    specificContext = language === 'si' ? 'nalogo v delovnem sklopu' : 'a Task in the Work Package';
  } else if (path.includes('deliverables')) {
    specificContext = language === 'si' ? 'predvideni rezultat' : 'a Deliverable';
  } else if (path.includes('risks')) {
    specificContext = language === 'si' ? 'specifično tveganje' : 'a specific Risk';
  } else {
    specificContext = language === 'si'
      ? `polje "${fieldName}"`
      : `the field "${fieldName}"`;
  }

  const anchorNote = siblingContext
    ? (language === 'si'
      ? ' Generirano besedilo MORA biti neposredno vsebinsko povezano z obstoječimi podatki zgoraj.'
      : ' The generated text MUST be directly and substantively related to the existing data above.')
    : '';

  const taskLine = language === 'si'
    ? `Generiraj profesionalno, strokovno vrednost za ${specificContext} znotraj razdelka "${sectionName}". Vrni samo besedilo. Vključi specifičen citat iz REALNEGA vira, če je primerno. Če ne poznaš specifičnega podatka, uporabi "[Vstavite preverjen podatek: ...]".${anchorNote}`
    : `Generate a professional, expert-level value for ${specificContext} within "${sectionName}". Just return the text value. Include a specific citation from a REAL source where appropriate. If you do not know a specific figure, use "[Insert verified data: ...]".${anchorNote}`;

  const prompt = [
    langDirective,
    langMismatchNotice,
    academicRules,
    context,
    siblingContext,
    `${globalRulesHeader}:\n${globalRules}`,
    fieldRuleText,
    extraInstruction,
    taskLine
  ].filter(Boolean).join('\n\n');

  const result = await generateContent({ prompt });
  return result.text;
};

export const generateProjectSummary = async (
  projectData: any,
  language: 'en' | 'si' = 'en'
) => {
  const context = getContext(projectData);
  const summaryRules = getSummaryRules(language);
  const summaryRulesHeader = language === 'si' ? 'PRAVILA ZA POVZETEK' : 'SUMMARY RULES';
  const langDirective = getLanguageDirective(language);
  const academicRules = getAcademicRigorRules(language);

  const prompt = [
    langDirective,
    academicRules,
    context,
    `${summaryRulesHeader}:\n- ${summaryRules}`
  ].join('\n\n');

  const result = await generateContent({ prompt });
  return result.text;
};

export const translateProjectContent = async (
  projectData: any,
  targetLanguage: 'en' | 'si'
) => {
  const langName = targetLanguage === 'si' ? 'Slovenian' : 'English';
  const translationRules = getTranslationRules(targetLanguage);

  const prompt = [
    `You are a professional translator for EU Project Proposals.`,
    `Translate the following JSON object strictly into ${langName}.`,
    `RULES:\n- ${translationRules}`,
    `Return ONLY the valid JSON string.`,
    `\nJSON to Translate:\n${JSON.stringify(projectData)}`
  ].join('\n');

  const result = await generateContent({ prompt, jsonMode: true });
  const jsonStr = result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  return JSON.parse(jsonStr);
};

export const detectProjectLanguage = detectLanguage;
