// services/Instructions.ts
// ═══════════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH for ALL AI content rules.
// Version 5.0 – 2026-02-17
//
// ARCHITECTURE PRINCIPLE:
//   This file is the ONLY place where content rules are defined.
//   geminiService.ts reads from here — it has ZERO own rules.
//   Anything changed here IS THE LAW — no exceptions.
//
// CHANGES v5.0:
//   - EN-ONLY REFACTORING: All .si variants REMOVED from every constant
//     EXCEPT LANGUAGE_DIRECTIVES (which tells AI "write in Slovenian").
//   - All getter functions now ALWAYS return .en regardless of language param.
//   - getLanguageDirective() is the ONLY function that respects language param.
//   - Token savings: ~45,000 bytes removed (SI duplicates).
//   - AdminPanel.tsx buildDefaultInstructions() shows EN only.
//   - geminiService.ts remains UNCHANGED.
//   - All previous v4.6 changes preserved.
//
// CHANGES v4.6:
//   - Global Instructions override integration via globalInstructionsService.ts
//   - Every exported accessor function checks getGlobalOverrideSync() first.
//
// English-only rules — AI interprets in English regardless of output language.
// LANGUAGE_DIRECTIVES tells the AI which language to WRITE in.
// ═══════════════════════════════════════════════════════════════════

import { storageService } from './storageService';
import { getGlobalOverrideSync } from './globalInstructionsService.ts';

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
// LANGUAGE MISMATCH TEMPLATE — remains unchanged (string template)
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
// HUMANIZATION RULES — EN only
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
   - Instead use direct, specific language a senior consultant would write.

3. PROFESSIONAL IMPERFECTION
   - Do NOT give every list item the same sentence structure or sentence count.
   - Vary description lengths slightly: some items 3 sentences, others 4 or 5.
   - Use occasional parenthetical remarks (like this) and em-dashes — for asides.

4. CONCRETE OVER ABSTRACT
   - Replace every abstract statement with a concrete, specific one.
   - WRONG: "Various stakeholders will benefit from improved digital capacities."
   - RIGHT: "Municipal energy managers in 12 partner regions will gain hands-on
     experience with the GridSense dashboard, reducing anomaly response time
     from 48 hours to under 4 hours."

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
      'No banned AI phrases (leverage, synergy, holistic, foster, cutting-edge, etc.)',
      'Sentence lengths vary — no 3+ consecutive sentences of similar length',
    ]
  },
  projectIdea: {
    en: [
      'projectTitle is a concise noun phrase (30–200 chars), NO acronym, NO full sentence',
      'projectAcronym is 3–8 uppercase letters, derived from projectTitle keywords, is pronounceable or a recognisable abbreviation, and is NOT a generic word (e.g., PROJECT, EUROPE)',
      'State of the Art references ≥3 specific existing projects/studies with names and years',
      'Proposed Solution BEGINS with a 5–8 sentence introductory paragraph BEFORE any phases',
      'Proposed Solution phases use plain text headers (no ** or ## markdown)',
      'Main Aim is one comprehensive sentence starting with an infinitive verb',
      'At least 3 relevant EU policies listed with specific alignment descriptions',
      'All readiness levels include a specific justification (not just the number)',
      'All cited projects and policies are real and verifiable — no fabricated names',
      'No banned AI phrases — write like a senior human consultant',
      'Sentence lengths and structures vary naturally throughout',
    ]
  },
  activities: {
    en: [
      'The LAST WP (highest number) is "Project Management and Coordination" — NOT any other topic',
      'The SECOND-TO-LAST WP is "Dissemination, Communication and Exploitation"',
      'WP1 is a foundational/analytical WP — NOT project management',
      'Total number of WPs is between 6 and 10',
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
      'Every deliverable indicator is specific and measurable — includes quantity, format, and verification method',
      'Project Management WP spans the ENTIRE project duration (M1 to final month)',
      'Dissemination WP spans the ENTIRE project duration (M1 to final month)',
      'No content/technical WP spans the entire project — each covers a specific phase',
      'Tasks within each WP are sequential or staggered — NOT all sharing identical start and end dates',
      'NO task endDate exceeds the project end date ({{projectEnd}})',
      'NO milestone date exceeds the project end date ({{projectEnd}})',
      'Final reporting task and closing milestone are scheduled ON or BEFORE the project end date',
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
      'No banned AI phrases (leverage, synergy, holistic, foster, cutting-edge, etc.)',
      'Sentence lengths vary — no 3+ consecutive sentences of similar length',
    ]
  }
};

