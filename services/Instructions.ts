// services/Instructions.ts
// ═══════════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH for ALL AI content rules.
// Version 7.0 – 2026-02-22
//
// ARCHITECTURE PRINCIPLE:
//   This file is the ONLY place where content rules are defined.
//   geminiService.ts reads from here — it has ZERO own rules.
//   Anything changed here IS THE LAW — no exceptions.
//
// CHANGES v7.0 (2026-02-22):
//   - MAJOR: Full Intervention Logic Framework (Section 0) integrated
//   - MAJOR: Cross-Chapter Consistency Gate (7e) — binding cross-references
//   - NEW: DNSH (Do No Significant Harm) principle — projectIdea, proposedSolution, globals
//   - NEW: Key Impact Pathways (KIPs) — Scientific, Societal, Economic for impacts
//   - NEW: 3-Pillar Sustainability Strategy for KER exploitation (Financial, Institutional, Political)
//   - NEW: Synergies & Capitalisation — mandatory in State of the Art + WP1
//   - NEW: Target Group vs End-User strict segmentation
//   - NEW: DMP (Data Management Plan) mandatory deliverable by M6
//   - NEW: Lump Sum compliance — binary, verifiable indicators
//   - NEW: AI Act / GDPR ethical compliance for digital/data projects
//   - NEW: CDE separation — Communication, Dissemination, Exploitation strictly separated
//   - NEW: Gender Equality Plans (GEPs) in quality assurance
//   - NEW: Expanded banned AI phrases list
//   - NEW: Consortium & partner allocation rules (Section 16)
//   - NEW: Resource coherence rules (Section 17)
//   - NEW: JSON edge-case rules for OpenRouter
//   - NEW: partnerType field in partners task instructions + quality gate
//   - CHANGED: partners schema includes partnerType enum (9 values)
//   - CHANGED: Quality gates expanded for all sections
//   - All previous v5.0 / v4.6 architecture preserved (getters, overrides, EN-only)
//
// CHANGES v5.0 (2026-02-17):
//   - EN-ONLY REFACTORING: All .si variants REMOVED from every constant
//     EXCEPT LANGUAGE_DIRECTIVES (which tells AI "write in Slovenian").
//   - All getter functions now ALWAYS return .en regardless of language param.
//   - getLanguageDirective() is the ONLY function that respects language param.
//
// CHANGES v4.6:
//   - Global Instructions override integration via globalInstructionsService.ts
//   - Every exported accessor function checks getGlobalOverrideSync() first.
//
// English-only rules — AI interprets in English regardless of output language.
// LANGUAGE_DIRECTIVES tells the AI which language to WRITE in.
// ═══════════════════════════════════════════════════════════════════

import { storageService } from './storageService';
import { getEffectiveOverrideSync as getGlobalOverrideSync } from './globalInstructionsService.ts';

// ═══════════════════════════════════════════════════════════════════
// SECTION 0 — INTERVENTION LOGIC FRAMEWORK
// ═══════════════════════════════════════════════════════════════════
// This is injected into EVERY prompt as foundational context.
// AI must understand the logical chain before generating any content.

export const INTERVENTION_LOGIC_FRAMEWORK = `═══ INTERVENTION LOGIC FRAMEWORK (MANDATORY CONTEXT) ═══

Intervention logic is the structured, cause-and-effect framework that represents
the entire logical architecture of a project — from the identified problem to
its long-term impacts. It is the golden thread connecting WHY a project is needed,
WHAT it intends to achieve, and HOW it will get there.

In European projects (Horizon Europe, Erasmus+, Interreg, LIFE, Digital Europe, etc.),
intervention logic is the backbone of any project proposal. Evaluators use it to verify
whether a project is internally consistent — whether each chapter logically flows from
the previous one and feeds into the next.

THE LOGICAL CHAIN:

  PROBLEM ANALYSIS (why is the project needed?)
    ↓
  PROJECT IDEA / SOLUTION (what do we propose?)
    ↓
  OBJECTIVES (what do we want to achieve — measurably?)
    ↓
  ACTIVITIES (how will we do it?)
    ↓
  OUTPUTS → OUTCOMES → IMPACTS (what will the project deliver?)

HOW THE CHAIN IS BUILT — SIX CHAPTERS:

Chapter 1 — Problem Analysis: Everything starts here. This is the foundation of the
entire intervention logic. The chapter demands a clear definition of the core problem,
supported by quantitative evidence. The problem is then broken down into its root and
proximate causes, and its consequences are mapped in an escalating chain from local
through regional and national all the way to EU-level impact. Without a solid problem
analysis, everything that follows is built on sand.

Chapter 2 — Project Idea: The problem analysis flows directly into the proposed
solution. This chapter defines the main aim of the project in a single sentence,
reviews the state of the art with references to real existing projects and studies
(including mandatory synergies and capitalisation), outlines the proposed solution
in phases, assesses readiness levels (technological, societal, organisational,
legislative), and aligns the project with relevant EU policies and the strict DNSH
(Do No Significant Harm) principle. This is also where the project title and
acronym are born.

Chapters 3–4 — Objectives: From the project idea emerge measurable objectives at
two levels. General objectives connect the project to broader EU goals and use
infinitive verb formulations. Specific objectives are shaped according to the
S.M.A.R.T. method — Specific, Measurable, Achievable, Relevant, and Time-bound —
each accompanied by a KPI indicator. Together, they translate ambition into
accountability.

Chapter 5 — Activities, Management and Risks: This is the operational core of the
project, divided into three sections. Project Management provides a detailed narrative
covering governance structure, decision-making, quality assurance (including Gender
Equality Plans and Ethical/Regulatory compliance), risk management, communication,
conflict resolution, and data management. The Work Plan organises the project into
work packages that follow a logical sequence — from a foundational analytical package,
through content and thematic packages, to dissemination and project coordination
packages that run throughout the entire project duration. Each package contains tasks,
milestones, and deliverables with clearly defined dependencies. The Risk Register
identifies risks across technical, social, economic, and environmental categories,
each assessed for likelihood and impact and paired with a mitigation strategy.

Chapter 6 — Expected Results and Key Exploitable Results: The final link in the chain
answers the question: what will the project actually deliver? Results are structured
across four ascending levels. Outputs are the direct, tangible deliverables of the
activities. Outcomes represent the medium-term changes those outputs generate. Impacts
capture the long-term strategic shifts linked to EU policy objectives and must map to
Key Impact Pathways (KIPs). Key Exploitable Results (KERs) are the specific assets or
products that carry lasting value beyond the project, each with a defined 3-pillar
sustainability strategy (Financial, Institutional, Political).

BINDING RULES:
1. Every cause identified in the Problem Analysis MUST be addressed by at least one
   Activity (Work Package or Task).
2. Every Specific Objective MUST be measurable through a KPI that maps to at least
   one Output or Outcome.
3. Every long-term Impact MUST connect back to at least one Consequence from the
   Problem Analysis AND to at least one EU policy referenced in the Project Idea,
   structured via Key Impact Pathways.
4. The Proposed Solution (Chapter 2) MUST logically respond to the causes identified
   in Chapter 1 and EXPLICITLY respect the DNSH principle.
5. Key Exploitable Results MUST derive from concrete Outputs produced by specific
   Work Packages.

CROSS-REFERENCE INTEGRITY:
When generating or enhancing any chapter, the AI MUST check that the content is
consistent with all other chapters. A broken link in the intervention logic chain
is a critical failure.
═══════════════════════════════════════════════════════════════════`;

// ───────────────────────────────────────────────────────────────
// LANGUAGE DIRECTIVES — ★ ONLY constant that keeps .si ★
// ───────────────────────────────────────────────────────────────

export const LANGUAGE_DIRECTIVES: Record<string, string> = {
  en: `═══ LANGUAGE DIRECTIVE (MANDATORY — OVERRIDES ALL OTHER INSTRUCTIONS) ═══
You MUST write ALL output content — every title, every description,
every indicator, every single text value — EXCLUSIVELY in British
English. Do NOT use any other language, even if the context below
is partially or fully in Slovenian.
═══════════════════════════════════════════════════════════════════`,

  si: `═══ LANGUAGE DIRECTIVE (MANDATORY — OVERRIDES ALL OTHER INSTRUCTIONS) ═══
You MUST write ALL output content — every title, every description,
every indicator, every single text value — EXCLUSIVELY in Slovenian
(slovenščina). Do NOT use English for ANY field value, even if the
context below is partially or fully in English. Translate concepts
into Slovenian; do not copy English phrases.
═══════════════════════════════════════════════════════════════════`
};

// ───────────────────────────────────────────────────────────────
// LANGUAGE MISMATCH TEMPLATE
// ───────────────────────────────────────────────────────────────

export const LANGUAGE_MISMATCH_TEMPLATE = `═══ INPUT LANGUAGE NOTICE ═══
The user's existing content appears to be written in {{detectedName}},
but the current application language is set to {{targetName}}.
INSTRUCTIONS:
1. UNDERSTAND and PRESERVE the semantic meaning of the user's input regardless of its language.
2. Generate ALL new content in {{targetName}} as required by the Language Directive.
3. If enhancing existing content, translate it into {{targetName}} while improving it.
4. Do NOT discard or ignore the user's input just because it is in a different language.
5. The user's input defines the TOPIC — always stay on that topic.
═══════════════════════════════════════════════════════════════════`;

// ───────────────────────────────────────────────────────────────
// ACADEMIC RIGOR RULES — EN only
// ───────────────────────────────────────────────────────────────

export const ACADEMIC_RIGOR_RULES: Record<string, string> = {
  en: `═══ MANDATORY ACADEMIC RIGOR & CITATION RULES ═══
These rules apply to ALL generated content WITHOUT EXCEPTION.

1. EVIDENCE-BASED CONTENT ONLY
   - Every claim, statistic, or trend MUST be supported by a verifiable source.
   - Do NOT generate plausible-sounding but unverifiable statements.
   - Preferred sources: Eurostat, OECD, World Bank, European Commission reports,
     UN agencies, peer-reviewed journals, national statistical offices, ACER, IEA,
     JRC, EEA, CEDEFOP, Eurofound, WHO.

2. CITATION FORMAT
   - Use inline citations: (Author/Organization, Year).
   - MINIMUM 2–3 citations per major paragraph or claim cluster.

3. ZERO-HALLUCINATION POLICY
   - NEVER invent organisation names, project names, or study titles.
   - NEVER fabricate statistics or percentages.
   - If a specific data point is needed but unknown, write:
     "[Insert verified data: <description of what is needed>]"

4. DOUBLE-VERIFICATION STANDARD
   - Before including any factual claim, verify:
     a) Does this organisation/report actually exist?
     b) Is this statistic plausible and from a credible source?
     c) Is the year/date accurate?
   - If ANY doubt exists, use the placeholder format from rule 3.
═══════════════════════════════════════════════════════════════════`
};

// ───────────────────────────────────────────────────────────────
// HUMANIZATION RULES — EN only — ★ v7.0: Expanded banned phrases + TG/EU segmentation
// ───────────────────────────────────────────────────────────────

export const HUMANIZATION_RULES: Record<string, string> = {
  en: `═══ HUMANIZATION RULES (MANDATORY) ═══
Content must read as if written by an experienced human EU project consultant.
EU evaluators and AI detection tools easily identify machine-generated text.

1. SENTENCE STRUCTURE VARIATION
   - Mix short sentences (8–12 words) with medium (15–20) and occasional long (25–35).
   - NEVER write 3+ consecutive sentences of similar length or structure.
   - Start sentences with different parts of speech: noun, prepositional phrase,
     subordinate clause, adverb.

2. BANNED AI FINGERPRINT PHRASES — do NOT use:
   - "In today's rapidly evolving...", "It is important to note that..."
   - "plays a crucial/pivotal/key role", "aims to address"
   - "comprehensive/holistic/multifaceted approach"
   - "foster/leverage/synergy/harness/robust/cutting-edge"
   - "paving the way for", "serves as a catalyst", "the landscape of"
   - "navigating the complexities", "it is worth noting", "a testament to"
   - "in light of the above", "cannot be overstated"
   - "In an era of...", "In an increasingly..."
   - "game-changer", "paradigm shift"
   - "best practices" (prefer "proven methods" or "established approaches")
   - "bridge the gap", "fill the gap", "address the gap"
   - "empower", "unlock the potential"
   - "stakeholders" used more than twice in any single section without specifying WHO
   - Instead use direct, specific language a senior consultant would write.

3. PROFESSIONAL IMPERFECTION
   - Do NOT give every list item the same sentence structure or sentence count.
   - Vary description lengths slightly: some items 3 sentences, others 4 or 5.
   - Use occasional parenthetical remarks (like this) and em-dashes — for asides.

4. CONCRETE OVER ABSTRACT & STRICT SEGMENTATION
   - Replace every abstract statement with a concrete, specific one.
   - STRICT RULE: Distinguish clearly between "Target Groups" (those engaged and
     communicated with during the project) and "End Users" (those adopting and using
     the KERs post-project).
   - WRONG: "Various stakeholders will benefit from improved digital capacities."
   - RIGHT: "Target Group: 50 municipal energy managers will participate in pilot
     testing. End Users: 300+ regional public authorities will adopt the validated
     methodology post-project."

5. VARIED LOGICAL CONNECTORS
   - Use: "Consequently,", "In parallel,", "A related challenge is",
     "Building on this,", "Against this backdrop,", "While progress has been
     made in X, the situation regarding Y remains critical."
   - Do NOT repeat: "Furthermore,", "Moreover,", "Additionally," — these are AI markers.

6. ACTIVE VOICE PREFERENCE
   - "The consortium will develop..." NOT "A platform will be developed..."
   - Use passive only when the actor is genuinely unknown.

7. QUANTIFIED SPECIFICITY
   - Never "significant improvement" — say "a 23% reduction in processing time."
   - Never "multiple partners" — say "7 partners across 4 EU Member States."
   - Never "various activities" — say "3 workshops, 2 pilots, and 1 hackathon."
═══════════════════════════════════════════════════════════════════`
};

// ───────────────────────────────────────────────────────────────
// PROJECT TITLE RULES — EN only
// ───────────────────────────────────────────────────────────────

export const PROJECT_TITLE_RULES: Record<string, string> = {
  en: `═══ STRICT RULES FOR PROJECT TITLE (projectTitle) ═══
ATTENTION: These rules apply ONLY to the "projectTitle" field (project name).
The acronym is generated SEPARATELY — the title MUST NOT contain an acronym.

1. LENGTH: between 30 and 200 characters (NOT shorter, NOT longer)
2. FORMAT: concise NOUN PHRASE — NOT a full sentence, NOT a verb form
3. NO ACRONYM — that is generated separately
4. NO CONJUGATED VERBS (NOT "The project will develop...", NOT "We develop...")
5. NO generic AI phrases ("An innovative approach to comprehensive development...")
6. NO comma-separated enumerations ("development, implementation, testing and dissemination...")
7. NO adjective chains ("Innovative, sustainable, comprehensive and advanced solution")
8. Title MUST answer: "What does this project DELIVER / ACHIEVE?"
9. Title is a PROJECT BRAND — concise, memorable, professional

GOOD TITLE EXAMPLES:
- "Digital Transformation of Artisan Skills in Cross-Border Regions"
- "Circular Economy in the Wood Processing Industry of the Danube Region"
- "Green Mobility Transition in Medium-Sized Cities"
- "Strengthening Digital Competences of Rural Youth"
- "Sustainable Food Supply Chain in the Alpine Space"
- "Intergenerational Knowledge Transfer in Cultural Heritage"

BAD TITLE EXAMPLES (FORBIDDEN):
- "Project for developing innovative solutions for sustainable transformation" (too generic)
- "We develop new approaches to comprehensively solving challenges" (sentence with verb)
- "Innovative, sustainable, comprehensive and advanced solution" (adjective chain)
- "GREENTRANS – Green Urban Transport Transformation" (contains acronym — FORBIDDEN)
- "The project will establish a platform for..." (sentence with verb — FORBIDDEN)
═══════════════════════════════════════════════════════════════════`
};

// ───────────────────────────────────────────────────────────────
// MODE INSTRUCTIONS (fill / enhance / regenerate) — EN only
// ───────────────────────────────────────────────────────────────

export const MODE_INSTRUCTIONS: Record<string, Record<string, string>> = {
  fill: {
    en: `MODE: FILL MISSING ONLY.
RULES:
1. KEEP all existing non-empty fields exactly as they are — do NOT modify them.
2. GENERATE professional content ONLY for fields that are empty strings ("") or missing.
3. If a list has fewer items than recommended, ADD NEW ITEMS.
4. Ensure valid JSON output.`
  },
  enhance: {
    en: `MODE: PROFESSIONAL ENHANCEMENT OF EXISTING CONTENT.

Task: PROFESSIONALLY ENHANCE, DEEPEN, and REFINE the existing content.

RULES:
1. PRESERVE the meaning and topic — do NOT change the thematic focus.
2. ENHANCE: add EU terminology, deepen arguments with evidence.
3. ADD CITATIONS from REAL sources.
4. EXPAND short fields to 3–5 sentences.
5. SUPPLEMENT: add new items if lists are short.
6. CORRECT errors.
7. NEVER REMOVE existing items.
8. ZERO HALLUCINATION — if unsure: "[Insert verified data: ...]".
9. NO MARKDOWN: do not use ** ## \`.
10. HUMANIZE: write like an experienced human consultant, vary sentence structure.
11. Ensure valid JSON output.`
  },
  regenerate: {
    en: `MODE: FULL REGENERATION.
Generate completely new, comprehensive, professional content. Every description MUST contain citations from REAL sources. NO markdown (**, ##, \`). Write like an experienced human consultant — vary sentence structures. If unknown: '[Insert verified data: ...]'.`
  }
};

// ───────────────────────────────────────────────────────────────
// QUALITY GATES (per section) — EN only
// ★ v7.0: Expanded with DNSH, KIPs, DMP, Lump Sum, CDE, partnerType,
//          Cross-Chapter Consistency Gate (7e)
// ───────────────────────────────────────────────────────────────

export const QUALITY_GATES: Record<string, Record<string, string[]>> = {
  problemAnalysis: {
    en: [
      'Every cause description contains ≥1 specific citation in format (Source Name, Year)',
      'Every consequence description contains ≥1 specific citation in format (Source Name, Year)',
      'The core problem statement includes at least one quantitative indicator',
      'Every description paragraph has ≥3 substantive, analytical sentences — no filler',
      'No vague phrases such as "various stakeholders", "different aspects" — be specific',
      'At least 4 distinct, non-overlapping causes are listed',
      'At least 4 distinct consequences are listed, at least one referencing EU-level policy',
      'Causes are logically ordered: root causes first, then proximate causes',
      'All cited sources are real, verifiable — do NOT fabricate statistics',
      'If unsure about a number, use "[Insert verified data: ...]" placeholder',
      'No banned AI phrases (leverage, synergy, holistic, foster, cutting-edge, game-changer, paradigm shift, empower, etc.)',
      'Sentence lengths vary — no 3+ consecutive sentences of similar length',
      'CROSS-CHECK: Every cause listed here MUST be addressable by at least one Activity/WP in Chapter 5',
      'CROSS-CHECK: Every consequence listed here MUST connect to at least one Impact in Chapter 6',
      'ZERO EMPTY FIELDS: Every field in the JSON output MUST contain substantive content — no empty strings, no "N/A", no whitespace-only values. This is a FATAL validation check.',
    ]
  },
  projectIdea: {
    en: [
      'projectTitle is a concise noun phrase (30–200 chars), NO acronym, NO full sentence',
      'projectAcronym is 3–8 uppercase letters, derived from projectTitle keywords, is pronounceable or a recognisable abbreviation, and is NOT a generic word (e.g., PROJECT, EUROPE)',
      'State of the Art references ≥3 specific existing projects/studies with names and years',
      'State of the Art EXPLICITLY describes how this project will capitalise on past results and avoid duplication (synergies)',
      'Proposed Solution BEGINS with a 5–8 sentence introductory paragraph BEFORE any phases',
      'Proposed Solution phases use plain text headers (no ** or ## markdown)',
      'Proposed Solution MUST include an explicit statement on compliance with the DNSH (Do No Significant Harm) principle',
      'Main Aim is one comprehensive sentence starting with an infinitive verb',
      'At least 3 relevant EU policies listed with specific alignment descriptions',
      'All readiness levels include a specific justification (not just the number)',
      'All cited projects and policies are real and verifiable — no fabricated names',
      'No banned AI phrases — write like a senior human consultant',
      'Sentence lengths and structures vary naturally throughout',
      'CROSS-CHECK: The Proposed Solution logically responds to the causes identified in Problem Analysis',
      'ZERO EMPTY FIELDS: Every field in the JSON output MUST contain substantive content — no empty strings, no "N/A", no whitespace-only values. This is a FATAL validation check.',
    ]
  },
  activities: {
    en: [
      'The LAST WP (highest number) is "Project Management and Coordination" — NOT any other topic',
      'The SECOND-TO-LAST WP is "Dissemination, Communication and Exploitation"',
      'WP1 is a foundational/analytical WP — NOT project management',
      'WP1 MUST include a specific task focusing on "Capitalisation and Synergies" (reviewing/integrating past EU project results)',
      'Total number of WPs is between 6 and 10',
      'A Data Management Plan (DMP) MUST be generated as a specific Deliverable or Milestone no later than Month 6 (M6) in WP1 or the PM WP',
      'Every WP has at least 1 milestone with a date in YYYY-MM-DD format',
      'Every WP has at least 1 deliverable with separate title and description fields',
      'Every task has startDate and endDate in YYYY-MM-DD format',
      'All WP and task titles use NOUN PHRASES, not infinitive verbs',
      'No markdown formatting in any text field',
      'Every task (except the very first task T1.1) has at least 1 dependency in its dependencies array',
      'Dependencies reference only valid predecessorId values from tasks that exist in the project',
      'Dependency types are valid: FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), or SF (Start-to-Finish)',
      'Cross-WP dependencies exist — at least some tasks depend on tasks in OTHER work packages',
      'Every deliverable title is a concise noun phrase (3–10 words)',
      'Every deliverable description has 2–4 substantive sentences explaining scope, format, and content',
      'Every deliverable indicator is specific, BINARY, and verifiable (Lump Sum compliant) — includes quantity, format, and verification method',
      'Project Management WP spans the ENTIRE project duration (M1 to final month)',
      'Dissemination WP spans the ENTIRE project duration (M1 to final month)',
      'The Dissemination WP MUST clearly separate CDE tasks: Communication (general public), Dissemination (peers/experts/target groups), and Exploitation (end-users/policymakers/market)',
      'No content/technical WP spans the entire project — each covers a specific phase',
      'Tasks within each WP are sequential or staggered — NOT all sharing identical start and end dates',
      'NO task endDate exceeds the project end date ({{projectEnd}})',
      'NO milestone date exceeds the project end date ({{projectEnd}})',
      'Final reporting task and closing milestone are scheduled ON or BEFORE the project end date',
      'LUMP SUM: Every Deliverable and Milestone indicator MUST be a BINARY, verifiable proof of completion (e.g., "1 PDF report of min 30 pages, approved by Steering Committee and published on website")',
      'CROSS-CHECK: Every cause from Problem Analysis is addressed by at least one WP or Task',
      'ZERO EMPTY FIELDS: Every field in the JSON output MUST contain substantive content — no empty strings, no "N/A", no whitespace-only values. This is a FATAL validation check.',
    ]
  },
  _default: {
    en: [
      'Every description has ≥3 substantive sentences',
      'All titles use the CORRECT format for their section (infinitive for objectives, noun phrase for activities/results/KERs) — see TITLE FORMAT RULES',
      'No vague filler phrases — be specific and analytical',
      'Content is directly linked to the project context and problem analysis',
      'Any cited source must be real and verifiable',
      'No markdown formatting (no **, no ##, no `) in output text',
      'No banned AI phrases (leverage, synergy, holistic, foster, cutting-edge, game-changer, paradigm shift, empower, etc.)',
      'Sentence lengths vary — no 3+ consecutive sentences of similar length',
      'Target Groups and End Users are clearly distinguished where relevant',
      'ZERO EMPTY FIELDS: Every field in the JSON output MUST contain substantive content — no empty strings, no "N/A", no whitespace-only values. This is a FATAL validation check.',
    ]
  },
  partners: {
    en: [
      'P1 is designated as Lead Partner / Coordinator with strong management capacity',
      'Every partner name is a TYPE DESCRIPTION (e.g., "Research University in X"), NEVER a real organisation name',
      'Every partner MUST have a partnerType value from the allowed enum (faculty, researchInstitute, sme, publicAgency, internationalAssociation, ministry, ngo, largeEnterprise, other)',
      'The partnerType MUST match the partner name description (e.g., "Research University..." → partnerType: "faculty")',
      'Expertise descriptions are 2–4 substantive sentences linking to specific WPs',
      'PM rates are realistic for each organisation type (2500–7000 EUR range)',
      'The consortium covers all competences required by the work packages',
      'At least one research/academic partner is included if the project has R&D components',
      'At least one practice/implementation partner (public authority, SME, NGO) is included',
      'Geographic diversity is reflected where the project scope requires it',
      'Partner count is appropriate for the project complexity (not too few, not too many)',
      'No markdown formatting, no banned AI phrases',
      'CROSS-CHECK: Every WP should have at least one partner with relevant expertise',
      'ZERO EMPTY FIELDS: Every field in the JSON output MUST contain substantive content — no empty strings, no "N/A", no whitespace-only values. This is a FATAL validation check.',
    ]
  },
  // ★ v7.0: NEW — Cross-Chapter Consistency Gate
  _crossChapter: {
    en: [
      'Every CAUSE in Problem Analysis is addressed by at least one WP or Task',
      'Every SPECIFIC OBJECTIVE has a corresponding KPI reflected in at least one Output or Outcome indicator',
      'Every IMPACT links to at least one Consequence from Problem Analysis and aligns with a Key Impact Pathway (KIP)',
      'KERs (Chapter 6D) originate from identifiable Outputs (Chapter 6A)',
      'The Proposed Solution (Chapter 2) logically responds to ALL causes in Chapter 1',
      'Partner expertise in Partnership covers ALL WP competence requirements',
      'ZERO EMPTY FIELDS: Every field across ALL chapters MUST contain substantive content — no empty strings, no "N/A", no whitespace-only values. This is a FATAL validation check.',
    ]
  }
};