// ───────────────────────────────────────────────────────────────
// SECTION TASK INSTRUCTIONS — EN only
// ───────────────────────────────────────────────────────────────

export const SECTION_TASK_INSTRUCTIONS: Record<string, Record<string, string>> = {
  problemAnalysis: {
    en: `USER INPUT FOR CORE PROBLEM:
{{userInput}}

TASK: Based STRICTLY on the USER INPUT ABOVE, create (or complete) a detailed problem analysis.

MANDATORY:
- Title and description MUST be directly related to user's input.
- Do NOT invent unrelated topics.
- Every CAUSE: title + 3–5 sentence description + at least 1 citation from REAL source.
- Every CONSEQUENCE: title + 3–5 sentence description + at least 1 citation from REAL source.
- Core problem MUST include a quantitative indicator.
- NEVER write generic descriptions without evidence.
- If unknown: "[Insert verified data: <description>]".
- NO markdown (**, ##, \`).
- Write like an experienced human consultant — vary sentence structures.`
  },
  projectIdea: {
    en: `{{titleContext}}Based on the problem analysis, develop (or complete) a comprehensive project idea.

ACRONYM RULES (projectAcronym field):
- Generate a project ACRONYM derived from the key words of the projectTitle.
- LENGTH: 3–8 uppercase letters. Example: "GREENTRANS", "DIGI-CRAFT", "ALPSUST".
- The acronym MUST be pronounceable or a recognisable abbreviation.
- The acronym MUST NOT be a generic word (e.g., "PROJECT", "EUROPE", "DIGITAL").
- The acronym MUST NOT duplicate the full title — it is a SHORT code.
- If the title contains a geographic or thematic keyword, try to include it.
- Hyphens are allowed (e.g., "DIGI-CRAFT") but not required.
- Place the acronym ONLY in the "projectAcronym" field — NOT inside projectTitle.

MANDATORY:
- State of the Art MUST reference at least 3 REAL existing projects/studies with names and years.
- Proposed Solution MUST BEGIN with a COMPREHENSIVE INTRODUCTORY PARAGRAPH (5–8 sentences) before phases.
- Phase headers: plain text "Phase 1: Title" — NOT "**Phase 1: Title**".
- EU policies must be real and verifiable.
- If unknown project: "[Insert verified project: <topic>]".
- NO markdown (**, ##, \`).
- Write like an experienced human consultant — vary sentences, avoid AI phrases.`
  },
  generalObjectives: {
    en: 'Define 3–5 general objectives.\nMANDATORY: Title MUST use INFINITIVE VERB (e.g., "Strengthen…", "Develop…"). At least 3 substantive sentences. No markdown. Vary sentence structures.'
  },
  specificObjectives: {
    en: 'Define at least 5 S.M.A.R.T. objectives.\nMANDATORY: Title MUST use INFINITIVE VERB (e.g., "Develop…", "Increase…"). Measurable KPI. No markdown. Vary sentence structures.'
  },
  projectManagement: {
    en: `Create a DETAILED project management section with TWO distinct parts:

PART 1 — DESCRIPTION FIELD (projectManagement.description):
This is the MAIN content field. It MUST contain a comprehensive text (minimum 500 words) covering ALL of the following:
1. MANAGEMENT STRUCTURE – Roles with EU abbreviations: PK, UO, SO, VDS. Responsibilities and authority of each.
2. DECISION-MAKING MECHANISMS – Operational, strategic, escalation levels. Voting, quorum, meeting frequency.
3. QUALITY ASSURANCE – Internal reviews, peer evaluations, external audits, benchmarks, reporting standards.
4. RISK MANAGEMENT APPROACH – Identification, assessment, monitoring, mitigation. Reference risk register (5C).
5. INTERNAL COMMUNICATION – Tools, schedules, reporting chains, document management.
6. CONFLICT RESOLUTION – Escalation: informal → mediation by coordinator → formal arbitration.
7. DATA MANAGEMENT AND OPEN SCIENCE – FAIR principles, access types, repository details.
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
- WP1: foundational/analytical (e.g., "Baseline Analysis and Needs Assessment")
- WP2–WP(N-2): content/thematic work packages in logical sequence
- WP(N-1) (second-to-last): "Dissemination, Communication and Exploitation of Results"
- WP(N) (last): "Project Management and Coordination"

WP DURATION RULES (MANDATORY):
- "Project Management and Coordination" WP MUST span the ENTIRE project duration — from the first month (M1) to the final month.
- "Dissemination, Communication and Exploitation" WP MUST also span the ENTIRE project duration — from M1 to the final month.
- Content/thematic WPs (WP1 to WP(N-2)) should be SEQUENTIAL with partial overlaps. Example for a 36-month project: WP1 covers M1–M10, WP2 covers M6–M18, WP3 covers M14–M26, WP4 covers M22–M34, etc.
- NO content/thematic WP should span the entire project duration.
- Tasks WITHIN each WP must be sequential or staggered — do NOT give all tasks in a WP the same startDate and endDate.

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

DELIVERABLE FIELDS (MANDATORY):
- Each deliverable MUST have THREE separate fields:
  1. "title" — a concise noun phrase (3–10 words), e.g., "Stakeholder Engagement Report"
  2. "description" — 2–4 substantive sentences explaining what the deliverable contains, its format, scope, and intended audience. Do NOT just repeat the title.
  3. "indicator" — a SPECIFIC and MEASURABLE verification criterion. Include: quantity/format (e.g., "1 PDF report"), scope (e.g., "covering all 12 partner regions"), and verification method (e.g., "reviewed and approved by the Steering Committee").
- WRONG indicator: "Report delivered" (too vague)
- RIGHT indicator: "1 PDF report (min. 40 pages) covering baseline data from 12 regions, peer-reviewed by 2 external experts and approved by the Steering Committee by M10"

TASKS:
- Each WP must have 2–5 tasks.
- Each task: id, title, description (2–4 sentences), startDate, endDate, dependencies.
- Task descriptions should explain methodology, not just restate the title.

MILESTONES:
- Each WP must have at least 1 milestone.
- Milestone date in YYYY-MM-DD format. Place at logical completion points.

No markdown. Write like an experienced EU project consultant.`
  },
  outputs: {
    en: `Generate 5–8 concrete project outputs (direct deliverables).
Each output: title (result-oriented noun phrase), description (3–5 sentences, mentions specific WP link), measurable indicator.
Title MUST be a result-oriented noun phrase: "Digital Competence Curriculum" NOT "Develop a curriculum".
No markdown. Vary sentence structures.`
  },
  outcomes: {
    en: `Generate 4–6 medium-term project outcomes (changes resulting from outputs).
Each outcome: title (result-oriented noun phrase), description (3–5 sentences), indicator with target value and timeline.
Title MUST be result-oriented noun phrase: "Increased Digital Literacy Among Rural Youth" NOT "Increase digital literacy".
No markdown. Vary sentence structures.`
  },
  impacts: {
    en: `Generate 3–5 long-term strategic impacts aligned with EU policy objectives.
Each impact: title (result-oriented noun phrase), description (3–5 sentences linking to EU goals), indicator with baseline and target.
Title MUST be result-oriented noun phrase: "Enhanced Cross-Border Innovation Ecosystem" NOT "Enhance the ecosystem".
No markdown. Vary sentence structures.`
  },
  risks: {
    en: `Generate 8–12 project risks across ALL FOUR categories:
- technical (technology failures, integration issues)
- social (stakeholder resistance, low engagement)
- economic (budget overruns, market changes)
- environmental (climate events, regulatory changes, environmental compliance)

Each risk: id, category (lowercase: technical/social/economic/environmental), title, description (2–4 sentences), likelihood (low/medium/high), impact (low/medium/high), mitigation strategy (2–4 sentences).
Use NOUN PHRASES for titles: "Insufficient Partner Engagement" NOT "Partners might not engage".
No markdown. Vary sentence structures.`
  },
  kers: {
    en: `Generate 4–6 Key Exploitable Results (KERs).
Each KER: id, title (specific noun phrase — the product/asset name), description (3–5 sentences about what it is, who will use it, and how it differs from existing solutions), exploitation strategy (3–5 sentences detailing commercialisation, licensing, open-access, or policy integration plan).
Title MUST be a specific asset/product name: "GreenGrid Decision Support Tool" NOT "Development of a tool".
No markdown. Vary sentence structures.`
  }
};