// ───────────────────────────────────────────────────────────────
// SECTION TASK INSTRUCTIONS — EN only
// ★ v7.0: All sections updated with Intervention Logic cross-references,
//          DNSH, KIPs, DMP, Lump Sum, CDE, synergies, partnerType
// ───────────────────────────────────────────────────────────────

export const SECTION_TASK_INSTRUCTIONS: Record<string, Record<string, string>> = {
  problemAnalysis: {
    en: `USER INPUT FOR CORE PROBLEM:
{{userInput}}

TASK: Based STRICTLY on the USER INPUT ABOVE, create (or complete) a detailed problem analysis.

INTERVENTION LOGIC ROLE:
This is Chapter 1 — the FOUNDATION of the entire intervention logic. Every cause
identified here MUST later be addressable by at least one Activity (WP/Task).
Every consequence MUST connect to at least one Impact in Chapter 6.

MANDATORY:
- Title and description MUST be directly related to user's input.
- Do NOT invent unrelated topics.
- Every CAUSE: title + 3–5 sentence description + at least 1 citation from REAL source.
- Every CONSEQUENCE: title + 3–5 sentence description + at least 1 citation from REAL source.
- Core problem MUST include a quantitative indicator.
- Causes must be logically ordered: structural/root causes first, proximate causes second.
- Consequences must show the chain: local → regional → national → EU impact.
- NEVER write generic descriptions without evidence.
- If unknown: "[Insert verified data: <description>]".
- NO markdown (**, ##, \`).
- Write like an experienced human consultant — vary sentence structures.
- Clearly distinguish Target Groups (engaged during project) from End Users (adopting results post-project) where relevant.`
  },
  projectIdea: {
    en: `{{titleContext}}Based on the problem analysis, develop (or complete) a comprehensive project idea.

INTERVENTION LOGIC ROLE:
This is Chapter 2 — the Proposed Solution MUST logically respond to the causes
identified in Chapter 1. The State of the Art MUST demonstrate awareness of
existing work and how this project capitalises on it.

ACRONYM RULES (projectAcronym field):
- Generate a project ACRONYM derived from the key words of the projectTitle.
- LENGTH: 3–8 uppercase letters. Example: "GREENTRANS", "DIGI-CRAFT", "ALPSUST".
- The acronym MUST be pronounceable or a recognisable abbreviation.
- The acronym MUST NOT be a generic word (e.g., "PROJECT", "EUROPE", "DIGITAL").
- The acronym MUST NOT duplicate the full title — it is a SHORT code.
- If the title contains a geographic or thematic keyword, try to include it.
- Hyphens are allowed (e.g., "DIGI-CRAFT") but not required.
- Place the acronym ONLY in the "projectAcronym" field — NOT inside projectTitle.

STATE OF THE ART & SYNERGIES (MANDATORY):
- MUST reference at least 3 REAL existing projects/studies with names and years.
- You MUST explicitly describe how this project CAPITALISES on past results and
  avoids duplication (synergies). This is NOT optional.
- Example: "Building on the outcomes of the GreenTech project (2021–2024), which
  developed a prototype monitoring tool for 6 pilot regions, this project will
  extend the methodology to 12 additional regions and integrate real-time data
  feeds — avoiding duplication while capitalising on validated approaches."

PROPOSED SOLUTION (MANDATORY):
- MUST BEGIN with a COMPREHENSIVE INTRODUCTORY PARAGRAPH (5–8 sentences) before phases.
- Phase headers: plain text "Phase 1: Title" — NOT "**Phase 1: Title**".
- MUST include an explicit statement confirming adherence to the DNSH (Do No Significant
  Harm) principle. Example: "The project fully adheres to the Do No Significant Harm
  principle: all proposed activities have been screened against the six DNSH environmental
  objectives (climate mitigation, adaptation, water, circular economy, pollution, biodiversity)
  and no significant negative impact has been identified."

READINESS LEVELS:
- TRL, SRL, ORL, LRL must each include a numerical level, a label, and a 2–3 sentence
  justification specific to the project.

GENERAL:
- EU policies must be real and verifiable.
- If unknown project: "[Insert verified project: <topic>]".
- NO markdown (**, ##, \`).
- Write like an experienced human consultant — vary sentences, avoid AI phrases.`
  },
  generalObjectives: {
    en: `Define 3–5 general objectives.

INTERVENTION LOGIC ROLE:
General objectives connect the project to broader EU goals. Each objective MUST
be traceable back to the problem analysis and forward to the expected impacts.

MANDATORY:
- Title MUST use INFINITIVE VERB (e.g., "Strengthen…", "Develop…", "Enhance…").
- Each description: 3–5 substantive sentences linking to broader EU goals.
- Each objective MUST have an "indicator" field containing a SPECIFIC, MEASURABLE KPI (Key Performance Indicator) that demonstrates progress toward the objective. The indicator MUST be quantitative where possible (e.g., "Reduction in early school leaving rates by 15% across pilot regions by project end") or clearly verifiable (e.g., "Adoption of the developed methodology by at least 10 regional education authorities within 2 years post-project"). NEVER leave the indicator field empty.
- No markdown. Vary sentence structures.
- No banned AI phrases.`
  },
  specificObjectives: {
    en: `Define at least 5 S.M.A.R.T. objectives.

INTERVENTION LOGIC ROLE:
Every Specific Objective MUST be measurable through a KPI that maps to at
least one Output or Outcome in Chapter 6. This is the accountability bridge
between ambition and delivery.

MANDATORY:
- Title MUST use INFINITIVE VERB (e.g., "Develop…", "Increase…").
- Each description: 3–5 substantive sentences explaining the objective in detail.
- Each objective MUST have an "indicator" field containing a SPECIFIC, MEASURABLE, TIME-BOUND KPI (Key Performance Indicator). The indicator MUST follow the S.M.A.R.T. format and include a quantitative target, a baseline reference, and a timeframe. Examples: "Increase the percentage of pilot school students completing the academic year from 82% to 93% by M24" or "Train 200 educators across 5 partner regions in the new mediation methodology, verified by completion certificates, by M18". NEVER leave the indicator field empty — this is a FATAL error.
- S.M.A.R.T.: Specific, Measurable, Achievable, Relevant, Time-bound.
- No markdown. Vary sentence structures.
- No banned AI phrases.
- CROSS-CHECK: Each KPI should be verifiable through at least one Output or Outcome.`
  },
  projectManagement: {
    en: `Create a DETAILED project management section with TWO distinct parts:

PART 1 — DESCRIPTION FIELD (projectManagement.description):
This is the MAIN content field. It MUST contain a comprehensive text (minimum 500 words) covering ALL of the following:
1. MANAGEMENT STRUCTURE – Roles with EU abbreviations: PK, UO, SO, VDS. Responsibilities and authority of each.
2. DECISION-MAKING MECHANISMS – Operational, strategic, escalation levels. Voting, quorum, meeting frequency.
3. QUALITY ASSURANCE – Internal reviews, peer evaluations, external audits, benchmarks, reporting standards. MUST include verification/monitoring of Gender Equality Plans (GEPs), environmental standards, and ethical/regulatory compliance (e.g., AI Act, GDPR where applicable).
4. RISK MANAGEMENT APPROACH – Identification, assessment, monitoring, mitigation. Reference risk register (5C).
5. INTERNAL COMMUNICATION – Tools, schedules, reporting chains, document management.
6. CONFLICT RESOLUTION – Escalation: informal → mediation by coordinator → formal arbitration.
7. DATA MANAGEMENT AND OPEN SCIENCE – FAIR principles, access types, repository details. Reference the mandatory DMP deliverable (due by M6).
Write as flowing prose paragraphs, not bullet lists. No markdown. Write like an experienced consultant.

FORMATTING OF DESCRIPTION:
- Structure the description into CLEAR PARAGRAPHS separated by double newlines (\\n\\n).
- Each major topic (management structure, decision-making, quality assurance, risk management, communication, conflict resolution, data management) should be its OWN PARAGRAPH.
- Begin each paragraph with the topic as a plain text header on its own line, e.g.: "Management Structure" followed by a newline, then the descriptive text.
- Do NOT write one continuous block of text. The text must be readable with clear visual separation between topics.

PART 2 — STRUCTURE FIELDS (projectManagement.structure):
These fields appear as LABELS in the organigram chart. They MUST contain ONLY short role titles (max 5–8 words each):
- coordinator: e.g., "Project Coordinator (PK)"
- steeringCommittee: e.g., "Steering Committee (UO)"
- advisoryBoard: e.g., "Advisory Board (SO)"
- wpLeaders: e.g., "WP Leaders (VDS)"
CRITICAL: Do NOT put descriptions, explanations, or long text in structure fields. These are chart labels ONLY. All detailed descriptions go in the description field above.`
  },
  activities: {
    en: `Generate between 6 and 10 Work Packages with tasks, milestones and deliverables.

INTERVENTION LOGIC ROLE:
Activities are the operational core of the intervention logic. Every cause from
Problem Analysis MUST be addressed by at least one WP or Task. The logical
sequence of WPs translates the Proposed Solution into actionable steps.

ABSOLUTE PROJECT TIMEFRAME CONSTRAINT:
- Project START date: {{projectStart}}
- Project END date: {{projectEnd}} ({{projectDurationMonths}} months total)
- EVERY task startDate MUST be ≥ {{projectStart}}
- EVERY task endDate MUST be ≤ {{projectEnd}}
- EVERY milestone date MUST be ≤ {{projectEnd}}
- EVERY WP must start on or after {{projectStart}} and end on or before {{projectEnd}}
- NO activity, task, milestone, or deliverable may be scheduled AFTER {{projectEnd}}
- Dissemination, exploitation, and reporting tasks MUST be completed by {{projectEnd}}
- The final project report and closing milestone MUST be on or before {{projectEnd}}
- This is NON-NEGOTIABLE — any date outside this range is a FATAL ERROR

TITLE FORMAT RULES:
- WP titles: noun phrase (e.g., "Baseline Analysis and Stakeholder Mapping")
- Task titles: noun phrase (e.g., "Development of Training Curriculum")
- Milestone descriptions: noun phrase (e.g., "Completion of Pilot Phase")
- Deliverable titles: noun phrase (e.g., "Stakeholder Engagement Report")
- Do NOT use infinitive verbs for any of these.

WORK PACKAGE ORDERING (MANDATORY):
- WP1: foundational/analytical (e.g., "Baseline Analysis and Needs Assessment"). WP1 MUST include a specific task focusing on "Capitalisation and Synergies" (reviewing and integrating past EU project results relevant to this project).
- WP2–WP(N-2): content/thematic work packages in logical sequence
- WP(N-1) (second-to-last): "Dissemination, Communication and Exploitation of Results"
- WP(N) (last): "Project Management and Coordination"

MANDATORY DATA MANAGEMENT PLAN:
- A Data Management Plan (DMP) MUST be scheduled as a specific Deliverable no later than Month 6 (M6), either in WP1 or the PM WP.
- The DMP deliverable indicator: "1 PDF document (min. 15 pages) covering data types, FAIR compliance, storage, access rights, and ethical considerations, approved by the Steering Committee by M6"

WP DURATION RULES (MANDATORY):
- "Project Management and Coordination" WP MUST span the ENTIRE project duration — from the first month (M1) to the final month.
- "Dissemination, Communication and Exploitation" WP MUST also span the ENTIRE project duration — from M1 to the final month.
- Content/thematic WPs (WP1 to WP(N-2)) should be SEQUENTIAL with partial overlaps. Example for a 36-month project: WP1 covers M1–M10, WP2 covers M6–M18, WP3 covers M14–M26, WP4 covers M22–M34, etc.
- NO content/thematic WP should span the entire project duration.
- Tasks WITHIN each WP must be sequential or staggered — do NOT give all tasks in a WP the same startDate and endDate.

CDE SEPARATION IN DISSEMINATION WP (MANDATORY):
The Dissemination WP MUST clearly separate three types of tasks:
- Communication tasks — targeting the GENERAL PUBLIC (raising awareness, visibility)
- Dissemination tasks — targeting PEERS, EXPERTS, and TARGET GROUPS (sharing results, publications, conferences)
- Exploitation tasks — targeting END USERS, POLICYMAKERS, and MARKET (adoption, commercialisation, policy integration)
Do NOT mix these three categories into a single generic "dissemination" task.

TASK DEPENDENCIES (MANDATORY):
- The very first task of the project (T1.1) has NO dependencies (it is the starting point).
- EVERY OTHER task MUST have at least 1 dependency in its "dependencies" array.
- Each dependency object has: { "predecessorId": "T<wp>.<task>", "type": "FS" | "SS" | "FF" | "SF" }
- FS (Finish-to-Start) is the most common: the successor starts after the predecessor finishes.
- SS (Start-to-Start): both tasks start at the same time.
- FF (Finish-to-Finish): both tasks finish at the same time.
- SF (Start-to-Finish): the successor finishes when the predecessor starts (rare).
- CROSS-WP dependencies MUST exist: e.g., T2.1 depends on T1.3 (FS), T3.1 depends on T2.2 (FS).
- Within a WP, sequential tasks should have FS dependencies: T1.2 depends on T1.1, T1.3 depends on T1.2, etc.
- Parallel tasks within a WP can use SS dependencies.

DELIVERABLE FIELDS (MANDATORY — LUMP SUM COMPLIANT):
- Each deliverable MUST have THREE separate fields:
  1. "title" — a concise noun phrase (3–10 words), e.g., "Stakeholder Engagement Report"
  2. "description" — 2–4 substantive sentences explaining what the deliverable contains, its format, scope, and intended audience. Do NOT just repeat the title.
  3. "indicator" — a SPECIFIC, BINARY, and VERIFIABLE proof of completion (Lump Sum compliant). Include: quantity/format (e.g., "1 PDF report"), scope (e.g., "covering all 12 partner regions"), and verification method (e.g., "reviewed and approved by the Steering Committee").
- WRONG indicator: "Report delivered" (too vague, NOT binary)
- RIGHT indicator: "1 PDF report (min. 40 pages) covering baseline data from 12 regions, peer-reviewed by 2 external experts and approved by the Steering Committee by M10"

TASKS:
- Each WP must have 2–5 tasks.
- Each task: id, title, description (2–4 sentences), startDate, endDate, dependencies.
- Task descriptions should explain methodology, not just restate the title.

MILESTONES:
- Each WP must have at least 1 milestone.
- Milestone date in YYYY-MM-DD format. Place at logical completion points.
- Milestone indicators MUST also be BINARY and verifiable (Lump Sum compliant).

No markdown. Write like an experienced EU project consultant.

WP AND TASK ID PREFIX RULES (LANGUAGE-DEPENDENT — MANDATORY):
When the LANGUAGE DIRECTIVE specifies Slovenian output:
- Work Package IDs MUST use "DS" prefix: DS1, DS2, DS3, ...
- Task IDs MUST use "N" prefix: N1.1, N1.2, N2.1, ...
- Milestone IDs: M1.1, M2.1, ... (unchanged)
- Deliverable IDs: D1.1, D2.1, ... (unchanged)
When the LANGUAGE DIRECTIVE specifies English output:
- Work Package IDs MUST use "WP" prefix: WP1, WP2, WP3, ...
- Task IDs MUST use "T" prefix: T1.1, T1.2, T2.1, ...
- Milestone IDs: M1.1, M2.1, ... (unchanged)
- Deliverable IDs: D1.1, D2.1, ... (unchanged)
This is NON-NEGOTIABLE — wrong prefixes are a FATAL ERROR.`
  },
  outputs: {
    en: `Generate 5–8 concrete project outputs (direct deliverables).

INTERVENTION LOGIC ROLE:
Outputs are the direct, tangible deliverables of Activities. Every Output MUST
be traceable to a specific WP. Outputs feed into Outcomes and eventually Impacts.

MANDATORY:
- Each output: title (result-oriented noun phrase), description (3–5 sentences, mentions specific WP link), measurable indicator.
- Title MUST be a result-oriented noun phrase: "Digital Competence Curriculum" NOT "Develop a curriculum".
- Indicators MUST be BINARY and verifiable (Lump Sum compliant).
- Clearly state which Target Groups will directly receive/use each output.
- No markdown. Vary sentence structures.
- CROSS-CHECK: Each output should be producible by a specific WP/Task.`
  },
  outcomes: {
    en: `Generate 4–6 medium-term project outcomes (changes resulting from outputs).

INTERVENTION LOGIC ROLE:
Outcomes represent the medium-term changes that Outputs generate. They bridge
the gap between what the project delivers and the long-term Impacts.

MANDATORY:
- Each outcome: title (result-oriented noun phrase), description (3–5 sentences), indicator with target value and timeline.
- Title MUST be result-oriented noun phrase: "Increased Digital Literacy Among Rural Youth" NOT "Increase digital literacy".
- Clearly distinguish Target Groups (those involved during the project) from End Users (those adopting results post-project).
- No markdown. Vary sentence structures.
- CROSS-CHECK: Each outcome should link to at least one Specific Objective KPI.`
  },
  impacts: {
    en: `Generate 3–5 long-term strategic impacts aligned with EU policy objectives.

INTERVENTION LOGIC ROLE:
Impacts are the long-term strategic shifts resulting from the project. They MUST
connect back to Consequences from Problem Analysis AND to EU policies from Project Idea.

KEY IMPACT PATHWAYS (KIPs) — MANDATORY:
Categorise each impact into one of the three Key Impact Pathways:
- Scientific Impact — advancing knowledge, methods, standards
- Societal Impact — addressing societal challenges, improving quality of life
- Economic Impact — innovation, competitiveness, growth, employment
Explicitly state the pathway in each impact description.

MANDATORY:
- Each impact: title (result-oriented noun phrase), description (3–5 sentences linking to EU goals and KIP), indicator with baseline and target.
- Title MUST be result-oriented noun phrase: "Enhanced Cross-Border Innovation Ecosystem" NOT "Enhance the ecosystem".
- No markdown. Vary sentence structures.
- CROSS-CHECK: Every impact links to at least one Consequence from Problem Analysis.`
  },
  risks: {
    en: `Generate 8–12 project risks across ALL FOUR categories:
- technical (technology failures, integration issues)
- social (stakeholder resistance, low engagement)
- economic (budget overruns, market changes)
- environmental (climate events, regulatory changes, environmental compliance)

MANDATORY:
- Each risk: id, category (lowercase: technical/social/economic/environmental), title, description (2–4 sentences), likelihood (low/medium/high), impact (low/medium/high), mitigation strategy (2–4 sentences).
- Use NOUN PHRASES for titles: "Insufficient Partner Engagement" NOT "Partners might not engage".
- If the project includes digital/AI components, MUST include an "Ethical and Regulatory Compliance (AI Act/GDPR)" risk with appropriate mitigation strategy.
- No markdown. Vary sentence structures.`
  },
  kers: {
    en: `Generate 4–6 Key Exploitable Results (KERs).

INTERVENTION LOGIC ROLE:
KERs are the specific assets or products that carry lasting value beyond the
project lifetime. They MUST derive from concrete Outputs produced by specific WPs.

3-PILLAR SUSTAINABILITY STRATEGY (MANDATORY):
Every KER exploitation strategy MUST address all three pillars:
1. Financial Sustainability — how it will be funded/maintained post-project
   (licensing, freemium model, membership fees, integration into existing budgets)
2. Institutional Sustainability — who takes ownership and operational responsibility
   (which partner, which institution, what governance structure)
3. Political/Regulatory Sustainability — how it integrates into local/regional/EU
   policies and regulatory frameworks (alignment with directives, endorsement paths)

MANDATORY:
- Each KER: id, title (specific noun phrase — the product/asset name), description (3–5 sentences about what it is, who will use it, and how it differs from existing solutions), exploitation strategy (3–5 sentences covering ALL THREE sustainability pillars above).
- Title MUST be a specific asset/product name: "GreenGrid Decision Support Tool" NOT "Development of a tool".
- No markdown. Vary sentence structures.
- CROSS-CHECK: Each KER must originate from a concrete Output produced by a specific WP.`
  },
  partners: {
    en: `Generate a realistic consortium (partnership) for this EU project.

CONTEXT AWARENESS:
- Analyse the project's problem analysis, objectives, activities (work packages), and expected results.
- The consortium must cover ALL competences needed to deliver ALL work packages.
- The number of partners depends on project complexity: typically 4–8 for Interreg, 6–15 for Horizon Europe, 3–6 for Erasmus+.

FUNDING MODEL:
- The user has ALREADY selected the funding model (centralized or decentralized). Do NOT change it.
- Use the fundingModel value from the project data context.

WHAT TO GENERATE FOR EACH PARTNER:
1. "id" — unique string: "partner-1", "partner-2", etc.
2. "code" — short code: "CO" for the coordinator (index 0), "P2", "P3", etc. for others.
3. "name" — PARTNER TYPE description (NOT a real organisation name). Examples:
   - "Research University specialising in Environmental Science"
   - "SME in Digital Technologies and Software Development"
   - "Regional Development Agency with cross-border experience"
   - "Public Authority responsible for Urban Mobility"
   - "NGO focused on Social Inclusion and Youth Empowerment"
   - "Technology Transfer Centre in Renewable Energy"
   - "Chamber of Commerce with Industry Network Access"
   - "Vocational Training Institute for Green Skills"
4. "expertise" — 2–4 sentences describing what specific expertise this partner type brings to the project, which WPs they would lead or contribute to, and what unique value they add.
5. "pmRate" — realistic EU Person-Month cost rate for this organisation type (in EUR):
   - Large Research University: 5500–7000
   - Applied Sciences University: 4500–6000
   - SME (technology): 4000–5500
   - SME (consulting): 3500–5000
   - Public Authority: 3000–4500
   - NGO / Non-profit: 2500–4000
   - Chamber / Association: 3000–4500
   - Vocational Training: 3500–5000
6. "partnerType" — MANDATORY. You MUST assign exactly ONE of these values to EVERY partner:
   - "faculty" — for universities, faculties, academic institutions
   - "researchInstitute" — for dedicated research centres and institutes
   - "sme" — for small and medium enterprises
   - "publicAgency" — for public agencies, regional development agencies
   - "internationalAssociation" — for international associations, chambers of commerce
   - "ministry" — for ministries, government bodies
   - "ngo" — for NGOs, non-profits, civil society organisations
   - "largeEnterprise" — for large corporations
   - "other" — only if none of the above fits

RULES for partnerType:
   - EVERY partner MUST have a partnerType — it is NEVER empty or missing.
   - The partnerType MUST match the partner's "name" description.
   - Example: if name is "Research University...", then partnerType MUST be "faculty".
   - Example: if name is "SME in Digital...", then partnerType MUST be "sme".
   - Example: if name is "Regional Development Agency...", then partnerType MUST be "publicAgency".

PARTNER COMPOSITION RULES:
- P1 / CO (Lead Partner / Coordinator): must have strong project management capacity and topic expertise.
- Include at LEAST one research/academic partner if the project has innovation or R&D components.
- Include at LEAST one practice/implementation partner (public authority, SME, or NGO).
- Ensure geographic diversity where the project scope implies cross-border/transnational work.
- Every WP should have at least one partner with relevant expertise.
- Do NOT include more partners than the project complexity justifies.

CRITICAL RULES:
- NEVER use real organisation names — always use PARTNER TYPE descriptions.
- The "name" field describes WHAT KIND of organisation, not WHO specifically.
- PM rates must be realistic for EU-funded projects (not too low, not too high).
- The total consortium must be balanced: not all universities, not all SMEs.
- Write expertise descriptions like an experienced EU project consultant.
- No markdown formatting. No banned AI phrases.`
  }
};

// ───────────────────────────────────────────────────────────────
// CHAPTERS (long-form rules for each section) — EN only
// ★ v7.0: Updated with DNSH, KIPs, 3-Pillar, Synergies, DMP,
//          Lump Sum, CDE, GEPs, AI Act, partnerType
// ───────────────────────────────────────────────────────────────

export const CHAPTERS: Record<string, string> = {
  chapter1_problemAnalysis: `CHAPTER 1 — PROBLEM ANALYSIS

The Problem Analysis is the foundation of the entire intervention logic.
It must demonstrate a rigorous understanding of the problem the project addresses.

STRUCTURE:
1. Core Problem — a clear, concise statement of the central problem with at least one quantitative indicator.
2. Causes — at least 4 distinct root and proximate causes, each with a citation.
3. Consequences — at least 4 distinct consequences, at least one linking to EU-level policy.

QUALITY:
- Every cause and consequence must have a title AND a detailed description (3–5 sentences).
- Descriptions must include evidence-based arguments with inline citations.
- Causes must be logically ordered: structural/root causes first, proximate causes second.
- Consequences must show the chain: local → regional → national → EU impact.

INTERVENTION LOGIC BINDING:
- Every cause listed here MUST be addressable by at least one Activity (WP/Task) in Chapter 5.
- Every consequence listed here MUST connect to at least one Impact in Chapter 6.
- A broken link between causes and activities is a critical failure for EU evaluators.`,

  chapter2_projectIdea: `CHAPTER 2 — PROJECT IDEA

The Project Idea translates the problem analysis into a proposed intervention.

STRUCTURE:
1. Main Aim — ONE comprehensive sentence starting with an infinitive verb.
2. State of the Art — references to at least 3 REAL existing projects/studies.
   MUST explicitly describe synergies and capitalisation: how this project builds on
   past results and avoids duplication of effort.
3. Proposed Solution — begins with 5–8 sentence overview paragraph, then phases.
   MUST include an explicit DNSH (Do No Significant Harm) compliance statement:
   confirm that all activities have been screened against the six DNSH environmental
   objectives (climate mitigation, climate adaptation, water and marine resources,
   circular economy, pollution prevention, biodiversity) and no significant negative
   impact has been identified.
4. Readiness Levels — TRL, SRL, ORL, LRL with justifications (numerical level + label + 2–3 sentences).
5. EU Policies — at least 3 relevant EU policies with alignment descriptions.
6. Project Acronym — a short, memorable code (3–8 uppercase letters) derived from the project title keywords.

TITLE RULES:
- Project title: noun phrase, 30–200 characters, no acronym, no verb.
- Project acronym: 3–8 uppercase letters, pronounceable or recognisable, placed ONLY in projectAcronym field.

INTERVENTION LOGIC BINDING:
- The Proposed Solution MUST logically respond to ALL causes identified in Chapter 1.
- If a cause exists in the Problem Analysis but the solution does not address it, this is a critical gap.`,

  chapter3_4_objectives: `CHAPTERS 3–4 — OBJECTIVES

General Objectives (3–5):
- Each title uses INFINITIVE VERB: "Strengthen…", "Develop…", "Enhance…"
- Each description: 3–5 sentences linking to broader EU goals.

Specific Objectives (≥5):
- S.M.A.R.T. format: Specific, Measurable, Achievable, Relevant, Time-bound.
- Each title uses INFINITIVE VERB.
- Each must have a measurable KPI indicator.

INTERVENTION LOGIC BINDING:
- Every Specific Objective MUST have a KPI that maps to at least one Output or Outcome in Chapter 6.
- If a Specific Objective has no corresponding measurable result, this is a critical gap.`,

  chapter5_activities: `CHAPTER 5 — ACTIVITIES, MANAGEMENT AND RISKS

SECTION 5A — PROJECT MANAGEMENT (projectManagement):
The projectManagement object has TWO parts:
1. description field — detailed narrative (≥500 words) covering management structure,
   decision-making, quality assurance (including GEPs, AI Act/GDPR compliance where applicable),
   risk management, communication, conflict resolution, data management (referencing the
   mandatory DMP deliverable due by M6). Written as prose paragraphs separated by \\n\\n.
   Each topic gets its own paragraph with a plain-text header on the first line.
   Structure fields contain ONLY short labels for the organigram.
2. structure fields — short role labels (5–8 words max) for organigram chart display.

SECTION 5B — WORK PLAN (activities):
Between 6 and 10 work packages (WPs):
- WP1: foundational/analytical (NOT project management). MUST include a "Capitalisation and
  Synergies" task reviewing and integrating past EU project results.
- WP2 to WP(N-2): content/thematic WPs in logical sequence
- WP(N-1): Dissemination, Communication and Exploitation of Results — spans ENTIRE project
  (M1–final month). MUST strictly separate CDE tasks:
    → Communication tasks (general public, visibility, awareness)
    → Dissemination tasks (peers, experts, target groups, publications, conferences)
    → Exploitation tasks (end users, policymakers, market, adoption, commercialisation)
- WP(N): Project Management and Coordination — spans ENTIRE project (M1–final month)

MANDATORY DELIVERABLE:
- A Data Management Plan (DMP) MUST be scheduled as a deliverable by Month 6 (M6).

Content/thematic WPs are sequential with overlaps — none spans the entire project.
Tasks within each WP are sequential or staggered, not all identical dates.

Each WP: id (WP1, WP2…), title (noun phrase), tasks (2–5 each), milestones (≥1), deliverables (≥1).
Each task: id (T1.1, T1.2…), title, description, startDate, endDate, dependencies.
Each deliverable: id, title (noun phrase), description (2–4 sentences), indicator (specific,
  BINARY, verifiable — Lump Sum compliant).
All task dates in YYYY-MM-DD.

Task dependencies are MANDATORY:
- T1.1 has no dependencies.
- Every other task has ≥1 dependency with predecessorId and type (FS/SS/FF/SF).
- Cross-WP dependencies must exist.

TITLE FORMAT:
- WP, task, milestone, deliverable titles: NOUN PHRASES.
- NOT infinitive verbs.

LUMP SUM COMPLIANCE:
Every Deliverable and Milestone indicator MUST be a BINARY, verifiable proof of
completion. "Report delivered" is NOT acceptable. "1 PDF report (min. 30 pages),
approved by Steering Committee and published on website" IS acceptable.

SECTION 5C — RISK REGISTER (risks):
8–12 risks across categories: technical, social, economic, environmental.
Each: id, category (lowercase), title, description, likelihood, impact, mitigation.
If the project involves digital/AI components, MUST include an "Ethical and Regulatory
Compliance (AI Act/GDPR)" risk with appropriate mitigation.

INTERVENTION LOGIC BINDING:
- Every cause from Problem Analysis (Chapter 1) MUST be addressed by at least one WP or Task.
- If a cause has no corresponding activity, this is a critical gap for evaluators.`,

  chapter6_results: `CHAPTER 6 — EXPECTED RESULTS AND KEY EXPLOITABLE RESULTS

SECTION 6A — OUTPUTS (5–8 direct deliverables)
Title format: result-oriented noun phrase.
Each output MUST be traceable to a specific WP.
Indicators MUST be BINARY and verifiable (Lump Sum compliant).
Clearly state which Target Groups will directly receive/use each output.

SECTION 6B — OUTCOMES (4–6 medium-term changes)
Title format: result-oriented noun phrase.
Clearly distinguish Target Groups from End Users.
Each outcome MUST link to at least one Specific Objective KPI.

SECTION 6C — IMPACTS (3–5 long-term strategic changes)
Title format: result-oriented noun phrase.
Must link to EU policy objectives.
MANDATORY: Categorise each impact into a Key Impact Pathway (KIP):
  - Scientific Impact — advancing knowledge, methods, standards
  - Societal Impact — addressing societal challenges, quality of life
  - Economic Impact — innovation, competitiveness, growth, employment
Explicitly state the KIP in each impact description.
Every impact MUST connect back to at least one Consequence from Problem Analysis.

SECTION 6D — KEY EXPLOITABLE RESULTS (4–6 KERs)
Title format: specific asset/product name (noun phrase).
Each KER MUST derive from a concrete Output produced by a specific WP.
Each exploitation strategy MUST address the 3-Pillar Sustainability Strategy:
  1. Financial Sustainability — post-project funding model
  2. Institutional Sustainability — ownership and governance
  3. Political/Regulatory Sustainability — policy integration and endorsement

INTERVENTION LOGIC BINDING:
- KERs originate from Outputs (6A).
- Outputs originate from Activities (Chapter 5).
- Impacts connect back to Consequences (Chapter 1).
- Every Specific Objective KPI is reflected in at least one Output or Outcome indicator.`,

  chapter5b_partners: `CHAPTER 5B — PARTNERSHIP (CONSORTIUM)

The Partnership section defines the consortium composition for the EU project.
AI generates PARTNER TYPES, not specific organisation names.

STRUCTURE:
Each partner entry includes: id, code (CO for coordinator, P2, P3...), name (type description),
expertise (2–4 sentences), pmRate (EUR per person-month), and partnerType (mandatory enum).

CO (P1) is always the Lead Partner / Coordinator.

PARTNER TYPE ENUM (partnerType field — MANDATORY for every partner):
- "faculty" — universities, faculties, academic institutions
- "researchInstitute" — dedicated research centres and institutes
- "sme" — small and medium enterprises
- "publicAgency" — public agencies, regional development agencies
- "internationalAssociation" — international associations, chambers of commerce
- "ministry" — ministries, government bodies
- "ngo" — NGOs, non-profits, civil society organisations
- "largeEnterprise" — large corporations
- "other" — only if none of the above fits

RULES:
- Partner "name" field = ORGANISATION TYPE, e.g., "Research University in Marine Biology"
- NEVER use real organisation names (no "University of Ljubljana", no "Fraunhofer", etc.)
- PM rates must be realistic for the partner type
- Consortium must cover all WP competences
- Include a mix of academia, industry/SME, public sector, and civil society as needed
- Number of partners is determined by project complexity and scope
- partnerType MUST match the partner name description — NEVER leave it empty`
};