// ───────────────────────────────────────────────────────────────
// CHAPTERS (long-form rules for each section) — EN only (unchanged)
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
- Consequences must show the chain: local → regional → national → EU impact.`,

  chapter2_projectIdea: `CHAPTER 2 — PROJECT IDEA

The Project Idea translates the problem analysis into a proposed intervention.

STRUCTURE:
1. Main Aim — ONE comprehensive sentence starting with an infinitive verb.
2. State of the Art — references to at least 3 REAL existing projects/studies.
3. Proposed Solution — begins with 5–8 sentence overview paragraph, then phases.
4. Readiness Levels — TRL, SRL, ORL, LRL with justifications.
5. EU Policies — at least 3 relevant EU policies with alignment descriptions.
6. Project Acronym — a short, memorable code (3–8 uppercase letters) derived from the project title keywords.

TITLE RULES:
- Project title: noun phrase, 30–200 characters, no acronym, no verb.
- Project acronym: 3–8 uppercase letters, pronounceable or recognisable, placed ONLY in projectAcronym field.`,

  chapter3_4_objectives: `CHAPTERS 3–4 — OBJECTIVES

General Objectives (3–5):
- Each title uses INFINITIVE VERB: "Strengthen…", "Develop…", "Enhance…"
- Each description: 3–5 sentences linking to broader EU goals.