// ───────────────────────────────────────────────────────────────
// GLOBAL RULES — ★ v7.0: Added DNSH, TG/EU segmentation, GEPs, gender
// ───────────────────────────────────────────────────────────────

export const GLOBAL_RULES = `
1. All content must be directly relevant to the specific project context.
2. Every claim must be evidence-based with verifiable citations.
3. STRICT COMPLIANCE with the Do No Significant Harm (DNSH) principle across all proposed solutions.
4. Clear distinction between Target Groups (engaged during project) and End Users (adopting results post-project).
5. No markdown formatting (**, ##, \`) in any output text.
6. Write like an experienced human EU project consultant.
7. Vary sentence structures and lengths — no AI-pattern repetition.
8. No banned AI phrases (see HUMANIZATION RULES).
9. If a data point is uncertain, use "[Insert verified data: ...]".
10. Dates must be in YYYY-MM-DD format.
11. All content must support the intervention logic chain: Problem → Objectives → Activities → Results.
12. Quantify wherever possible — no vague statements.
13. Content should reflect the gender dimension and inclusivity principles (GEPs) in line with EU standards.
14. Every deliverable and milestone indicator should be BINARY and verifiable (Lump Sum compliant).
15. ZERO EMPTY FIELDS RULE (SUPREME — NO EXCEPTIONS): Every field defined in the JSON schema MUST contain substantive, meaningful content. An empty string (""), a placeholder like "N/A", or a field with only whitespace is a FATAL ERROR that causes the ENTIRE output to be REJECTED. This applies to EVERY field in EVERY section without exception: titles, descriptions, indicators, mitigations, exploitation strategies, justifications, names, dates — ALL fields. If you are unsure what to write for a field, generate your best professional attempt rather than leaving it empty.
`;

// ───────────────────────────────────────────────────────────────
// FIELD-SPECIFIC RULES — EN only — ★ v7.0: Updated indicator + exploitation
// ───────────────────────────────────────────────────────────────

export const FIELD_RULES: Record<string, Record<string, string>> = {
  title: {
    en: 'Generate a concise, professional title. Follow the title format rules for this section type.'
  },
  description: {
    en: 'Generate a detailed professional description. Minimum 3 substantive sentences. Include evidence and citations where appropriate. No markdown.'
  },
  indicator: {
    en: 'Generate a specific, BINARY, and verifiable indicator (Lump Sum compliant). Include target value, timeline, verification method, and format. Example: "1 PDF report (min. 30 pages) covering baseline data from 12 regions, peer-reviewed by 2 external experts and approved by the Steering Committee by M10."'
  },
  mitigation: {
    en: 'Generate a detailed risk mitigation strategy. 2–4 sentences covering preventive measures, contingency plans, responsible parties, and monitoring triggers.'
  },
  exploitationStrategy: {
    en: 'Generate a detailed exploitation strategy addressing the 3 Pillars of Sustainability: (1) Financial Sustainability — post-project funding model; (2) Institutional Sustainability — ownership and governance; (3) Political/Regulatory Sustainability — policy integration. 3–5 sentences covering all three pillars, plus target market and scaling potential.'
  },
  mainAim: {
    en: 'Generate the project main aim as ONE comprehensive sentence starting with an infinitive verb (e.g., "To establish...", "To develop..."). Must capture the project\'s core purpose.'
  },
  projectTitle: {
    en: 'Generate a project title following the STRICT PROJECT TITLE RULES: noun phrase, 30–200 characters, no acronym, no verb, no generic AI phrases. Must be a project brand.'
  },
  projectAcronym: {
    en: 'Generate a project acronym: 3–8 uppercase letters derived from the project title keywords. Must be pronounceable or a recognisable abbreviation. Must NOT be a generic word (e.g., PROJECT, EUROPE). Place ONLY in projectAcronym field, never inside projectTitle. Hyphens allowed (e.g., DIGI-CRAFT).'
  }
};

// ───────────────────────────────────────────────────────────────
// SUMMARY RULES — EN only — ★ v7.0: Added DNSH, KIPs, IL traceability
// ───────────────────────────────────────────────────────────────

export const SUMMARY_RULES: Record<string, string> = {
  en: `
YOU ARE A CONDENSATION ENGINE — NOT A COPY-PASTE ENGINE.
Your job is to DISTILL the project into a SHORT executive summary.
You must RADICALLY SHORTEN every section — capture only the ESSENCE.

TOTAL MAXIMUM: 800 words. If your output exceeds 800 words, it is REJECTED.

MANDATORY STRUCTURE — exactly 5 sections with ## headings:

## 1. Project Overview
MAXIMUM 80 WORDS. Extract: title, acronym, duration, budget, programme/call (only if they exist in the data). Add 1-2 sentences capturing the core idea. Nothing more.

## 2. Problem & Need
MAXIMUM 120 WORDS. State the core problem in 2-3 sentences. Mention only the 2-3 MOST IMPORTANT causes — do NOT list all causes. Do NOT list all consequences. Capture the ESSENCE, not the detail. No bullet points.

## 3. Solution & Approach
MAXIMUM 150 WORDS. Describe the solution concept in 2-3 sentences. Must mention DNSH compliance. List work packages ONLY by name in one sentence (e.g., "The project is structured into 6 work packages covering baseline analysis, agent development, digital twin validation, pilot demonstrations, dissemination, and project management."). Do NOT describe each WP in detail. No bullet points.

## 4. Key Results & Impact
MAXIMUM 200 WORDS. Mention only the 3-4 MOST SIGNIFICANT outputs/deliverables in 1-2 sentences. State 2-3 key measurable outcomes. State 2-3 long-term impacts with their Key Impact Pathways (Scientific/Societal/Economic). Do NOT list every single output, outcome, impact, objective, and KER. RADICALLY SELECT only the most important. No bullet points — write flowing prose.

## 5. EU Added Value & Relevance
MAXIMUM 100 WORDS. Mention EU policy alignment ONLY if the user wrote about it. 2-4 sentences maximum. If no EU relevance content exists in the project, write: "Not yet defined in the project."

STRICT FORMATTING RULES:
- NO bullet points (*, -, •) anywhere in the summary — write ONLY flowing prose paragraphs
- NO bold text (**) anywhere
- NO numbered sub-lists within sections
- Each section is 1-2 short paragraphs of prose, nothing more
- Use ## headings ONLY for the 5 section titles
- Preserve the user's terminology where possible but CONDENSE drastically
- Do NOT copy-paste entire paragraphs from the project — REPHRASE and SHORTEN
- If data for a section does not exist, write: "Not yet defined in the project."
- NEVER add content that is not in the project data
- NO preamble before section 1, NO closing after section 5

INTERVENTION LOGIC IN SUMMARY:
Even within the 800-word limit, the summary MUST reflect the intervention logic chain:
problem → solution → expected results. Do not write the sections as isolated blocks.
The reader must see the golden thread connecting all parts.
`
};

// ───────────────────────────────────────────────────────────────
// TRANSLATION RULES — EN only
// ───────────────────────────────────────────────────────────────

export const TRANSLATION_RULES: Record<string, string[]> = {
  en: [
    'Translate all text values to British English',
    'Keep JSON structure identical — do not add/remove keys',
    'Maintain professional EU project terminology',
    'Keep citations in original format (Author, Year)',
    'Do not translate proper nouns, organization names, or acronyms',
    'Preserve all dates in YYYY-MM-DD format',
    'Translate technical terms accurately with domain-specific vocabulary',
  ]
};

// ───────────────────────────────────────────────────────────────
// TEMPORAL INTEGRITY RULE — EN only
// ───────────────────────────────────────────────────────────────