Specific Objectives (≥5):
- S.M.A.R.T. format: Specific, Measurable, Achievable, Relevant, Time-bound.
- Each title uses INFINITIVE VERB.
- Each must have a measurable KPI indicator.`,

  chapter5_activities: `CHAPTER 5 — ACTIVITIES, MANAGEMENT AND RISKS

SECTION 5A — PROJECT MANAGEMENT (projectManagement):
The projectManagement object has TWO parts:
1. description field — detailed narrative (≥500 words) covering management structure,
   decision-making, quality assurance, risk management, communication, conflict resolution,
   data management. Written as prose paragraphs separated by \\n\\n. Each topic gets its own paragraph
   with a plain-text header on the first line. Structure fields contain ONLY short labels for the organigram.
2. structure fields — short role labels (5–8 words max) for organigram chart display.

SECTION 5B — WORK PLAN (activities):
Between 6 and 10 work packages (WPs):
- WP1: foundational/analytical (NOT project management)
- WP2 to WP(N-2): content/thematic WPs in logical sequence
- WP(N-1): Dissemination, Communication and Exploitation of Results — spans ENTIRE project (M1–final month)
- WP(N): Project Management and Coordination — spans ENTIRE project (M1–final month)

Content/thematic WPs are sequential with overlaps — none spans the entire project.
Tasks within each WP are sequential or staggered, not all identical dates.

Each WP: id (WP1, WP2…), title (noun phrase), tasks (2–5 each), milestones (≥1), deliverables (≥1).
Each task: id (T1.1, T1.2…), title, description, startDate, endDate, dependencies.
Each deliverable: id, title (noun phrase), description (2–4 sentences), indicator (specific, measurable).
All task dates in YYYY-MM-DD.

Task dependencies are MANDATORY:
- T1.1 has no dependencies.
- Every other task has ≥1 dependency with predecessorId and type (FS/SS/FF/SF).
- Cross-WP dependencies must exist.

TITLE FORMAT:
- WP, task, milestone, deliverable titles: NOUN PHRASES.
- NOT infinitive verbs.

SECTION 5C — RISK REGISTER (risks):
8–12 risks across categories: technical, social, economic, environmental.
Each: id, category (lowercase), title, description, likelihood, impact, mitigation.`,

  chapter6_results: `CHAPTER 6 — EXPECTED RESULTS AND KEY EXPLOITABLE RESULTS

SECTION 6A — OUTPUTS (5–8 direct deliverables)
Title format: result-oriented noun phrase.

SECTION 6B — OUTCOMES (4–6 medium-term changes)
Title format: result-oriented noun phrase.

SECTION 6C — IMPACTS (3–5 long-term strategic changes)
Title format: result-oriented noun phrase.
Must link to EU policy objectives.