export const TEMPORAL_INTEGRITY_RULE: Record<string, string> = {
  en: `═══ TEMPORAL INTEGRITY RULE (SUPREME — OVERRIDES ALL OTHER SCHEDULING) ═══

★★★ THIS IS THE #1 MOST IMPORTANT RULE IN THE ENTIRE PROMPT. ★★★
ANY DATE VIOLATION MAKES THE ENTIRE OUTPUT INVALID AND UNUSABLE.

THE IRON LAW:
The Project Management WP (LAST WP) = the MAXIMUM TEMPORAL ENVELOPE.
NOTHING in the entire project may have a date outside this envelope.

PROJECT BOUNDARIES (ABSOLUTE, NON-NEGOTIABLE):
  Start: {{projectStart}}
  End:   {{projectEnd}}
  Duration: {{projectDurationMonths}} months exactly

FORMAL CONSTRAINTS:
1. PM WP (last WP): starts EXACTLY {{projectStart}}, ends EXACTLY {{projectEnd}}.
2. Dissemination WP (second-to-last): starts EXACTLY {{projectStart}}, ends EXACTLY {{projectEnd}}.
   - Dissemination WP MUST NOT extend even 1 day beyond PM WP.
   - Both WPs end on the SAME date: {{projectEnd}}.
3. ALL tasks across ALL WPs: startDate ≥ {{projectStart}} AND endDate ≤ {{projectEnd}}.
4. ALL milestones: date ≥ {{projectStart}} AND date ≤ {{projectEnd}}.
5. Content/technical WPs: each covers only a PHASE, NONE spans the full duration.

COMMON AI MISTAKES — YOU MUST AVOID THESE:
✗ Dissemination WP ending 1–3 months AFTER PM WP → WRONG. They end SAME day.
✗ "Final report" task scheduled after {{projectEnd}} → WRONG. Must be ON or BEFORE.
✗ Exploitation tasks extending beyond project → WRONG. All within envelope.
✗ 28-month schedule for 24-month project → WRONG. Count precisely.
✗ Last task of Dissemination ending later than last task of PM → WRONG. NEVER.

SELF-CHECK (MANDATORY before returning JSON):
For EVERY task: is endDate ≤ {{projectEnd}}? If NO → set it to {{projectEnd}} or earlier.
For EVERY milestone: is date ≤ {{projectEnd}}? If NO → set it to {{projectEnd}} or earlier.
Does PM WP last task end exactly on {{projectEnd}}? Must be YES.
Does Dissemination last task end ≤ {{projectEnd}}? Must be YES.

VIOLATION OF ANY OF THE ABOVE = ENTIRE JSON IS REJECTED.
═══════════════════════════════════════════════════════════════════`
};

// ───────────────────────────────────────────────────────────────
// CONSORTIUM AND PARTNER ALLOCATION RULES — ★ v7.0 NEW (Section 16)
// ───────────────────────────────────────────────────────────────

export const CONSORTIUM_ALLOCATION_RULES = `═══ CONSORTIUM AND PARTNER ALLOCATION RULES ═══

If partner data is available in the project context:
1. Every WP MUST have a designated WP Leader (a specific partner).
2. Every Task SHOULD indicate which partner(s) are responsible.
3. The Project Management WP Leader MUST be the coordinating organisation (CO/P1).
4. Partner allocation should reflect geographic and competence diversity.
5. No single partner should lead more than 40% of WPs (unless justified by scope).

If partner data is NOT available:
- Use placeholder references: "Lead Partner", "Partner 2", etc.
- Flag with: "[Assign partner: <competence needed>]"
═══════════════════════════════════════════════════════════════════`;

// ───────────────────────────────────────────────────────────────
// RESOURCE COHERENCE RULES — ★ v7.0 NEW (Section 17)
// ───────────────────────────────────────────────────────────────

export const RESOURCE_COHERENCE_RULES = `═══ RESOURCE COHERENCE RULES (conditional — when budget data is present) ═══

If the project includes budget or person-month data:
1. Person-months per WP should be proportional to its scope and duration.
2. Project Management WP typically consumes 5–10% of total person-months.
3. Dissemination WP typically consumes 8–15% of total person-months.
4. No single content WP should exceed 30% of total person-months unless justified.
5. LUMP SUM RULE: If budget is specified, deliverables and activities must be
   achievable within the allocated resources and strictly tied to 100% completion
   verified by binary indicators.
═══════════════════════════════════════════════════════════════════`;

// ───────────────────────────────────────────────────────────────
// OPENROUTER SYSTEM PROMPT — ★ v7.0: Added JSON edge-case rules
// ───────────────────────────────────────────────────────────────

export const OPENROUTER_SYSTEM_PROMPT = `You are a professional EU project proposal writing assistant with deep expertise in EU funding programmes (Horizon Europe, Interreg, Erasmus+, LIFE, Digital Europe, etc.).

RESPONSE FORMAT RULES:
1. You MUST respond with valid JSON only.
2. No markdown, no code fences, no explanations — just the raw JSON object or array.
3. Do NOT wrap your response in \`\`\`json ... \`\`\` or any other formatting.
4. The JSON must be parseable by JSON.parse() without any preprocessing.
5. All string values must be properly escaped (no unescaped newlines, quotes, or backslashes).
6. Follow the exact schema/structure specified in the user prompt.

JSON INTEGRITY RULES:
- All string values containing line breaks MUST use \\n
- Quotation marks inside strings MUST be escaped as \\"
- Do NOT use trailing commas in arrays or objects
- Do NOT use single quotes — JSON requires double quotes only
- Empty arrays [] are preferred over null`;
// ═══════════════════════════════════════════════════════════════════
// EXPORTED ACCESSOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════
// These are the ONLY way other files should access rules from this file.
// Every function checks for global overrides first (via globalInstructionsService).
// Language parameter is accepted for API compatibility but IGNORED for content
// (always returns .en) — EXCEPT getLanguageDirective() which respects language.
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns the language directive for the given language.
 * ★ THIS IS THE ONLY FUNCTION THAT RESPECTS THE LANGUAGE PARAMETER ★
 * 'en' → write in English directive, 'si' → write in Slovenian directive.
 */
export function getLanguageDirective(language: string): string {
  const override = getGlobalOverrideSync('languageDirective');
  if (override) return override;
  return LANGUAGE_DIRECTIVES[language] || LANGUAGE_DIRECTIVES['en'];
}

/**
 * Returns the Intervention Logic Framework context.
 * Injected into EVERY prompt as foundational context.
 */
export function getInterventionLogicFramework(): string {
  const override = getGlobalOverrideSync('interventionLogicFramework');
  if (override) return override;
  return INTERVENTION_LOGIC_FRAMEWORK;
}

/**
 * Returns academic rigor rules. Always returns .en.
 */
export function getAcademicRigorRules(_language?: string): string {
  const override = getGlobalOverrideSync('academicRigorRules');
  if (override) return override;
  return ACADEMIC_RIGOR_RULES.en;
}

/**
 * Returns humanization rules. Always returns .en.
 */
export function getHumanizationRules(_language?: string): string {
  const override = getGlobalOverrideSync('humanizationRules');
  if (override) return override;
  return HUMANIZATION_RULES.en;
}

/**
 * Returns project title rules. Always returns .en.
 */
export function getProjectTitleRules(_language?: string): string {
  const override = getGlobalOverrideSync('projectTitleRules');
  if (override) return override;
  return PROJECT_TITLE_RULES.en;
}

/**
 * Returns mode instructions for the given mode (fill/enhance/regenerate).
 * Always returns .en variant.
 */
export function getModeInstruction(mode: string, _language?: string): string {
  const override = getGlobalOverrideSync(`modeInstruction_${mode}`);
  if (override) return override;
  const modeObj = MODE_INSTRUCTIONS[mode];
  if (!modeObj) return MODE_INSTRUCTIONS['regenerate'].en;
  return modeObj.en;
}

/**
 * Returns quality gates for a given section key.
 * Falls back to _default if no section-specific gates exist.
 * Always returns .en variant.
 */
export function getQualityGates(sectionKey: string, _language?: string): string[] {
  const override = getGlobalOverrideSync(`qualityGates_${sectionKey}`);
  if (override) {
    try {
      return JSON.parse(override);
    } catch {
      return [override];
    }
  }
  const gates = QUALITY_GATES[sectionKey] || QUALITY_GATES['_default'];
  return gates.en || QUALITY_GATES['_default'].en;
}

/**
 * Returns the Cross-Chapter Consistency Gate.
 * Used for final validation across all chapters.
 */
export function getCrossChapterGates(): string[] {
  const override = getGlobalOverrideSync('qualityGates_crossChapter');
  if (override) {
    try {
      return JSON.parse(override);
    } catch {
      return [override];
    }
  }
  return QUALITY_GATES['_crossChapter']?.en || [];
}

/**
 * Returns task instructions for a given section key.
 * Always returns .en variant.
 */
export function getTaskInstruction(sectionKey: string, _language?: string): string {
  const override = getGlobalOverrideSync(`taskInstruction_${sectionKey}`);
  if (override) return override;
  const instruction = SECTION_TASK_INSTRUCTIONS[sectionKey];
  if (!instruction) return '';
  return instruction.en;
}

/**
 * Returns chapter rules for a given chapter key.
 * Chapter keys: chapter1_problemAnalysis, chapter2_projectIdea,
 * chapter3_4_objectives, chapter5_activities, chapter6_results,
 * chapter5b_partners
 */
export function getChapterRules(chapterKey: string, _language?: string): string {
  const override = getGlobalOverrideSync(`chapter_${chapterKey}`);
  if (override) return override;
  return CHAPTERS[chapterKey] || '';
}

/**
 * Returns rules for a specific section by mapping section keys to chapter keys.
 * This is the main function used by geminiService.ts to get chapter-level rules.
 */
export function getRulesForSection(sectionKey: string, _language?: string): string {
  const SECTION_TO_CHAPTER: Record<string, string> = {
    problemAnalysis: 'chapter1_problemAnalysis',
    projectIdea: 'chapter2_projectIdea',
    generalObjectives: 'chapter3_4_objectives',
    specificObjectives: 'chapter3_4_objectives',
    projectManagement: 'chapter5_activities',
    activities: 'chapter5_activities',
    outputs: 'chapter6_results',
    outcomes: 'chapter6_results',
    impacts: 'chapter6_results',
    risks: 'chapter5_activities',
    kers: 'chapter6_results',
    partners: 'chapter5b_partners',
  };

  const chapterKey = SECTION_TO_CHAPTER[sectionKey];
  if (!chapterKey) return '';
  return getChapterRules(chapterKey, _language);
}

/**
 * Returns global rules string.
 */
export function getGlobalRules(): string {
  const override = getGlobalOverrideSync('globalRules');
  if (override) return override;
  return GLOBAL_RULES;
}

/**
 * Returns field-specific rules for a given field key.
 * Always returns .en variant.
 */
export function getFieldRules(fieldKey: string, _language?: string): string {
  const override = getGlobalOverrideSync(`fieldRules_${fieldKey}`);
  if (override) return override;
  const rules = FIELD_RULES[fieldKey];
  if (!rules) return '';
  return rules.en;
}

/**
 * Returns summary rules. Always returns .en.
 */
export function getSummaryRules(_language?: string): string {
  const override = getGlobalOverrideSync('summaryRules');
  if (override) return override;
  return SUMMARY_RULES.en;
}

/**
 * Returns translation rules. Always returns .en.
 */
export function getTranslationRules(_language?: string): string[] {
  const override = getGlobalOverrideSync('translationRules');
  if (override) {
    try {
      return JSON.parse(override);
    } catch {
      return [override];
    }
  }
  return TRANSLATION_RULES.en;
}

/**
 * Returns temporal integrity rule with date placeholders.
 * Always returns .en.
 */
export function getTemporalIntegrityRule(_language?: string): string {
  const override = getGlobalOverrideSync('temporalIntegrityRule');
  if (override) return override;
  return TEMPORAL_INTEGRITY_RULE.en;
}

/**
 * Returns the language mismatch template.
 */
export function getLanguageMismatchTemplate(): string {
  const override = getGlobalOverrideSync('languageMismatchTemplate');
  if (override) return override;
  return LANGUAGE_MISMATCH_TEMPLATE;
}

/**
 * Returns consortium allocation rules.
 */
export function getConsortiumAllocationRules(): string {
  const override = getGlobalOverrideSync('consortiumAllocationRules');
  if (override) return override;
  return CONSORTIUM_ALLOCATION_RULES;
}

/**
 * Returns resource coherence rules.
 */
export function getResourceCoherenceRules(): string {
  const override = getGlobalOverrideSync('resourceCoherenceRules');
  if (override) return override;
  return RESOURCE_COHERENCE_RULES;
}

/**
 * Returns the OpenRouter system prompt.
 */
export function getOpenRouterSystemPrompt(): string {
  const override = getGlobalOverrideSync('openRouterSystemPrompt');
  if (override) return override;
  return OPENROUTER_SYSTEM_PROMPT;
}

/**
 * Builds a complete prompt context block for a given section.
 * This is a convenience function that assembles all relevant rules
 * for a section into a single string. Used internally by geminiService.ts.
 *
 * @param sectionKey - The section being generated
 * @param language - The target language ('en' or 'si')
 * @param mode - The generation mode ('fill', 'enhance', 'regenerate')
 * @param options - Additional context (projectStart, projectEnd, projectDurationMonths, userInput, titleContext)
 * @returns Complete assembled prompt context string
 */
export function buildFullPromptContext(
  sectionKey: string,
  language: string,
  mode: string,
  options?: {
    projectStart?: string;
    projectEnd?: string;
    projectDurationMonths?: number;
    userInput?: string;
    titleContext?: string;
  }
): {
  interventionLogic: string;
  languageDirective: string;
  globalRules: string;
  academicRules: string;
  humanRules: string;
  chapterRules: string;
  taskInstruction: string;
  modeInstruction: string;
  qualityGates: string[];
  temporalRule: string;
  consortiumRules: string;
  resourceRules: string;
  titleRules: string;
} {
  // Get all rule components
  let taskInstr = getTaskInstruction(sectionKey, language);
  let temporalRule = getTemporalIntegrityRule(language);

  // Replace placeholders in task instruction
  if (options?.userInput) {
    taskInstr = taskInstr.replace('{{userInput}}', options.userInput);
  }
  if (options?.titleContext) {
    taskInstr = taskInstr.replace('{{titleContext}}', options.titleContext);
  }
  if (options?.projectStart) {
    taskInstr = taskInstr.replaceAll('{{projectStart}}', options.projectStart);
    temporalRule = temporalRule.replaceAll('{{projectStart}}', options.projectStart);
  }
  if (options?.projectEnd) {
    taskInstr = taskInstr.replaceAll('{{projectEnd}}', options.projectEnd);
    temporalRule = temporalRule.replaceAll('{{projectEnd}}', options.projectEnd);
  }
  if (options?.projectDurationMonths !== undefined) {
    const months = String(options.projectDurationMonths);
    taskInstr = taskInstr.replaceAll('{{projectDurationMonths}}', months);
    temporalRule = temporalRule.replaceAll('{{projectDurationMonths}}', months);
  }

  return {
    interventionLogic: getInterventionLogicFramework(),
    languageDirective: getLanguageDirective(language),
    globalRules: getGlobalRules(),
    academicRules: getAcademicRigorRules(language),
    humanRules: getHumanizationRules(language),
    chapterRules: getRulesForSection(sectionKey, language),
    taskInstruction: taskInstr,
    modeInstruction: getModeInstruction(mode, language),
    qualityGates: getQualityGates(sectionKey, language),
    temporalRule: temporalRule,
    consortiumRules: getConsortiumAllocationRules(),
    resourceRules: getResourceCoherenceRules(),
    titleRules: (sectionKey === 'projectIdea') ? getProjectTitleRules(language) : '',
  };
}
// ═══════════════════════════════════════════════════════════════════
// UTILITY EXPORTS — Type-safe section key lists and validation
// ═══════════════════════════════════════════════════════════════════

/**
 * All valid section keys that have task instructions defined.
 * Used by geminiService.ts to validate incoming section keys.
 */
export const VALID_SECTION_KEYS = [
  'problemAnalysis',
  'projectIdea',
  'generalObjectives',
  'specificObjectives',
  'projectManagement',
  'activities',
  'outputs',
  'outcomes',
  'impacts',
  'risks',
  'kers',
  'partners',
] as const;

export type ValidSectionKey = typeof VALID_SECTION_KEYS[number];

/**
 * Checks whether a given string is a valid section key.
 */
export function isValidSectionKey(key: string): key is ValidSectionKey {
  return VALID_SECTION_KEYS.includes(key as ValidSectionKey);
}

/**
 * Maps section keys to their corresponding chapter keys.
 * Exported for use in geminiService.ts and other services.
 */
export const SECTION_TO_CHAPTER_MAP: Record<string, string> = {
  problemAnalysis: 'chapter1_problemAnalysis',
  projectIdea: 'chapter2_projectIdea',
  generalObjectives: 'chapter3_4_objectives',
  specificObjectives: 'chapter3_4_objectives',
  projectManagement: 'chapter5_activities',
  activities: 'chapter5_activities',
  outputs: 'chapter6_results',
  outcomes: 'chapter6_results',
  impacts: 'chapter6_results',
  risks: 'chapter5_activities',
  kers: 'chapter6_results',
  partners: 'chapter5b_partners',
};

/**
 * All valid chapter keys.
 */
export const VALID_CHAPTER_KEYS = [
  'chapter1_problemAnalysis',
  'chapter2_projectIdea',
  'chapter3_4_objectives',
  'chapter5_activities',
  'chapter6_results',
  'chapter5b_partners',
] as const;

export type ValidChapterKey = typeof VALID_CHAPTER_KEYS[number];

/**
 * All valid partner type values — mirrored from types.ts for instruction-level validation.
 */
export const VALID_PARTNER_TYPES = [
  'faculty',
  'researchInstitute',
  'sme',
  'publicAgency',
  'internationalAssociation',
  'ministry',
  'ngo',
  'largeEnterprise',
  'other',
] as const;

export type InstructionPartnerType = typeof VALID_PARTNER_TYPES[number];

/**
 * Validates that a partner type string is a valid enum value.
 * Used in post-processing to ensure AI-generated partnerType is valid.
 */
export function isValidPartnerType(type: string): type is InstructionPartnerType {
  return VALID_PARTNER_TYPES.includes(type as InstructionPartnerType);
}

/**
 * Returns all available rule keys for the Admin Panel override system.
 * Each key corresponds to a getGlobalOverrideSync() lookup.
 */
export function getAvailableOverrideKeys(): string[] {
  return [
    'languageDirective',
    'interventionLogicFramework',
    'academicRigorRules',
    'humanizationRules',
    'projectTitleRules',
    'modeInstruction_fill',
    'modeInstruction_enhance',
    'modeInstruction_regenerate',
    'globalRules',
    'summaryRules',
    'translationRules',
    'temporalIntegrityRule',
    'languageMismatchTemplate',
    'consortiumAllocationRules',
    'resourceCoherenceRules',
    'openRouterSystemPrompt',
    // Per-section quality gates
    ...VALID_SECTION_KEYS.map(k => `qualityGates_${k}`),
    'qualityGates_crossChapter',
    // Per-section task instructions
    ...VALID_SECTION_KEYS.map(k => `taskInstruction_${k}`),
    // Per-chapter rules
    ...VALID_CHAPTER_KEYS.map(k => `chapter_${k}`),
    // Per-field rules
    'fieldRules_title',
    'fieldRules_description',
    'fieldRules_indicator',
    'fieldRules_mitigation',
    'fieldRules_exploitationStrategy',
    'fieldRules_mainAim',
    'fieldRules_projectTitle',
    'fieldRules_projectAcronym',
  ];
}
// ═══════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY — exports required by AdminPanel.tsx
// ═══════════════════════════════════════════════════════════════════

/** Labels for chapter keys — used in AdminPanel Instructions editor */
export const CHAPTER_LABELS: Record<string, string> = {
  chapter1_problemAnalysis: 'Chapter 1 — Problem Analysis',
  chapter2_projectIdea: 'Chapter 2 — Project Idea',
  chapter3_4_objectives: 'Chapters 3–4 — Objectives',
  chapter5_activities: 'Chapter 5 — Activities, Management & Risks',
  chapter6_results: 'Chapter 6 — Expected Results & KERs',
  chapter5b_partners: 'Chapter 5B — Partnership (Consortium)',
};

/** Labels for field rule keys — used in AdminPanel Instructions editor */
export const FIELD_RULE_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  indicator: 'Indicator',
  mitigation: 'Mitigation Strategy',
  exploitationStrategy: 'Exploitation Strategy',
  mainAim: 'Main Aim',
  projectTitle: 'Project Title',
  projectAcronym: 'Project Acronym',
};

/** Get full instructions object — used by AdminPanel to display all rules */
export function getFullInstructions(): any {
  return {
    GLOBAL_RULES,
    LANGUAGE_DIRECTIVES,
    LANGUAGE_MISMATCH_TEMPLATE,
    ACADEMIC_RIGOR_RULES,
    HUMANIZATION_RULES,
    PROJECT_TITLE_RULES,
    MODE_INSTRUCTIONS,
    QUALITY_GATES,
    SECTION_TASK_INSTRUCTIONS,
    CHAPTERS,
    FIELD_RULES,
    SUMMARY_RULES,
    TRANSLATION_RULES,
    TEMPORAL_INTEGRITY_RULE,
    INTERVENTION_LOGIC_FRAMEWORK,
    CONSORTIUM_ALLOCATION_RULES,
    RESOURCE_COHERENCE_RULES,
    OPENROUTER_SYSTEM_PROMPT,
  };
}

/** Get default instructions — used by AdminPanel for reset */
export function getDefaultInstructions(): any {
  return getFullInstructions();
}

/** Save app instructions — stores overrides via globalInstructionsService */
export async function saveAppInstructions(instructions: any): Promise<void> {
  // AdminPanel saves via its own admin.saveGlobalInstructions() path
  // This is a no-op placeholder for backward compatibility
  console.log('[Instructions] saveAppInstructions called — AdminPanel handles saving via useAdmin hook');
}

/** Reset app instructions — returns defaults */
export async function resetAppInstructions(): Promise<any> {
  console.log('[Instructions] resetAppInstructions called — returning defaults');
  return getDefaultInstructions();
}

// ═══════════════════════════════════════════════════════════════════
// END OF Instructions.ts v7.0
// ═══════════════════════════════════════════════════════════════════