SECTION 6D — KEY EXPLOITABLE RESULTS (4–6 KERs)
Title format: specific asset/product name (noun phrase).
Each includes exploitation strategy.`
};

// ───────────────────────────────────────────────────────────────
// GLOBAL RULES — unchanged (already EN only)
// ───────────────────────────────────────────────────────────────

export const GLOBAL_RULES = `
1. All content must be directly relevant to the specific project context.
2. Every claim must be evidence-based with verifiable citations.
3. No markdown formatting (**, ##, \`) in any output text.
4. Write like an experienced human EU project consultant.
5. Vary sentence structures and lengths — no AI-pattern repetition.
6. No banned AI phrases (see HUMANIZATION RULES).
7. If a data point is uncertain, use "[Insert verified data: ...]".
8. Dates must be in YYYY-MM-DD format.
9. All content must support the intervention logic chain: Problem → Objectives → Activities → Results.
10. Quantify wherever possible — no vague statements.
`;

// ───────────────────────────────────────────────────────────────
// FIELD-SPECIFIC RULES — EN only
// ───────────────────────────────────────────────────────────────

export const FIELD_RULES: Record<string, Record<string, string>> = {
  title: {
    en: 'Generate a concise, professional title. Follow the title format rules for this section type.'
  },
  description: {
    en: 'Generate a detailed professional description. Minimum 3 substantive sentences. Include evidence and citations where appropriate. No markdown.'
  },
  indicator: {
    en: 'Generate a specific, measurable indicator. Include target value, timeline, and verification method. Example: "23% increase in digital literacy scores among 500 participants by M24, measured via pre/post assessment."'
  },
  mitigation: {
    en: 'Generate a detailed risk mitigation strategy. 2–4 sentences covering preventive measures, contingency plans, responsible parties, and monitoring triggers.'
  },
  exploitationStrategy: {
    en: 'Generate a detailed exploitation strategy. 3–5 sentences covering commercialisation pathway, target market, IPR approach, sustainability plan, and scaling potential.'
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
// SUMMARY RULES — EN only
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
MAXIMUM 150 WORDS. Describe the solution concept in 2-3 sentences. List work packages ONLY by name in one sentence (e.g., "The project is structured into 6 work packages covering baseline analysis, agent development, digital twin validation, pilot demonstrations, dissemination, and project management."). Do NOT describe each WP in detail. No bullet points.

## 4. Key Results & Impact
MAXIMUM 200 WORDS. Mention only the 3-4 MOST SIGNIFICANT outputs/deliverables in 1-2 sentences. State 2-3 key measurable outcomes. State 2-3 long-term impacts. Do NOT list every single output, outcome, impact, objective, and KER. RADICALLY SELECT only the most important. No bullet points — write flowing prose.

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
// OPENROUTER SYSTEM PROMPT — unchanged (already EN only)
// ───────────────────────────────────────────────────────────────

export const OPENROUTER_SYSTEM_PROMPT = `You are a professional EU project proposal writing assistant with deep expertise in EU funding programmes (Horizon Europe, Interreg, Erasmus+, LIFE, Digital Europe, etc.).

RESPONSE FORMAT RULES:
1. You MUST respond with valid JSON only.
2. No markdown, no code fences, no explanations — just the raw JSON object or array.
3. Do NOT wrap your response in \`\`\`json ... \`\`\` or any other formatting.
4. The JSON must be parseable by JSON.parse() without any preprocessing.
5. All string values must be properly escaped (no unescaped newlines, quotes, or backslashes).
6. Follow the exact schema/structure specified in the user prompt.`;

// ───────────────────────────────────────────────────────────────
// EXPORTED ACCESSOR FUNCTIONS
// ★ v5.0: All functions ALWAYS return .en (except getLanguageDirective)
// ───────────────────────────────────────────────────────────────

export const getAppInstructions = (language: 'en' | 'si' = 'en') => ({
  GLOBAL_RULES: getGlobalOverrideSync('GLOBAL_RULES') || GLOBAL_RULES,
  CHAPTERS: (() => {
    const overridden: Record<string, string> = {};
    for (const key of Object.keys(CHAPTERS)) {
      overridden[key] = getGlobalOverrideSync(`CHAPTERS.${key}`) || CHAPTERS[key];
    }
    return overridden;
  })()
});

export const getFieldRule = (fieldName: string, language: 'en' | 'si' = 'en'): string => {
  return getGlobalOverrideSync(`FIELD_RULES.${fieldName}.en`) || FIELD_RULES[fieldName]?.en || '';
};

export const getTranslationRules = (language: 'en' | 'si' = 'en'): string[] => {
  const override = getGlobalOverrideSync(`TRANSLATION_RULES.en`);
  if (override) return override.split('\n').filter((line: string) => line.trim().length > 0);
  return TRANSLATION_RULES.en;
};

export const getSummaryRules = (language: 'en' | 'si' = 'en'): string => {
  return getGlobalOverrideSync(`SUMMARY_RULES.en`) || SUMMARY_RULES.en;
};

// ★ ONLY function that respects language parameter
export const getLanguageDirective = (language: 'en' | 'si' = 'en'): string => {
  return getGlobalOverrideSync(`LANGUAGE_DIRECTIVES.${language}`) || LANGUAGE_DIRECTIVES[language] || LANGUAGE_DIRECTIVES.en;
};

export const getLanguageMismatchNotice = (
  detectedLang: 'en' | 'si',
  targetLang: 'en' | 'si'
): string => {
  const langNames: Record<string, string> = { en: 'English', si: 'Slovenian' };
  return LANGUAGE_MISMATCH_TEMPLATE
    .replace(/{{detectedName}}/g, langNames[detectedLang])
    .replace(/{{targetName}}/g, langNames[targetLang]);
};

export const getAcademicRigorRules = (language: 'en' | 'si' = 'en'): string => {
  return getGlobalOverrideSync(`ACADEMIC_RIGOR_RULES.en`) || ACADEMIC_RIGOR_RULES.en;
};

export const getHumanizationRules = (language: 'en' | 'si' = 'en'): string => {
  return getGlobalOverrideSync(`HUMANIZATION_RULES.en`) || HUMANIZATION_RULES.en;
};

export const getProjectTitleRules = (language: 'en' | 'si' = 'en'): string => {
  return getGlobalOverrideSync(`PROJECT_TITLE_RULES.en`) || PROJECT_TITLE_RULES.en;
};

export const getModeInstruction = (mode: string, language: 'en' | 'si' = 'en'): string => {
  return getGlobalOverrideSync(`MODE_INSTRUCTIONS.${mode}.en`) || MODE_INSTRUCTIONS[mode]?.en || MODE_INSTRUCTIONS.regenerate.en;
};

export const getQualityGate = (sectionKey: string, language: 'en' | 'si' = 'en'): string => {
  const fullOverride = getGlobalOverrideSync(`QUALITY_GATES.${sectionKey}.en`);
  if (fullOverride) return fullOverride;
  const gates = QUALITY_GATES[sectionKey]?.en || QUALITY_GATES._default.en;
  return `═══ QUALITY CHECKLIST ═══\nBefore returning the JSON, verify ALL of the following:\n- ${gates.join('\n- ')}\n═══════════════════════════════════════════════════════════════════`;
};

export const getSectionTaskInstruction = (
  sectionKey: string,
  language: 'en' | 'si' = 'en',
  placeholders: Record<string, string> = {}
): string => {
  let template = getGlobalOverrideSync(`SECTION_TASK_INSTRUCTIONS.${sectionKey}.en`) || SECTION_TASK_INSTRUCTIONS[sectionKey]?.en || '';
  for (const [key, value] of Object.entries(placeholders)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return template;
};

// ═══════════════════════════════════════════════════════════════════
// SETTINGS MODAL SUPPORT — v5.0
// ═══════════════════════════════════════════════════════════════════

export const CHAPTER_LABELS: Record<string, string> = {
  chapter1_problemAnalysis: 'Chapter 1 — Problem Analysis',
  chapter2_projectIdea: 'Chapter 2 — Project Idea',
  chapter3_4_objectives: 'Chapters 3–4 — Objectives',
  chapter5_activities: 'Chapter 5 — Activities, Management & Risks',
  chapter6_results: 'Chapter 6 — Results & KERs',
};

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

const INSTRUCTIONS_VERSION = '5.0';

function buildDefaultInstructions() {
  return {
    version: INSTRUCTIONS_VERSION,
    GLOBAL_RULES: GLOBAL_RULES,
    CHAPTERS: { ...CHAPTERS },
    FIELD_RULES: Object.fromEntries(
      Object.entries(FIELD_RULES).map(([key, val]) => [key, val.en])
    ),
    TRANSLATION_RULES: TRANSLATION_RULES.en.join('\n'),
    SUMMARY_RULES: SUMMARY_RULES.en,
  };
}

export function getDefaultInstructions() {
  return buildDefaultInstructions();
}

export function getFullInstructions() {
  try {
    const saved = storageService.getCustomInstructions();
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      if (parsed && parsed.version === INSTRUCTIONS_VERSION) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Instructions] Could not load saved instructions, using defaults:', e);
  }
  return buildDefaultInstructions();
}

export async function saveAppInstructions(instructions: any): Promise<void> {
  const toSave = { ...instructions, version: INSTRUCTIONS_VERSION };
  await storageService.saveCustomInstructions(toSave);
}

export async function resetAppInstructions(): Promise<any> {
  const defaults = buildDefaultInstructions();
  await storageService.saveCustomInstructions(defaults);
  return defaults;
}
