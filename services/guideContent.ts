// services/guideContent.ts
// ═══════════════════════════════════════════════════════════════
// Contextual Guide Content — step-by-step explanations for users
// v1.1 — 2026-03-02 — Full content for ALL 6 steps EN+SI (replaced placeholders)
// v1.0 — 2026-03-02
// ★ v1.0: Initial version — Problem Analysis + Project Idea
//         Structure prepared for all 6 steps
//         Bilingual: EN + SI
// ═══════════════════════════════════════════════════════════════

// Each guide entry has:
//   whatIsThis    — Short definition
//   whyImportant  — Why it matters (EU context)
//   whatToWrite    — Concrete guidance
//   tips           — Practical tips & common mistakes
//   euContext      — What the EU evaluator expects
//   example        — Brief example or pattern

export interface GuideEntry {
  whatIsThis: string;
  whyImportant: string;
  whatToWrite: string;
  tips: string;
  euContext: string;
  example: string;
}

export interface StepGuide {
  stepTitle: string;
  stepIntro: string;
  fields: Record<string, GuideEntry>;
}

export type GuideLanguage = 'en' | 'si';

// ═══════════════════════════════════════════════════════════════
// ENGLISH
// ═══════════════════════════════════════════════════════════════

var GUIDE_EN: Record<string, StepGuide> = {

  // ─────────────────────────────────────────────────────────────
  // STEP 1: PROBLEM ANALYSIS
  // ─────────────────────────────────────────────────────────────
  problemAnalysis: {
    stepTitle: 'Problem Analysis',
    stepIntro: 'This is the foundation of your entire project proposal. Here you define WHY your project is needed. A strong problem analysis convinces evaluators that you truly understand the issue and that your project addresses a real, evidence-based need. Without a solid problem analysis, the rest of your proposal lacks grounding.',
    fields: {
      coreProblem: {
        whatIsThis: 'The Core Problem is the central issue your project aims to address. It is a clear, concise statement of the main challenge, supported by empirical evidence such as statistics, research findings, and official reports.',
        whyImportant: 'EU evaluators look for proposals that address real, documented problems. A vague or unsupported problem statement immediately weakens your proposal. The core problem sets the stage for everything that follows — your objectives, activities, and expected results must all trace back to this problem.',
        whatToWrite: 'Write a comprehensive description of the problem. Start with the broad context (what is happening at EU/global level), then narrow down to the specific issue your project targets. Include at least 3-5 statistical references or citations from reputable sources (Eurostat, OECD, WHO, EU reports). Describe who is affected and how severely.',
        tips: 'Avoid being too general ("unemployment is a problem") — be specific ("youth unemployment in rural areas of Southern Europe exceeds 35%, compared to the EU average of 14.5%, according to Eurostat 2024"). Always cite your sources. Use the InlineChart feature to visualize key statistics — evaluators appreciate visual evidence. Do NOT present your solution here — this section is only about the PROBLEM.',
        euContext: 'EU evaluators use the problem analysis to assess "Relevance" — typically worth 25-30% of the total score. They check whether the problem is well-defined, evidence-based, clearly affects the target group, and aligns with EU policy priorities. A well-documented problem with solid data can significantly boost your evaluation score.',
        example: 'Example pattern: "According to [Source, Year], [statistic about the problem]. This affects [target group] across [geographic scope], leading to [negative consequences]. Despite efforts such as [existing initiatives], the problem persists because [gap/reason]. Specifically, [more detailed data showing the severity]."',
      },
      causes: {
        whatIsThis: 'Causes are the underlying reasons WHY the core problem exists. These are the root factors — structural, systemic, institutional, or behavioral — that create and perpetuate the problem.',
        whyImportant: 'Identifying causes demonstrates analytical depth. It shows evaluators that you have not just observed the problem, but understand its origins. Each cause you identify should logically connect to activities in your project — you are essentially building the justification for your work packages.',
        whatToWrite: 'List 3-5 distinct causes of the core problem. For each cause, provide a title and a detailed description. Each description should explain the mechanism (how does this cause contribute to the problem?) and provide evidence (data, studies, reports). Causes should be at different levels — e.g., one systemic, one institutional, one related to skills/capacity, one related to awareness.',
        tips: 'Make causes specific and distinct — avoid overlap. Each cause should point toward a specific activity or work package in your project. Think of it as building a "problem tree" — the core problem is the trunk, causes are the roots. If you cannot link a cause to a project activity, it might not belong here. Use academic language but keep it accessible.',
        euContext: 'Evaluators check whether your causes are evidence-based and whether your proposed activities logically address them. A project that identifies 4 causes but only addresses 2 in its activities will lose points for coherence. The cause-activity alignment is a key quality indicator.',
        example: 'Example: Cause title: "Insufficient digital infrastructure in rural educational institutions." Description: "According to the European Commission Digital Economy and Society Index (DESI, 2024), only 38% of rural schools in target regions have broadband connectivity exceeding 100 Mbps, compared to 79% in urban areas. This digital divide limits access to modern educational tools and perpetuates knowledge gaps..."',
      },
      consequences: {
        whatIsThis: 'Consequences are the negative effects that occur BECAUSE the core problem exists. They describe what happens if the problem is not addressed — the cost of inaction.',
        whyImportant: 'Consequences create urgency. They answer the question: "What happens if we do nothing?" This is crucial for convincing evaluators that your project is not just interesting but necessary. Consequences also connect to your Expected Results — your project should demonstrably reduce or eliminate these consequences.',
        whatToWrite: 'Describe 3-5 consequences of the core problem. Cover different dimensions — economic consequences (costs, lost productivity), social consequences (inequality, exclusion), and where relevant, environmental or health consequences. Each consequence should be quantified where possible.',
        tips: 'Be specific and data-driven. Instead of "this leads to economic problems," write "this results in an estimated annual productivity loss of EUR 2.3 billion across the EU-27 (Source, Year)." Connect consequences to EU policy goals — if a consequence undermines a specific EU strategy, mention it. This strengthens the relevance argument.',
        euContext: 'Strong consequences section demonstrates "EU added value" — that the problem has cross-border or systemic implications requiring EU-level intervention. Evaluators prefer consequences that show impact beyond a single country or organization.',
        example: 'Example: Consequence title: "Widening skills mismatch in the digital labor market." Description: "The persistence of this problem directly contributes to the growing digital skills gap identified in the European Skills Agenda. Cedefop (2024) estimates that 42% of EU workers lack basic digital skills, resulting in 3.2 million unfilled ICT positions annually and an estimated GDP loss of EUR 415 billion..."',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STEP 2: PROJECT IDEA
  // ─────────────────────────────────────────────────────────────
  projectIdea: {
    stepTitle: 'Project Idea',
    stepIntro: 'This is where your project takes shape. The Project Idea section transforms the problem you identified into a concrete, innovative solution. Here you define what your project IS — its identity, its approach, its innovation. Evaluators assess whether your idea is original, feasible, and clearly responds to the identified problem.',
    fields: {
      projectTitle: {
        whatIsThis: 'The Project Title is the official name of your project, and the Acronym is its short form (typically 3-8 characters). Together, they form the identity of your project throughout the EU system.',
        whyImportant: 'The title is the first thing evaluators see. It must be professional, descriptive, and memorable. A good title immediately communicates what the project is about. The acronym will be used in all official documents, communications, and the EU project database.',
        whatToWrite: 'Choose a title that clearly communicates the project\'s purpose and scope. It should be specific enough to distinguish your project from others but concise enough to be practical. The acronym should be pronounceable, memorable, and ideally hint at the project\'s focus.',
        tips: 'Avoid generic titles like "Innovation in Education" — be specific: "Digital Competence Accelerator for Rural Educators in Southeast Europe." Do NOT use the word "project" in the title. The acronym should be easy to say and remember — test it verbally. Avoid acronyms that already exist (search CORDIS database). AI can suggest several options — pick the one that resonates best.',
        euContext: 'Evaluators form first impressions from the title. A professional, clear title signals a well-thought-out proposal. The acronym appears in all EU databases (CORDIS, Funding & Tenders Portal) — it becomes your project\'s brand.',
        example: 'Good: "DIGI-RURAL — Accelerating Digital Transformation of Rural Educational Ecosystems in Southeast Europe." Bad: "Project for Improving Digital Skills." The good example is specific (digital transformation + rural + education + SE Europe), memorable (DIGI-RURAL), and action-oriented (Accelerating).',
      },
      mainAim: {
        whatIsThis: 'The Main Aim is a single, comprehensive sentence that encapsulates the entire purpose of your project. It is the overarching goal — what the project ultimately strives to achieve.',
        whyImportant: 'The main aim is the anchor of your proposal. Everything in your project — objectives, activities, results — must align with and contribute to this aim. Evaluators use it to quickly understand your project\'s purpose and check whether the rest of the proposal is coherent.',
        whatToWrite: 'Write ONE clear sentence that starts with "The main aim of [Project Acronym] is to..." This sentence should capture: (1) what you will do, (2) for whom, (3) how (the approach), and (4) what change you expect. Keep it to 2-3 lines maximum.',
        tips: 'Do NOT list multiple aims — there should be one overarching aim. Specific measurable targets go into Specific Objectives (Step 3). The main aim should be ambitious but realistic. Use strong, active verbs (accelerate, transform, bridge, strengthen, establish). Avoid vague language (improve, support, help).',
        euContext: 'The main aim should clearly respond to the EU call objectives. Evaluators check: Does this aim directly address the call priorities? Is it achievable within the project duration and budget? Does it represent genuine EU added value?',
        example: 'Example: "The main aim of DIGI-RURAL is to accelerate the digital transformation of rural educational ecosystems across five Southeast European countries by co-developing, piloting, and scaling an integrated digital competence framework for 2,000 educators, thereby reducing the urban-rural digital skills gap by 40% within the target regions."',
      },
      stateOfTheArt: {
        whatIsThis: 'The State of the Art is a comprehensive review of what currently exists in the field your project addresses. It covers existing projects, products, services, research, and initiatives — and critically identifies what is missing or insufficient.',
        whyImportant: 'This section proves you have done your homework. It shows evaluators that you know the landscape and that your project does not duplicate existing efforts. More importantly, it identifies the GAP — what existing solutions fail to address — which your project will fill.',
        whatToWrite: 'Structure this in three parts: (1) Review of existing solutions, projects, and research in the field — what has been done, by whom, with what results. (2) Critical analysis — what are the limitations, gaps, or failures of existing approaches. (3) How your project will address these gaps. Reference specific EU-funded projects (check CORDIS), academic studies, and existing tools/platforms.',
        tips: 'Do NOT just list existing projects — analyze them critically. For each, explain what it achieved AND what it did not. Show that you have searched CORDIS for related EU projects. If similar projects exist, explain how yours is different/better. Use phrases like "While [Project X] successfully addressed [aspect], it did not tackle [gap], which is precisely where [Your Project] intervenes." Aim for at least 5-8 references.',
        euContext: 'Evaluators specifically check for duplication. If a similar project was already funded and you don\'t mention it, it raises a red flag. Conversely, showing awareness of related projects and clearly differentiating yours demonstrates maturity and credibility. This section also assesses "Innovation" — worth 15-25% of the score.',
        example: 'Example pattern: "Several EU-funded initiatives have addressed digital skills in education, including [Project A] (Erasmus+, 2022-2024) which developed [tool/framework] for [target], and [Project B] (Horizon Europe, 2023-2025) which focused on [aspect]. While these projects made valuable contributions, they share common limitations: (1) focus on urban settings only, (2) lack of integration between technical infrastructure and pedagogical methods, (3) no sustainable scaling mechanism beyond the project lifecycle. DIGI-RURAL addresses all three gaps through its integrated framework..."',
      },
      proposedSolution: {
        whatIsThis: 'The Proposed Solution is the heart of your project — a detailed description of WHAT you will do and HOW you will do it. It describes your innovative approach, methodology, phases, and key activities.',
        whyImportant: 'This is where evaluators assess the quality and feasibility of your approach. They want to see a clear, logical, innovative methodology that convincingly addresses the identified problem and gaps. The proposed solution must be realistic, well-structured, and clearly linked to the problem analysis.',
        whatToWrite: 'Describe your solution in a structured way: (1) The overall approach — what is the core innovation or methodology. (2) Key phases or pillars of the project. (3) How each phase connects to the identified causes. (4) What tools, methods, or frameworks you will use/develop. (5) Who will be involved and how. (6) What makes this approach innovative compared to existing solutions.',
        tips: 'Be specific and concrete — avoid vague promises. Instead of "we will develop a platform," describe "we will develop a modular, open-source digital competence platform with three integrated modules: (1) self-assessment, (2) personalized learning pathways, (3) peer-mentoring network." Show the innovation clearly — what is NEW about your approach? Connect each element of the solution to a specific cause identified in Step 1. This builds the logical chain: Problem → Causes → Solution → Activities.',
        euContext: 'Evaluators look for: (1) Innovation — is this approach genuinely new or significantly improved? (2) Methodology — is the approach scientifically/professionally sound? (3) Feasibility — can this actually be done with the proposed resources and timeline? (4) Coherence — does the solution logically flow from the problem analysis? The methodology is typically assessed under "Quality and efficiency of implementation" — worth 25-30% of the score.',
        example: 'Example structure: "DIGI-RURAL proposes a three-pillar approach to rural digital transformation in education:\n\nPillar 1 — Digital Infrastructure Assessment & Bridging: A systematic assessment of digital readiness in 50 rural schools across 5 countries, followed by targeted interventions...\n\nPillar 2 — Co-Created Competence Framework: Working directly with 200 rural educators through participatory design workshops to develop...\n\nPillar 3 — Sustainable Scaling & Policy Dialogue: Embedding results in national and EU policy frameworks through..."',
      },
      readinessLevels: {
        whatIsThis: 'Readiness Levels measure how mature or developed your proposed solution is at the START of the project. They include TRL (Technology), SRL (Societal), ORL (Organizational), and LRL (Legal/Ethical readiness). You select the current level and provide justification.',
        whyImportant: 'Readiness levels tell evaluators where your project begins and implicitly, where it will end. They help assess feasibility — a TRL 1 project claiming to reach TRL 9 in 24 months is unrealistic. They also help evaluators understand the nature of your project — is it fundamental research, applied development, or market deployment?',
        whatToWrite: 'For each readiness type (TRL, SRL, ORL, LRL), select the level that honestly represents your STARTING position. Then write a justification explaining WHY you selected that level — what evidence supports this assessment. Be honest — inflating levels is counterproductive.',
        tips: 'Most EU-funded Erasmus+ and cooperation projects start at TRL 3-5 and aim for TRL 6-7. Horizon Europe research projects might start at TRL 1-2. SRL is often overlooked but crucial — it shows you have considered societal acceptance. For justifications, reference specific evidence: "We are at TRL 4 because our prototype was validated in lab conditions during the preceding project [Name, Grant ID]." Do NOT skip the justification field — an unjustified level looks arbitrary.',
        euContext: 'Different EU programs target different TRL ranges. Erasmus+ typically supports TRL 3-7 (developing and piloting solutions). Horizon Europe covers the full range. Evaluators cross-check your stated TRL with your activities — if you claim TRL 5 but your activities include "basic concept validation," there is a contradiction.',
        example: 'Example: TRL 4 — "Technology validated in lab." Justification: "The core digital competence assessment tool was developed and tested in controlled conditions during the Erasmus+ project DIGI-TEACH (2022-2024, Grant No. 2022-1-SI01-KA220). Feedback from 45 test users confirmed the validity of the assessment model, but it has not yet been tested in real rural school environments, which is the purpose of DIGI-RURAL."',
      },
      euPolicies: {
        whatIsThis: 'EU Policies are the strategic frameworks, programs, and political priorities that your project aligns with. These include broad strategies (European Green Deal, Digital Decade), sector policies (European Education Area), and program-specific objectives.',
        whyImportant: 'Alignment with EU policies is a core evaluation criterion. It demonstrates that your project contributes to EU strategic goals and has significance beyond your immediate target group. Strong policy alignment significantly boosts your "Relevance" score.',
        whatToWrite: 'Identify 3-6 EU policies that are directly relevant to your project. For each, provide the full official name and a description of how specifically your project aligns with and contributes to that policy. Be concrete — do not just name the policy, explain the connection.',
        tips: 'Always include the policy most directly linked to your EU call (e.g., for Erasmus+ education projects, include the European Education Area communication). Add 2-3 broader strategies (Digital Decade, European Skills Agenda, European Pillar of Social Rights). For each policy, cite specific targets or actions that your project supports. Use exact policy names and publication years. AI can help identify relevant policies based on your project content.',
        euContext: 'Evaluators explicitly check policy alignment, especially with the call objectives. Mentioning the "right" policies shows you understand the EU funding context. However, do NOT just list policies — the description of alignment must be substantive and specific.',
        example: 'Example: Policy: "European Digital Education Action Plan (2021-2027)." Alignment: "DIGI-RURAL directly contributes to Priority Area 1, Action 5 — \'Digital competence frameworks for educators\' — by developing and piloting a contextualized framework specifically designed for rural educational settings, addressing the Action Plan\'s explicit concern about geographic disparities in digital education readiness."',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STEP 3: GENERAL OBJECTIVES (placeholder for next session)
  // ─────────────────────────────────────────────────────────────
  generalObjectives: {
    stepTitle: 'General Objectives',
    stepIntro: 'General objectives define the broad, long-term goals that your project contributes to. These go beyond the project itself and its lifetime — they represent the wider societal, economic, or policy change you aim to support. Think of general objectives as the "big picture" your project fits into. They are not directly measurable within your project but guide its strategic direction.',
    fields: {
      objective: {
        whatIsThis: 'A general objective (GO) is a broad, strategic goal that extends beyond the project\'s direct scope and timeline. It describes the wider change or improvement that the project contributes to — but does not achieve alone. General objectives sit at the top of the "intervention logic" chain: they express the ultimate purpose behind your project\'s existence.',
        whyImportant: 'General objectives connect your project to the larger EU agenda. They demonstrate that your project is not an isolated effort but part of a broader movement toward systemic change. Evaluators use general objectives to assess strategic relevance — does this project contribute to something bigger? Without clear general objectives, a project appears disconnected from EU priorities and may score poorly on relevance. They also provide the framework for measuring long-term impact after the project ends.',
        whatToWrite: 'Define 2-3 general objectives. Each should: (1) Start with "To contribute to..." or "To support..." — signaling that the project contributes to but does not single-handedly achieve this goal. (2) Reference a broad societal or economic outcome — e.g., reducing inequality, strengthening digital capacity, improving policy coherence. (3) Align explicitly with at least one EU strategy, policy, or SDG. (4) Be broad enough that multiple projects could contribute to the same objective. Write a clear title and a description that explains the connection between your project and this broader goal. Include references to EU targets or benchmarks where possible.',
        tips: 'Common mistake: confusing general with specific objectives. General objectives are NOT directly measurable within your project — they describe the wider change your project supports. If you can measure it within 36 months, it is a specific objective, not a general one. Use future-oriented language: "contribute to," "advance," "support the transition toward." Avoid vague statements without context — always tie the objective to a specific EU policy or measurable benchmark (e.g., "contributing to the European Digital Decade target of 80% of adults with basic digital skills by 2030"). Typically, 2-3 general objectives are sufficient — more than 4 dilutes focus. Each general objective should connect to at least 2 specific objectives downstream.',
        euContext: 'Evaluators assess general objectives under the "Relevance" criterion. They check: (1) Does the project address a genuine EU-level challenge? (2) Are the general objectives aligned with the call text and broader EU strategies? (3) Is there a logical link between the general objectives and the specific objectives? (4) Do the general objectives demonstrate EU added value — i.e., can they only be effectively pursued through European cooperation? Strong general objectives typically reference specific EU policy documents, targets, or indicators. Weak ones are vague ("improve education") or disconnected from EU priorities.',
        example: 'Example GO1: "To contribute to reducing the urban-rural digital skills gap in Southeast Europe, in alignment with the European Digital Decade target of 80% of adults possessing at least basic digital skills by 2030 (currently at 54% EU average, with rural areas lagging at 39%)."\n\nExample GO2: "To support the development of inclusive, high-quality digital education ecosystems across EU Member States, as envisaged by the European Education Area Strategic Framework (Council Resolution, 2021) and the Digital Education Action Plan 2021-2027, Priority Area 2."\n\nNote how each GO: (a) starts with "contribute to" / "support," (b) references a specific EU target or policy, (c) includes data where possible, and (d) is clearly broader than what one project can achieve alone.',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STEP 4: SPECIFIC OBJECTIVES (placeholder for next session)
  // ─────────────────────────────────────────────────────────────
  specificObjectives: {
    stepTitle: 'Specific Objectives',
    stepIntro: 'Specific objectives are the operational heart of your intervention logic. They define exactly what your project WILL achieve — concrete, measurable results that you commit to delivering within the project lifetime. Each specific objective should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound) and directly linked to work packages that will deliver it. Together, the specific objectives must be sufficient to achieve your main aim.',
    fields: {
      objective: {
        whatIsThis: 'A specific objective (SO) is a concrete, measurable target that your project will directly achieve within its timeframe. Unlike general objectives (which your project contributes to), specific objectives are commitments — you are saying "we WILL accomplish this." Each SO should be independently verifiable through indicators, deliverables, or measurable changes in the target group.',
        whyImportant: 'Specific objectives are the backbone of your proposal\'s evaluation. They define your project\'s concrete commitments and become the benchmarks against which success is measured. Evaluators use them to assess: (1) Ambition — are you promising meaningful change? (2) Feasibility — can you realistically deliver this? (3) Coherence — do the SOs logically connect to the problem, activities, and results? (4) Measurability — will we know if you succeeded? During project implementation, the EU will monitor progress against your specific objectives. If you fail to achieve them, it affects your final evaluation and potentially your financial settlement.',
        whatToWrite: 'Define 3-5 specific objectives using the SMART framework. For each objective write: (1) A clear title starting with an action verb — "To develop," "To train," "To establish," "To pilot," "To validate." (2) A description that includes: WHAT exactly will be done, WHO will benefit (target group with numbers), WHERE (geographic scope), WHEN (by which project month), and HOW success will be measured. (3) Quantified targets wherever possible — numbers of people trained, tools developed, organizations reached, percentage improvements. Each SO should map to at least one work package. Together, the SOs should cover all major dimensions of your project and be sufficient to achieve the main aim when combined.',
        tips: 'The SMART test — for each objective ask: Specific (is it clear exactly what will be done?), Measurable (what indicator proves achievement?), Achievable (can this realistically be done with the budget and timeline?), Relevant (does it address the problem and causes?), Time-bound (by when?). Common mistakes: (1) Too vague — "To improve digital skills" is not specific enough. (2) Too ambitious — promising to reach 100,000 people with a EUR 400,000 budget is unrealistic. (3) Not measurable — if you cannot define an indicator, rethink the objective. (4) Overlap — each SO should address a distinct aspect. (5) Missing the logic chain — every SO should connect upward to a general objective and downward to at least one work package. Typically, 3-5 specific objectives are ideal. Fewer than 3 suggests insufficient scope; more than 6 suggests lack of focus.',
        euContext: 'Evaluators scrutinize specific objectives intensely — they are assessed under both "Relevance" and "Quality of Implementation." Key checks: (1) Are the SOs genuinely SMART? Evaluators will test each one. (2) Do the SOs collectively address all the causes identified in the problem analysis? If you identified 4 causes but your SOs only address 2, you lose coherence points. (3) Is there a 1:1 or 1:many mapping from SOs to work packages? Every SO must have at least one WP that delivers it. (4) Are the quantified targets realistic given the budget, duration, and consortium? (5) Do the SOs clearly contribute to the general objectives? This upward-downward logic chain (GO -> SO -> WP -> Results) is the "intervention logic" that evaluators follow.',
        example: 'Example SO1: "To co-develop a validated Digital Competence Assessment Framework (DCAF) for rural educators, aligned with DigComp 2.2, through participatory design workshops with 200 educators across 5 countries, completed by project month 14 (WP2)."\n\nExample SO2: "To train and certify 2,000 rural educators (400 per partner country) in digital competence levels B1-B2 using the DCAF methodology, achieving a minimum 70% certification pass rate, by project month 28 (WP3)."\n\nExample SO3: "To establish 25 digital innovation hubs (5 per country) in rural schools as permanent training and resource centers, operational and self-sustaining by project month 30 (WP4)."\n\nExample SO4: "To produce 5 national policy briefs and 1 EU-level policy recommendation document, informed by project evidence and endorsed by at least 10 national stakeholders per country, by project month 34 (WP5)."\n\nNote: each SO has a number, an action verb, a quantified target, a timeframe (project month), and a WP reference.',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STEP 5: ACTIVITIES (placeholder for next session)
  // ─────────────────────────────────────────────────────────────
  activities: {
    stepTitle: 'Activities',
    stepIntro: 'The Activities section is the most complex and comprehensive part of your proposal. It defines HOW your project will be implemented — the management structure, the consortium of partners, the detailed work plan with work packages and tasks, the timeline (Gantt chart), task dependencies (PERT chart), the budget, and risk management. This is where evaluators assess whether your ambitious objectives are matched by a realistic, professional, and well-structured implementation plan.',
    fields: {
      implementation: {
        whatIsThis: 'The Implementation / Project Management section describes HOW your project will be governed, managed, and quality-controlled. It covers the organizational structure, decision-making processes, communication protocols, quality assurance mechanisms, and reporting procedures.',
        whyImportant: 'Management quality is a significant evaluation criterion — typically worth 15-20% of the total score under "Quality and Efficiency of Implementation." Evaluators need confidence that the project will be professionally managed, that decisions will be made efficiently, that risks will be handled, and that the coordinator has the capacity to lead a transnational consortium. Poor management descriptions signal that the project may fail during implementation.',
        whatToWrite: 'Describe the following elements: (1) Governance structure — Steering Committee (composition, meeting frequency, decision-making authority), Advisory Board (external experts), WP Leaders (responsibilities). (2) Decision-making process — how decisions are made (consensus, majority vote), escalation procedures for conflicts. (3) Communication plan — internal (regular meetings, shared platform, reporting cycles) and external (dissemination, stakeholder engagement). (4) Quality assurance — how you monitor progress, ensure deliverable quality, and handle deviations from the plan. (5) Financial management — who manages the budget, how partner financial reports are collected and verified. (6) Reporting — internal reporting frequency, EU reporting milestones.',
        tips: 'Be specific about meeting frequency ("monthly online WP leader meetings, quarterly Steering Committee video conferences, annual in-person consortium meetings"). Name the tools you will use (e.g., "shared project workspace on MS Teams/Moodle, Gantt-based progress tracking"). Define clear roles — the coordinator is not a dictator but a facilitator. Include an escalation procedure: WP Leader -> Coordinator -> Steering Committee -> EU Project Officer. Quality assurance should include peer review of deliverables, external quality audits, and regular progress reporting against milestones.',
        euContext: 'EU evaluators look for: (1) Clear governance with defined roles and responsibilities. (2) Evidence of professional project management methodology. (3) Realistic meeting and reporting schedule. (4) Quality assurance mechanisms that go beyond self-assessment. (5) Conflict resolution procedures. (6) A coordinator with demonstrated capacity. Many projects score well on content but lose points on management — this is a differentiator. Horizon Europe requires specific management deliverables (D1.1: Project Management Plan, etc.).',
        example: 'Example structure: "DIGI-RURAL will employ a three-tier governance model:\n\nTier 1 — Steering Committee (SC): Composed of one senior representative per partner (6 members), chaired by the Coordinator (P1). Meets quarterly via videoconference, with one annual in-person meeting hosted rotationally. Decisions by consensus; if no consensus, simple majority with Coordinator casting vote.\n\nTier 2 — WP Leaders: Each WP led by the most competent partner for that domain. Monthly progress reports to Coordinator. Bi-monthly inter-WP coordination calls.\n\nTier 3 — External Advisory Board (EAB): 5 external experts (policy, technology, pedagogy) providing strategic guidance. Meets bi-annually."',
      },
      organigram: {
        whatIsThis: 'The Organigram is a visual organizational chart showing your project\'s governance structure, reporting lines, and key roles. It provides an at-a-glance understanding of who is responsible for what and how information flows within the project.',
        whyImportant: 'A clear organigram immediately communicates professional project planning. Evaluators can quickly assess whether the governance structure makes sense, whether all partners have clear roles, and whether the reporting lines are logical. It complements the written management description with visual clarity.',
        whatToWrite: 'The organigram is generated automatically from your management structure and partner/WP data. Ensure that: (1) All partners are assigned to at least one WP. (2) WP Leaders are clearly designated. (3) The Coordinator is at the top of the hierarchy. (4) The Steering Committee, Advisory Board, and WP structure are all represented.',
        tips: 'Keep the organigram clean and readable — avoid overcrowding. The standard structure is: Coordinator at top -> Steering Committee -> WP Leaders -> Task Teams. If you have an External Advisory Board, show it as a side element connected to the Steering Committee. Color-code different levels of governance. Ensure the organigram matches your written management description exactly — inconsistencies are red flags for evaluators.',
        euContext: 'Many EU proposal templates specifically request an organigram. Even when not required, including one demonstrates thoroughness. Evaluators compare the organigram with the partner descriptions and WP assignments to check consistency. A well-structured organigram can compensate for a less detailed written description, and vice versa.',
        example: 'Typical structure:\nCoordinator (P1)\n  |\n  +-- Steering Committee (all partners)\n  |     |\n  |     +-- External Advisory Board\n  |\n  +-- WP1 Leader (P1) - Management\n  +-- WP2 Leader (P3) - Research & Development\n  +-- WP3 Leader (P2) - Training & Piloting\n  +-- WP4 Leader (P4) - Dissemination\n  +-- WP5 Leader (P5) - Sustainability & Policy',
      },
      partners: {
        whatIsThis: 'The Partnership (Consortium) section defines which organizations participate in the project, from which countries, with what type of expertise, and in what role. It includes the coordinator, full partners, and optionally associated partners. Each partner has a code (CO, P2, P3...), type classification, expertise description, and person-month (PM) rate.',
        whyImportant: 'The consortium composition is one of the most critical evaluation factors. EU projects are by definition collaborative — they require transnational partnerships with complementary expertise. Evaluators assess whether: (1) The consortium has the right mix of skills to deliver the project. (2) Geographic diversity is adequate. (3) Each partner has a clear, justified role. (4) The consortium includes the right types of organizations (universities, SMEs, NGOs, public bodies). A weak consortium can sink an otherwise excellent proposal.',
        whatToWrite: 'For each partner, define: (1) Code — short identifier (CO for coordinator, P2, P3, etc.). (2) Name — full legal name of the organization. (3) Partner Type — university, research institute, SME, large enterprise, NGO, public authority, etc. (4) Country — for geographic balance assessment. (5) PM Rate — the cost per person-month (typically EUR 4,000-8,000 depending on country and organization type). (6) Expertise — a concise description of what this partner brings to the project and why they are essential.',
        tips: 'Aim for: (1) At least 3 countries represented (most EU calls require this minimum). (2) Mix of partner types — at least one academic/research, one practitioner/implementer, and one with policy/dissemination reach. (3) Geographic balance between Western/Eastern/Northern/Southern Europe where possible. (4) No "silent partners" — every partner must have a substantive role in at least 2 WPs. (5) The coordinator should be the partner with the strongest management capacity, not necessarily the largest. PM rates should be realistic for the country — EUR 7,000/PM for a Slovenian university would be questioned, while EUR 3,000/PM for a German one is suspiciously low.',
        euContext: 'Evaluators specifically look at: (1) Operational capacity — can each partner actually do what is claimed? (2) Complementarity — does the consortium cover all required expertise areas without redundancy? (3) Commitment — are PM allocations realistic? (4) Balance — is the budget fairly distributed or does one partner dominate? (5) EU added value — does the transnational composition enhance the project? In Erasmus+ KA2, a typical consortium has 4-8 partners from at least 3 EU/program countries.',
        example: 'Example consortium:\nCO (Coordinator): University of Ljubljana, Slovenia — Educational sciences, digital pedagogy research, 20+ EU projects managed. PM rate: EUR 5,700.\nP2: Technical University of Munich, Germany — EdTech development, learning analytics. PM rate: EUR 6,800.\nP3: Digital Skills Foundation, Bulgaria — NGO specializing in rural digital literacy programs. PM rate: EUR 4,200.\nP4: Regional Ministry of Education, Croatia — Policy implementation, school network access. PM rate: EUR 5,100.\nP5: EduTech Solutions GmbH, Austria — SME, digital platform development. PM rate: EUR 6,500.',
      },
      workplan: {
        whatIsThis: 'The Work Plan is the operational backbone of your project. It consists of Work Packages (WPs), each containing tasks, milestones, and deliverables. Each WP represents a major thematic area of work, and tasks within WPs define the specific activities to be carried out, by whom, and when.',
        whyImportant: 'The work plan demonstrates that your project is not just a good idea but a well-planned operation. Evaluators assess whether: (1) The WPs logically cover all aspects needed to achieve the objectives. (2) Tasks are realistic in scope and timeline. (3) Milestones provide meaningful checkpoints. (4) Deliverables are concrete and useful. (5) The sequence of work is logical — outputs from early WPs feed into later ones. A poorly structured work plan is one of the most common reasons for low scores.',
        whatToWrite: 'Structure your project into 4-7 Work Packages. Typical structure: WP1 (Project Management), WP2-WPn-1 (Content/Technical WPs), WPn (Dissemination & Exploitation). For each WP: (1) Clear title reflecting the work area. (2) Description of the WP objective. For each Task within a WP: (1) Task ID (T1.1, T1.2...). (2) Title. (3) Description of what will be done. (4) Start and end dates. (5) Dependencies on other tasks. (6) Partner allocations (who contributes how many hours/PM). For each Milestone: date and verification criterion. For each Deliverable: title, description, and quality indicator.',
        tips: 'WP1 (Management) should span the entire project duration and typically consume 5-10% of the budget. The last WP (Dissemination) should also span most of the project. Content WPs should be sequential where logical but can overlap. Each task should be 2-6 months in duration — shorter tasks are micro-management, longer ones lack checkpoints. Every WP should have at least 1 milestone and 1 deliverable. Use AI generation to create an initial workplan, then refine manually. Ensure all partners contribute to at least 2 WPs. Task dependencies should be realistic — avoid having everything depend on one task.',
        euContext: 'Evaluators assess the work plan under "Quality and Efficiency of Implementation." They check: (1) Logical sequencing — do early WPs produce what later WPs need? (2) Appropriate duration — is the timeline realistic? (3) Resource allocation — are enough person-months allocated per task? (4) Milestone quality — are milestones meaningful decision points or just dates? (5) Deliverable quality — are deliverables concrete, useful, and at appropriate intervals? (6) Partner roles — does each partner contribute meaningfully? A Gantt chart and PERT chart are derived from the work plan to visualize these aspects.',
        example: 'Example WP structure:\nWP1 — Project Management & Coordination (M1-M36, Led by CO)\nWP2 — Research & Needs Analysis (M1-M10, Led by P2)\nWP3 — Framework Development & Co-Creation (M6-M18, Led by P3)\nWP4 — Pilot Implementation & Training (M14-M28, Led by P4)\nWP5 — Dissemination, Exploitation & Sustainability (M3-M36, Led by P5)\n\nNote: WP2 feeds into WP3 (research informs development), WP3 feeds into WP4 (framework used in piloting). WP1 and WP5 span most of the project.',
      },
      ganttChart: {
        whatIsThis: 'The Gantt Chart is a horizontal bar chart that visualizes your project timeline. Each task is represented as a bar spanning its start-to-end date, making it easy to see task durations, overlaps, and the overall project flow at a glance.',
        whyImportant: 'A Gantt chart provides immediate visual understanding of your project schedule. Evaluators use it to quickly assess: Is the timeline realistic? Are there bottlenecks (too many tasks starting simultaneously)? Are there gaps (periods with little activity)? Does the project end cleanly or are critical tasks squeezed into the final months?',
        whatToWrite: 'The Gantt chart is generated automatically from your work plan data (task start and end dates). Your role is to ensure: (1) All tasks have realistic start and end dates. (2) Tasks are properly sequenced — dependent tasks start after their prerequisites. (3) The chart looks balanced — no month is overloaded while others are empty. (4) The project management WP spans the entire duration. (5) Dissemination starts early (not in the last 3 months).',
        tips: 'Common mistakes: (1) All tasks starting in month 1 — this is unrealistic and shows poor planning. (2) Critical deliverables due in the final month — evaluators see this as high-risk. (3) Large gaps between WPs — suggests poor integration. (4) Dissemination only at the end — it should start from month 3-6. Review the generated Gantt chart critically: does it show a natural flow from research to development to piloting to dissemination? If not, adjust your task dates.',
        euContext: 'Many EU proposal templates explicitly require a Gantt chart. Even when optional, it is strongly recommended. Evaluators use the Gantt chart to visually cross-check claims made in the work plan text. Inconsistencies between the text and the chart are immediate red flags. A well-structured Gantt chart showing logical progression, appropriate overlap, and balanced workload signals professional planning.',
        example: 'Ideal Gantt pattern for a 36-month project:\nMonths 1-6: Management setup + Research/Analysis (WP1+WP2 active)\nMonths 4-12: Research wrapping up + Development beginning (WP2+WP3 overlap)\nMonths 10-24: Development + Pilot preparation (WP3+WP4 overlap)\nMonths 18-30: Piloting + Training + Data collection (WP4 peak activity)\nMonths 24-36: Analysis + Dissemination + Policy recommendations (WP4+WP5)\nMonths 1-36: Management (WP1) and Dissemination (WP5) continuous',
      },
      pertChart: {
        whatIsThis: 'The PERT (Program Evaluation and Review Technique) chart is a network diagram that shows the dependencies between tasks and identifies the critical path — the longest chain of dependent tasks that determines the minimum project duration.',
        whyImportant: 'While the Gantt chart shows WHEN tasks happen, the PERT chart shows WHY they happen in that order. It reveals: (1) Which tasks must be completed before others can start. (2) The critical path — any delay on this path delays the entire project. (3) Parallel work streams that can proceed independently. (4) Potential bottlenecks where many tasks converge. Understanding task dependencies is essential for realistic planning and risk management.',
        whatToWrite: 'The PERT chart is generated automatically from the task dependencies you define in the work plan. Your role is to: (1) Define meaningful dependencies between tasks (using Finish-to-Start, Start-to-Start, etc.). (2) Ensure the dependency chain is logical — research outputs feed into development inputs, development outputs feed into piloting inputs. (3) Check that the critical path is reasonable — if one chain of tasks spans the entire project with zero slack, any delay cascades.',
        tips: 'Not every task needs a dependency — only add dependencies where there is a genuine logical or practical reason. Common dependency types: FS (Finish-to-Start) — Task B cannot start until Task A finishes. SS (Start-to-Start) — Task B can start when Task A starts. Avoid circular dependencies (A depends on B which depends on A). The critical path should align with your core content WPs — if the management WP is on the critical path, something is wrong. Add some buffer between dependent tasks where possible.',
        euContext: 'PERT charts are less commonly required in EU proposals than Gantt charts, but including one demonstrates sophisticated project planning. Evaluators particularly value them in large-scale projects (Horizon Europe) where task interdependencies are complex. The critical path analysis also feeds into your risk management — risks on the critical path deserve the most attention.',
        example: 'Example critical path: T1.1 (Kick-off) -> T2.1 (Needs Analysis) -> T2.3 (Analysis Report) -> T3.1 (Framework Design) -> T3.3 (Framework Validation) -> T4.1 (Pilot Preparation) -> T4.2 (Pilot Execution) -> T4.4 (Evaluation Report) -> T5.3 (Policy Recommendations)\n\nParallel stream (not on critical path): T5.1 (Dissemination Plan) -> T5.2 (Website & Social Media) -> T5.4 (Final Conference)\n\nThe critical path spans 32 of 36 months, leaving 4 months of slack — reasonable.',
      },
      finance: {
        whatIsThis: 'The Finance (Budget) section shows how project funds are allocated across partners, work packages, and cost categories. It includes direct costs (labour, travel, equipment, subcontracting, materials) and indirect costs (overhead), organized by your chosen funding model (centralized or decentralized).',
        whyImportant: 'Budget realism and coherence are critical evaluation criteria. The budget must demonstrate value for money — that the requested funding is justified by the planned activities and expected results. Evaluators cross-check the budget against the work plan, partner roles, and task descriptions. An inflated or poorly distributed budget can disqualify an otherwise strong proposal.',
        whatToWrite: 'The budget is largely calculated from partner allocations in your work plan tasks. Your key configuration decisions are: (1) Funding model — centralized (EU direct management) or decentralized (national agencies). This determines the direct cost categories. (2) Indirect cost percentage — typically 7% (Erasmus+), 15% (some Horizon Europe), or 25% (Horizon Europe flat rate). (3) Which direct cost categories the indirect percentage applies to. (4) Partner PM rates — set in the Partners section. The system then calculates totals per WP, per partner, and overall.',
        tips: 'Budget balance rules of thumb: (1) Management WP: 5-10% of total budget. (2) Dissemination WP: 10-15%. (3) Content/Technical WPs: remaining 75-85%, distributed based on effort. (4) No single partner should exceed 40-45% of the budget unless they are clearly the main implementer. (5) PM rates should be realistic for the country and organization type. (6) Direct cost categories should reflect actual needs — do not inflate travel or equipment budgets. (7) If your indirect rate is 25%, ensure you have selected the correct eligible direct cost categories. After AI generates allocations, review them carefully and adjust any obvious imbalances.',
        euContext: 'Budget assessment varies by EU program: Erasmus+ KA2 uses lump-sum or unit-cost models with less flexibility. Horizon Europe uses actual costs with detailed justification needed. In all cases, evaluators check: (1) Is the total budget proportional to the ambition? (2) Are partner shares justified by their workload? (3) Are direct costs realistic and necessary? (4) Is the indirect cost calculation correct? (5) Is there double funding risk? Budget inconsistencies (e.g., a partner with 30% of the budget but only 10% of the tasks) are serious red flags.',
        example: 'Example budget distribution for a EUR 600,000 / 36-month Erasmus+ KA2 project:\nWP1 Management: EUR 48,000 (8%)\nWP2 Research: EUR 120,000 (20%)\nWP3 Development: EUR 168,000 (28%)\nWP4 Piloting: EUR 144,000 (24%)\nWP5 Dissemination: EUR 72,000 (12%)\nIndirect costs (7%): EUR 48,000 (8%)\n\nPer partner: CO: 28%, P2: 22%, P3: 20%, P4: 16%, P5: 14%',
      },
      riskMitigation: {
        whatIsThis: 'Risk Mitigation is a structured analysis of potential threats to your project\'s success and the strategies you will employ to prevent or minimize their impact. Each risk is categorized, assessed for likelihood and impact, and paired with a concrete mitigation strategy.',
        whyImportant: 'Risk management demonstrates maturity and preparedness. Every project faces risks — evaluators do not penalize you for having risks, they penalize you for not anticipating them. A well-crafted risk section shows that you have thought critically about what could go wrong and have actionable plans to address it. It is assessed under "Quality and Efficiency of Implementation."',
        whatToWrite: 'Identify 5-8 risks covering at least 3 of the 4 categories (technical, social, economic, environmental). For each risk: (1) Risk ID (RISK1, RISK2...) for reference. (2) Category — what type of risk is it. (3) Title — brief name. (4) Description — what could happen and why. (5) Likelihood — Low, Medium, or High. (6) Impact — Low, Medium, or High. (7) Mitigation — specific, actionable steps to prevent or reduce the risk.',
        tips: 'Include a mix of risk levels — all "Low/Low" risks are unrealistic and signal you have not thought seriously. Include at least 2 Medium or High likelihood risks. Mitigation strategies must be SPECIFIC — "we will monitor the situation" is not a mitigation strategy. Instead: "If partner P3 fails to recruit 400 educators by M12, the Coordinator will activate the backup recruitment channel through the national teachers\' association (LOI attached), with a 60-day recruitment sprint in months 13-14." Cover these common EU project risk areas: (1) Partner dropout or underperformance. (2) Recruitment/engagement of target group. (3) Technical failures or delays. (4) Regulatory or ethical changes. (5) Budget overruns in specific categories.',
        euContext: 'Evaluators assess risk management as part of implementation quality. They look for: (1) Realistic risk identification — not too optimistic, not catastrophizing. (2) Coverage of different risk categories. (3) Proportionate mitigation — the effort to mitigate should match the risk severity. (4) Connection to the work plan — some mitigations should reference specific tasks or milestones. (5) Contingency planning — what is Plan B? The best risk sections include a risk register that is treated as a living document, reviewed quarterly by the Steering Committee.',
        example: 'Example risk:\nRISK3 — Category: Social — "Insufficient engagement of rural educators in pilot activities"\nLikelihood: Medium | Impact: High\nDescription: "Rural educators face time constraints and limited institutional support for professional development. There is a risk that the target of 400 educators per country will not be reached, particularly in remote areas with poor connectivity."\nMitigation: "Three-tier recruitment strategy: (1) Formal MoUs with 5 regional education authorities guaranteeing access to school networks (signed pre-submission). (2) Flexible participation formats — educators can join fully online, hybrid, or in-person sessions. (3) Micro-certification incentive — each completed module earns a recognized credential contributing to national CPD requirements. If recruitment falls below 70% of target by M10, activate backup channel through national teacher unions (contacts established during proposal preparation)."',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STEP 6: EXPECTED RESULTS (placeholder for next session)
  // ─────────────────────────────────────────────────────────────
  expectedResults: {
    stepTitle: 'Expected Results',
    stepIntro: 'Expected Results define what your project will produce, achieve, and leave behind. This section covers four dimensions: Outputs (tangible products), Outcomes (measurable changes), Impacts (long-term effects), and Key Exploitable Results (KERs — results with sustainability and exploitation potential). Together, they form the "results chain" that evaluators use to assess your project\'s value and lasting contribution.',
    fields: {
      outputs: {
        whatIsThis: 'Outputs are the tangible, concrete deliverables and products that your project creates. These are things you can "touch" — tools, platforms, reports, guidelines, training curricula, policy briefs, databases, methodologies. Each output should be directly linked to a specific work package and deliverable.',
        whyImportant: 'Outputs demonstrate concrete productivity and value for money. They answer the question: "What will exist at the end of this project that did not exist before?" Evaluators use outputs to assess whether the project produces sufficient tangible value for the EU investment. Outputs also form the basis for sustainability — they are the products that can be exploited, scaled, or transferred after the project ends.',
        whatToWrite: 'List 4-8 specific outputs, each with: (1) A clear title identifying the product (e.g., "D2.1 — Digital Competence Assessment Framework for Rural Educators"). (2) A description explaining what it is, its format, scope, and target users. (3) An indicator describing how quality and completion will be verified (e.g., "Framework document published as open-access PDF, validated by 200 educators with minimum 80% satisfaction rating"). Link each output to its source WP and deliverable.',
        tips: 'Be concrete and specific. Instead of "training materials," write "Modular training curriculum (6 modules, 120 hours total) covering DigComp 2.2 levels A2-B2, available in 5 languages, with facilitator guides and assessment rubrics." Each output should be: (1) Clearly deliverable within the project timeline. (2) Useful beyond the project — who else could use this? (3) Verifiable — how will you prove it exists and meets quality standards? Avoid listing internal project management documents as outputs (Steering Committee minutes are not outputs). Focus on externally valuable products.',
        euContext: 'Evaluators assess outputs under "Impact" and partly under "Quality of Implementation." They check: (1) Are outputs clearly defined and realistic? (2) Do they represent genuine value — would the target group actually use them? (3) Are they open-access or available for wider use? (4) Do they cover all major aspects of the project? (5) Are quality indicators meaningful? In Horizon Europe, outputs are linked to the Data Management Plan and must specify access conditions. In Erasmus+, outputs should be uploaded to the EU Results Platform.',
        example: 'Example outputs:\nD2.1 — Digital Competence Assessment Framework (DCAF): A comprehensive framework mapping digital competencies for rural educators to DigComp 2.2 levels A2-B2. Format: PDF + interactive online tool. Indicator: Validated by 200 educators, peer-reviewed by 3 external experts.\n\nD3.2 — Open Educational Resource Library: 120 hours of modular training content in 5 languages. Format: SCORM-compatible modules on open-source LMS. Indicator: 90% of modules rated 4/5 or higher by pilot participants.\n\nD5.1 — EU Policy Recommendation Report: Evidence-based recommendations for EU digital education policy. Format: 40-page report + 4-page executive summary. Indicator: Endorsed by at least 3 MEPs or Commission officials.',
      },
      outcomes: {
        whatIsThis: 'Outcomes are the measurable changes that result from target groups actually USING the project outputs. While outputs are products, outcomes are changes — in knowledge, skills, behavior, capacity, or practice. Outcomes typically manifest during the project or within 1-2 years after.',
        whyImportant: 'Outcomes demonstrate that your project creates real change, not just products. A project that produces beautiful materials nobody uses has outputs but no outcomes. Evaluators particularly value outcomes because they show the "so what?" factor — the actual difference the project makes in people\'s lives, organizations, or systems. Outcomes are the bridge between what you produce (outputs) and the lasting change you envision (impacts).',
        whatToWrite: 'Describe 3-5 outcomes, each with: (1) A clear title describing the change. (2) A description explaining what change occurs, in whom, and how it is caused by project outputs. (3) A quantified indicator with baseline and target values. Outcomes should cover different dimensions: knowledge outcomes (people know more), skill outcomes (people can do more), behavioral outcomes (people act differently), capacity outcomes (organizations can do more), and systemic outcomes (systems work differently).',
        tips: 'The key distinction from outputs: outputs are products (nouns), outcomes are changes (verbs). "Training curriculum developed" is an output. "2,000 educators demonstrate improved digital competence (from A2 to B1 average)" is an outcome. Always include a baseline (current state) and target (expected state after project). Use pre-post measurement where possible. Common mistake: listing outputs as outcomes — check each one with the test "Is this a CHANGE in someone or something, or is this a PRODUCT?"',
        euContext: 'Outcome measurement is increasingly important in EU funding. Erasmus+ now requires Key Performance Indicators (KPIs) with baseline and target values. Horizon Europe has mandatory impact pathways showing how outputs lead to outcomes and impacts. Evaluators assess: (1) Are outcomes realistic and measurable? (2) Is there a clear causal link from activities to outputs to outcomes? (3) Are measurement methods defined? (4) Do outcomes benefit the wider target group, not just direct participants?',
        example: 'Example outcomes:\nR1 — Improved Digital Competence: 2,000 rural educators demonstrate measurable improvement in digital competence, with average scores increasing from DigComp level A2 (baseline, measured at M4) to B1 (target, measured at M28). Indicator: Pre-post assessment using the DCAF tool, with minimum 1-level improvement for 70% of participants.\n\nR2 — Institutional Capacity Building: 25 rural schools establish functioning digital innovation hubs with at least 3 regular activities per month. Indicator: Hub activity logs showing minimum 36 activities in first 12 months of operation.\n\nR3 — Policy Integration: Digital competence frameworks adopted or referenced in at least 3 national education policy documents across partner countries. Indicator: Official policy citations documented by M34.',
      },
      impacts: {
        whatIsThis: 'Impacts are the long-term, broader effects that your project contributes to — changes at the systemic, societal, economic, or policy level that emerge AFTER the project ends. Impacts go beyond your direct target group and represent the lasting legacy of your work.',
        whyImportant: 'Impacts justify the EU investment by showing that the project creates lasting, systemic change. They answer the ultimate question: "Why should the EU spend this money?" Impacts connect your project to the general objectives and to EU policy goals. They demonstrate that the project\'s value extends far beyond its direct participants and timeframe. Strong impact descriptions can significantly boost your evaluation score under the "Impact" criterion — typically worth 25-30% of the total.',
        whatToWrite: 'Describe 3-5 long-term impacts across different dimensions: (1) Social impact — how does the project contribute to social inclusion, equity, or cohesion? (2) Economic impact — does the project improve employability, productivity, or innovation? (3) Policy impact — does the project influence policy at national or EU level? (4) Environmental impact — if applicable, does the project contribute to sustainability? (5) Systemic impact — does the project change how systems (education, governance, technology) operate? For each, describe what will change, for whom, over what timeframe (typically 3-10 years post-project), and how the project contributes.',
        tips: 'Impacts are aspirational but must be plausible. The key word is "contribute to" — your project alone will not transform European education, but it can contribute to that transformation. Always link impacts to your general objectives (which should align with EU policy targets). Include rough quantification where possible: "Contributing to digital upskilling of an estimated 50,000 educators through cascade training effects over 5 years post-project." Be honest about the attribution challenge — explain HOW your project leads to these impacts through the scaling and sustainability mechanisms you have designed.',
        euContext: 'Impact assessment is the fastest-growing evaluation criterion across EU programs. Horizon Europe requires a formal "Impact Pathway" showing: outputs -> outcomes -> impacts, with specific KPIs at each level. Erasmus+ evaluates long-term impact potential based on sustainability and mainstreaming plans. Evaluators look for: (1) Scalability — can results be replicated in other regions/countries? (2) Transferability — can the approach be applied to different sectors? (3) Sustainability — will results persist without EU funding? (4) Policy influence — will results inform policy-making? (5) EU added value — could these impacts be achieved without European cooperation?',
        example: 'Example impacts:\nI1 — Reduced Urban-Rural Digital Divide: "In the 5 years following project completion, DIGI-RURAL\'s framework and training model, adopted by an estimated 50+ educational institutions through cascade training and open-access resources, will contribute to reducing the urban-rural digital skills gap by 15-20% in target regions, supporting the European Digital Decade target."\n\nI2 — Policy Mainstreaming: "By M36, evidence-based policy recommendations will be submitted to 5 national education ministries and the European Commission DG EAC. Based on stakeholder engagement during the project, at least 2 national policy documents are expected to reference or integrate project results within 3 years post-project."\n\nI3 — Economic Competitiveness: "Improved digital competence among rural educators will cascade to approximately 100,000 students over 5 years, enhancing their digital skills and employability, thereby contributing to addressing the EU\'s 3.2 million unfilled ICT positions."',
      },
      kers: {
        whatIsThis: 'Key Exploitable Results (KERs) are the most valuable, strategically important outputs of your project — those with the highest potential for exploitation, commercialization, policy adoption, or transfer to other contexts. KERs are selected from your outputs based on their market potential, societal value, or policy relevance, and each must have a clear exploitation strategy.',
        whyImportant: 'KERs demonstrate sustainability — that your project\'s most valuable results will live on and create value long after EU funding ends. This is increasingly a make-or-break criterion: EU evaluators want to see that their investment generates lasting returns, not just a project that ends when funding stops. KERs also show exploitation capacity — your ability to take project results to market, policy, or wider practice.',
        whatToWrite: 'Identify 2-4 Key Exploitable Results. For each KER: (1) KER ID and Title — identifying the specific result. (2) Description — what it is, why it is valuable, and who would use it. (3) Exploitation Strategy — a detailed plan for how this result will be exploited after the project. The exploitation strategy should cover: target market/audience, exploitation model (open-source, licensing, spin-off, policy adoption, mainstreaming), responsible partner, timeline for exploitation activities, resources needed, and expected reach/revenue. Each KER should be linked to specific outputs and work packages.',
        tips: 'Selecting KERs: not every output is a KER. Choose results that are: (1) Unique — not easily replicated by others. (2) Valuable — someone would pay for it or adopt it into policy. (3) Ready — mature enough to be exploited after the project. (4) Sustainable — can exist without ongoing EU funding. Exploitation strategies should be realistic and specific. "We will disseminate results" is NOT an exploitation strategy. "P5 (EduTech Solutions) will integrate the DCAF tool into their commercial EdTech platform, reaching an estimated 10,000 users in year 1 post-project, with a freemium licensing model generating EUR 50,000/year to sustain platform maintenance" IS an exploitation strategy. Consider different exploitation paths: commercial (licensing, spin-off), academic (publications, further research), policy (adoption into national frameworks), and social (open-access for NGOs and schools).',
        euContext: 'KERs and exploitation planning are mandatory in Horizon Europe (with a dedicated section in the proposal template) and increasingly important in Erasmus+ KA2. Evaluators check: (1) Are KERs clearly identified and justified? (2) Are exploitation strategies realistic and specific? (3) Is there a credible responsible partner for each KER? (4) Does the exploitation plan include post-project sustainability? (5) Is there evidence of market/demand analysis? (6) Are IP/ownership issues addressed? The EU has published specific guidance on KER identification (Horizon Europe Exploitation Strategy Seminar materials, 2023). In Erasmus+, exploitation is assessed under "Quality of the project design" and "Sustainability."',
        example: 'Example KER:\nKER1 — "Digital Competence Assessment Framework (DCAF) for Rural Educators"\nDescription: An innovative, validated framework mapping digital competencies specifically for rural educational contexts, filling a gap in existing frameworks (DigComp 2.2 does not address rural-specific challenges).\nExploitation Strategy: (1) Open-access core framework (CC BY-SA 4.0) published via EU Results Platform and project website — targeting 5,000 downloads in year 1 post-project. (2) Premium version with automated assessment engine integrated into P5\'s commercial platform — freemium model, EUR 29/year per institution, targeting 500 institutional subscriptions by year 2. (3) Policy pathway — DCAF submitted to JRC as input for DigComp 2.3 revision process, with supporting evidence from 5-country pilot. Responsible partner: P5 (commercial), P1 (academic/policy). Estimated sustainability: Self-funding within 18 months post-project through licensing revenue.',
      },
    },
  },
// ═══════════════════════════════════════════════════════════════
// SLOVENIAN
// ═══════════════════════════════════════════════════════════════

var GUIDE_SI: Record<string, StepGuide> = {

  // ─────────────────────────────────────────────────────────────
  // KORAK 1: PROBLEMSKA ANALIZA
  // ─────────────────────────────────────────────────────────────
  problemAnalysis: {
    stepTitle: 'Problemska analiza',
    stepIntro: 'To je temelj celotnega projektnega predloga. Tukaj definirate, ZAKAJ je va\u0161 projekt potreben. Močna problemska analiza prepriča ocenjevalce, da resnično razumete problematiko in da va\u0161 projekt naslavlja realno, z dokazi podprto potrebo. Brez trdne problemske analize preostali del predloga nima podlage.',
    fields: {
      coreProblem: {
        whatIsThis: 'Glavni problem je osrednje vprašanje, ki ga va\u0161 projekt naslavlja. Gre za jasno, jedrnato izjavo o glavnem izzivu, podprto z empiričnimi dokazi, kot so statistike, raziskovalne ugotovitve in uradna poročila.',
        whyImportant: 'Ocenjevalci EU i\u0161čejo predloge, ki naslavljajo resnične, dokumentirane probleme. Nejasen ali nepodprt opis problema takoj oslabi va\u0161 predlog. Glavni problem postavlja temelje za vse, kar sledi \u2014 va\u0161i cilji, aktivnosti in pričakovani rezultati se morajo vsi nanašati na ta problem.',
        whatToWrite: 'Napišite celovit opis problema. Začnite s širšim kontekstom (kaj se dogaja na ravni EU/globalno), nato zožite na specifično vprašanje, ki ga va\u0161 projekt cilja. Vključite vsaj 3\u20135 statističnih referenc ali citatov iz uglednih virov (Eurostat, OECD, WHO, poročila EU). Opišite, kdo je prizadet in kako resno.',
        tips: 'Izogibajte se preveč splošnim trditvam ("brezposelnost je problem") \u2014 bodite specifični ("brezposelnost mladih na podeželju Južne Evrope presega 35 %, v primerjavi s povprečjem EU 14,5 %, po podatkih Eurostata 2024"). Vedno navajajte vire. Uporabite funkcijo InlineChart za vizualizacijo ključnih statistik \u2014 ocenjevalci cenijo vizualne dokaze. NE predstavljajte svojo rešitev tukaj \u2014 ta razdelek je namenjen izključno PROBLEMU.',
        euContext: 'Ocenjevalci EU uporabljajo problemsko analizo za oceno "Relevantnosti" \u2014 ta običajno predstavlja 25\u201330 % skupne ocene. Preverjajo, ali je problem jasno opredeljen, podprt z dokazi, jasno vpliva na ciljno skupino in se ujema s prednostnimi nalogami politik EU. Dobro dokumentiran problem s trdnimi podatki lahko bistveno dvigne va\u0161o oceno.',
        example: 'Vzorec: "Po podatkih [Vir, Leto] [statistika o problemu]. To prizadene [ciljna skupina] po [geografski obseg], kar vodi v [negativne posledice]. Kljub prizadevanjem, kot so [obstoječe pobude], problem vztraja, ker [vrzel/razlog]. Natančneje, [bolj podrobni podatki o resnosti]."',
      },
      causes: {
        whatIsThis: 'Vzroki so temeljni razlogi, ZAKAJ glavni problem obstaja. To so korenski dejavniki \u2014 strukturni, sistemski, institucionalni ali vedenjski \u2014 ki ustvarjajo in ohranjajo problem.',
        whyImportant: 'Prepoznavanje vzrokov kaže analitično globino. Ocenjevalcem dokazuje, da niste samo opazili problema, ampak razumete njegove korenine. Vsak identificiran vzrok naj se logično povezuje z aktivnostmi v va\u0161em projektu \u2014 v bistvu gradite utemeljitev za va\u0161e delovne sklope.',
        whatToWrite: 'Navedite 3\u20135 ločenih vzrokov glavnega problema. Za vsakega podajte naslov in podroben opis. Vsak opis naj razloži mehanizem (kako ta vzrok prispeva k problemu?) in zagotovi dokaze (podatki, \u0161tudije, poročila). Vzroki naj bodo na različnih ravneh \u2014 npr. en sistemski, en institucionalni, en povezan z znanji/zmogljivostmi, en povezan z ozaveščenostjo.',
        tips: 'Vzroki naj bodo specifični in ločeni \u2014 izogibajte se prekrivanju. Vsak vzrok naj kaže na specifično aktivnost ali delovni sklop v va\u0161em projektu. Zamislite si "drevo problemov" \u2014 glavni problem je deblo, vzroki so korenine. Če vzroka ne morete povezati s projektno aktivnostjo, morda ne sodi sem. Uporabljajte akademski jezik, a ostanite razumljivi.',
        euContext: 'Ocenjevalci preverjajo, ali so va\u0161i vzroki podprti z dokazi in ali va\u0161e predlagane aktivnosti logično naslavljajo te vzroke. Projekt, ki identificira 4 vzroke, a le 2 naslavlja v aktivnostih, bo izgubil točke za koherentnost. Usklajenost vzrok\u2013aktivnost je ključni kazalnik kakovosti.',
        example: 'Primer: Naslov vzroka: "Nezadostna digitalna infrastruktura v podeželskih izobraževalnih ustanovah." Opis: "Po Indeksu digitalnega gospodarstva in družbe Evropske komisije (DESI, 2024) ima le 38 % podeželskih šol v ciljnih regijah širokopasovno povezavo nad 100 Mbps, v primerjavi s 79 % v mestnih območjih. Ta digitalni razkorak omejuje dostop do sodobnih izobraževalnih orodij in ohranja vrzeli v znanju..."',
      },
      consequences: {
        whatIsThis: 'Posledice so negativni učinki, ki nastanejo ZARADI obstoja glavnega problema. Opisujejo, kaj se zgodi, če se problem ne reši \u2014 cena neukrepanja.',
        whyImportant: 'Posledice ustvarjajo nujnost. Odgovarjajo na vprašanje: "Kaj se zgodi, če ne ukrepamo?" To je ključno za prepričanje ocenjevalcev, da va\u0161 projekt ni le zanimiv, ampak nujen. Posledice se povezujejo tudi z va\u0161imi pričakovanimi rezultati \u2014 va\u0161 projekt bi moral dokazljivo zmanjšati ali odpraviti te posledice.',
        whatToWrite: 'Opišite 3\u20135 posledic glavnega problema. Pokrijte različne dimenzije \u2014 ekonomske posledice (stroški, izgubljena produktivnost), družbene posledice (neenakost, izključenost) in, kjer je relevantno, okoljske ali zdravstvene posledice. Vsaka posledica naj bo, kjer je mogoče, kvantificirana.',
        tips: 'Bodite specifični in podprti s podatki. Namesto "to vodi v ekonomske probleme" napišite "to povzroča ocenjeno letno izgubo produktivnosti v vi\u0161ini 2,3 milijarde EUR po EU-27 (Vir, Leto)." Povežite posledice s cilji politik EU \u2014 če posledica spodkopava specifično EU strategijo, to omenite. To krepi argument relevantnosti.',
        euContext: 'Močen razdelek o posledicah dokazuje "dodano vrednost EU" \u2014 da ima problem čezmejne ali sistemske posledice, ki zahtevajo ukrepanje na ravni EU. Ocenjevalci dajejo prednost posledicam, ki kažejo vpliv onkraj posamezne države ali organizacije.',
        example: 'Primer: Naslov posledice: "Poglabljanje neskladja kompetenc na digitalnem trgu dela." Opis: "Obstoj tega problema neposredno prispeva k naraščajočemu razkoraku digitalnih kompetenc, ugotovljenemu v Evropski agendi za kompetence. Cedefop (2024) ocenjuje, da 42 % delavcev v EU nima osnovnih digitalnih kompetenc, kar povzroča 3,2 milijona nezapolnjenih delovnih mest na podro\u010Dju IKT letno in ocenjeno izgubo BDP v vi\u0161ini 415 milijard EUR..."',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // KORAK 2: PROJEKTNA IDEJA
  // ─────────────────────────────────────────────────────────────
  projectIdea: {
    stepTitle: 'Projektna ideja',
    stepIntro: 'Tu va\u0161 projekt dobi obliko. Razdelek Projektna ideja pretvori problem, ki ste ga identificirali, v konkretno, inovativno re\u0161itev. Tukaj definirate, KAJ va\u0161 projekt JE \u2014 njegovo identiteto, pristop in inovativnost. Ocenjevalci presojajo, ali je va\u0161a ideja izvirna, izvedljiva in jasno odgovarja na identificirani problem.',
    fields: {
      projectTitle: {
        whatIsThis: 'Naziv projekta je uradno ime va\u0161ega projekta, akronim pa njegova kratka oblika (običajno 3\u20138 znakov). Skupaj tvorita identiteto va\u0161ega projekta v celotnem EU sistemu.',
        whyImportant: 'Naziv je prva stvar, ki jo ocenjevalci vidijo. Mora biti strokoven, opisen in zapomnljiv. Dober naziv takoj sporoča, o čem projekt govori. Akronim se bo uporabljal v vseh uradnih dokumentih, komunikacijah in v bazi EU projektov.',
        whatToWrite: 'Izberite naziv, ki jasno sporoča namen in obseg projekta. Dovolj specifičen, da va\u0161 projekt loči od drugih, a dovolj jedrnat, da je praktičen. Akronim naj bo izgovorljiv, zapomnljiv in idealno namiguje na fokus projekta.',
        tips: 'Izogibajte se generičnim naslovom kot "Inovacije v izobraževanju" \u2014 bodite specifični: "Pospeševalnik digitalnih kompetenc za podeželske pedagoge v Jugovzhodni Evropi." NE uporabljajte besede "projekt" v naslovu. Akronim naj bo enostaven za izgovorjavo \u2014 preizkusite ga ustno. Preverite, da akronim \u0161e ne obstaja (poi\u0161čite v bazi CORDIS). UI lahko predlaga več možnosti \u2014 izberite tisto, ki najbolj ustreza.',
        euContext: 'Ocenjevalci si oblikujejo prvi vtis iz naslova. Strokoven, jasen naslov signalizira premišljen predlog. Akronim se pojavi v vseh EU bazah (CORDIS, Funding & Tenders Portal) \u2014 postane blagovna znamka va\u0161ega projekta.',
        example: 'Dobro: "DIGI-RURAL \u2014 Pospe\u0161evanje digitalne preobrazbe podeželskih izobraževalnih ekosistemov v Jugovzhodni Evropi." Slabo: "Projekt za izbolj\u0161anje digitalnih kompetenc." Dober primer je specifičen, zapomnljiv in usmerjen v akcijo.',
      },
      mainAim: {
        whatIsThis: 'Glavni namen je en sam, celovit stavek, ki zajema celoten namen va\u0161ega projekta. To je krovni cilj \u2014 kaj projekt v končni fazi stremi doseči.',
        whyImportant: 'Glavni namen je sidro va\u0161ega predloga. Vse v projektu \u2014 cilji, aktivnosti, rezultati \u2014 mora biti usklajeno in prispevati k temu namenu. Ocenjevalci ga uporabijo za hitro razumevanje namena projekta in preverjanje koherentnosti preostalega predloga.',
        whatToWrite: 'Napi\u0161ite EN jasen stavek, ki se začne z "Glavni namen [Akronim projekta] je..." Ta stavek naj zajame: (1) kaj boste naredili, (2) za koga, (3) kako (pristop) in (4) kak\u0161no spremembo pričakujete. Omejite se na najve\u010D 2\u20133 vrstice.',
        tips: 'NE navajajte ve\u010D namenov \u2014 biti mora en krovni namen. Specifični merljivi cilji sodijo v Specifične cilje (Korak 3). Glavni namen naj bo ambiciozen, a realisti\u010Den. Uporabljajte močne, aktivne glagole (pospe\u0161iti, preobraziti, premostiti, okrepiti, vzpostaviti). Izogibajte se nejasnim izrazom (izbolj\u0161ati, podpreti, pomagati).',
        euContext: 'Glavni namen mora jasno odgovarjati na cilje EU razpisa. Ocenjevalci preverjajo: Ali ta namen neposredno naslavlja prednostne naloge razpisa? Ali je dosegljiv v okviru trajanja in proračuna projekta? Ali predstavlja resnično dodano vrednost EU?',
        example: 'Primer: "Glavni namen DIGI-RURAL je pospe\u0161iti digitalno preobrazbo podeželskih izobraževalnih ekosistemov v petih državah Jugovzhodne Evrope s soustvarjanjem, pilotiranjem in \u0161irjenjem celostnega okvira digitalnih kompetenc za 2.000 pedagogov, s čimer se za 40 % zmanj\u0161a vrzel med mestnimi in pode\u017Eelskimi digitalnimi kompetencami v ciljnih regijah."',
      },
      stateOfTheArt: {
        whatIsThis: 'Pregled trenutnega stanja je celovit pregled vsega, kar na področju va\u0161ega projekta že obstaja. Pokriva obstoječe projekte, izdelke, storitve, raziskave in pobude \u2014 ter kritično identificira, kaj manjka ali je nezadostno.',
        whyImportant: 'Ta razdelek dokazuje, da ste opravili domačo nalogo. Ocenjevalcem kaže, da poznate pokrajino in da va\u0161 projekt ne podvaja obstoje\u010Dih prizadevanj. Še pomembneje, identificira VRZEL \u2014 kaj obstoje\u010De re\u0161itve ne naslavljajo \u2014 ki jo bo va\u0161 projekt zapolnil.',
        whatToWrite: 'Strukturirajte v tri dele: (1) Pregled obstoječih rešitev, projektov in raziskav na tem področju. (2) Kritična analiza \u2014 kakšne so omejitve, vrzeli ali neuspehi obstoječih pristopov. (3) Kako bo va\u0161 projekt naslovil te vrzeli. Sklicujte se na specifične EU projekte (preverite CORDIS), akademske študije in obstoječa orodja/platforme.',
        tips: 'NE navajajte samo obstoječih projektov \u2014 analizirajte jih kritično. Za vsakega pojasnite, kaj je dosegel IN česa ni. Pokažite, da ste poiskali po bazi CORDIS sorodnike. Če podobni projekti obstajajo, pojasnite, kako se vaš razlikuje/je boljši. Ciljajte na vsaj 5\u20138 referenc.',
        euContext: 'Ocenjevalci specifično preverjajo podvajanje. Če je bil podoben projekt že financiran in ga ne omenite, to sproži opozorilo. Nasprotno, izkazovanje poznavanja sorodnih projektov in jasno razlikovanje va\u0161ega dokazuje zrelost in verodostojnost. Ta razdelek ocenjuje tudi "Inovativnost" \u2014 ki predstavlja 15\u201325 % ocene.',
        example: 'Vzorec: "Več pobud, financiranih s strani EU, je naslavljalo digitalne kompetence v izobraževanju, vključno s [Projekt A] (Erasmus+, 2022\u20132024), ki je razvil [orodje] za [ciljno skupino], in [Projekt B] (Horizon Europe, 2023\u20132025), ki se je osredotočil na [vidik]. Čeprav so ti projekti prinesli dragocene prispevke, imajo skupne omejitve: (1) osredotočenost izključno na mestna okolja, (2) pomanjkanje povezovanja med tehnično infrastrukturo in pedagoškimi metodami, (3) odsotnost trajnostnega mehanizma za razširitev po zaključku projekta. DIGI-RURAL naslavlja vse tri vrzeli..."',
      },
      proposedSolution: {
        whatIsThis: 'Predlagana rešitev je srce va\u0161ega projekta \u2014 podroben opis, KAJ boste naredili in KAKO. Opisuje vaš inovativen pristop, metodologijo, faze in klju\u010Dne aktivnosti.',
        whyImportant: 'Tukaj ocenjevalci presojajo kakovost in izvedljivost va\u0161ega pristopa. Želijo videti jasno, logično, inovativno metodologijo, ki prepričljivo naslavlja identificiran problem in vrzeli.',
        whatToWrite: 'Opišite rešitev strukturirano: (1) Celosten pristop \u2014 kaj je jedro inovacije ali metodologije. (2) Ključne faze ali stebri projekta. (3) Kako se vsaka faza povezuje z identificiranimi vzroki. (4) Katera orodja, metode ali okvire boste uporabili/razvili. (5) Kdo bo vključen in kako. (6) Kaj naredi ta pristop inovativen v primerjavi z obstoječimi re\u0161itvami.',
        tips: 'Bodite specifični in konkretni \u2014 izogibajte se nejasnim obljubam. Namesto "razvili bomo platformo" opišite "razvili bomo modularno, odprtokodno platformo za digitalne kompetence s tremi integriranimi moduli: (1) samoocena, (2) personalizirane učne poti, (3) mreža vrstniškega mentorstva." Jasno pokažite inovacijo \u2014 kaj je NOVEGA v vašem pristopu?',
        euContext: 'Ocenjevalci iščejo: (1) Inovativnost \u2014 ali je pristop resnično nov ali bistveno izboljšan? (2) Metodologija \u2014 ali je pristop znanstveno/strokovno utemeljen? (3) Izvedljivost \u2014 ali se to res da narediti s predlaganimi viri in časovnico? (4) Koherentnost \u2014 ali rešitev logično izhaja iz problemske analize?',
        example: 'Vzorec strukture: "DIGI-RURAL predlaga tristeberni pristop k digitalni preobrazbi podeželskega izobraževanja:\n\nSteber 1 \u2014 Ocena digitalne infrastrukture in premostitev: Sistematična ocena digitalne pripravljenosti v 50 podeželskih šolah v 5 državah...\n\nSteber 2 \u2014 Soustvarjeni okvir kompetenc: Neposredno delo z 200 podeželskimi pedagogi skozi participativne delavnice...\n\nSteber 3 \u2014 Trajnostno razširjanje in dialog s politikami: Vgradnja rezultatov v nacionalne in EU politične okvire..."',
      },
      readinessLevels: {
        whatIsThis: 'Stopnje pripravljenosti merijo, kako zrela ali razvita je va\u0161a predlagana re\u0161itev na ZAČETKU projekta. Vključujejo TRL (tehnolo\u0161ka), SRL (dru\u017Ebena), ORL (organizacijska) in LRL (pravna/eti\u010Dna pripravljenost). Izberete trenutno stopnjo in podate utemeljitev.',
        whyImportant: 'Stopnje pripravljenosti povedo ocenjevalcem, kje se va\u0161 projekt začne in implicitno, kje se bo končal. Pomagajo oceniti izvedljivost \u2014 projekt s TRL 1, ki trdi, da bo dosegel TRL 9 v 24 mesecih, je nerealen.',
        whatToWrite: 'Za vsako vrsto pripravljenosti (TRL, SRL, ORL, LRL) izberite stopnjo, ki pošteno predstavlja vaš ZAČETNI položaj. Nato napišite utemeljitev \u2014 zakaj ste izbrali to stopnjo, kateri dokazi podpirajo to oceno. Bodite iskreni.',
        tips: 'Večina projektov Erasmus+ se začne pri TRL 3\u20135 in cilja TRL 6\u20137. Horizon Europe raziskovalni projekti se lahko začnejo pri TRL 1\u20132. SRL je pogosto prezrt, a ključen. Za utemeljitve navajajte specifične dokaze: "Smo na TRL 4, ker je bil na\u0161 prototip validiran v laboratorijskih pogojih med predhodnim projektom [Ime, IDGrantov]." NE preskakujte polja za utemeljitev.',
        euContext: 'Različni EU programi ciljajo različne TRL razpone. Erasmus+ običajno podpira TRL 3\u20137. Horizon Europe pokriva celoten razpon. Ocenjevalci primerjajo va\u0161o navedeno TRL z aktivnostmi \u2014 \u010De trdite TRL 5, a va\u0161e aktivnosti vključujejo "osnovno validacijo koncepta," je prisotno protislovje.',
        example: 'Primer: TRL 4 \u2014 "Tehnologija validirana v laboratoriju." Utemeljitev: "Jedro orodja za ocenjevanje digitalnih kompetenc je bilo razvito in testirano v nadzorovanih pogojih med projektom Erasmus+ DIGI-TEACH (2022\u20132024, Grant \u0161t. 2022-1-SI01-KA220). Povratne informacije 45 testnih uporabnikov so potrdile veljavnost modela ocenjevanja, vendar ni bilo še testirano v resničnih podeželskih šolskih okoljih, kar je namen DIGI-RURAL."',
      },
      euPolicies: {
        whatIsThis: 'Politike EU so strateški okviri, programi in politične prednostne naloge, s katerimi se va\u0161 projekt usklajuje. Vključujejo široke strategije (Evropski zeleni dogovor, Digitalno desetletje), sektorske politike (Evropski prostor izobraževanja) in specifične programske cilje.',
        whyImportant: 'Usklajenost s politikami EU je ključni ocenjevalni kriterij. Dokazuje, da va\u0161 projekt prispeva k strateškim ciljem EU in ima pomen onkraj vaše neposredne ciljne skupine. Močna usklajenost s politikami bistveno dvigne va\u0161o oceno "Relevantnosti."',
        whatToWrite: 'Identificirajte 3\u20136 politik EU, ki so neposredno relevantne za va\u0161 projekt. Za vsako podajte polno uradno ime in opis, kako specifično se va\u0161 projekt usklajuje s to politiko in prispeva k njej. Bodite konkretni \u2014 ne navajajte le imena politike, razložite povezavo.',
        tips: 'Vedno vključite politiko, ki je najbolj neposredno povezana z va\u0161im EU razpisom. Dodajte 2\u20133 širše strategije (Digitalno desetletje, Evropska agenda za kompetence, Evropski steber socialnih pravic). Za vsako politiko navajajte specifične cilje ali ukrepe, ki jih va\u0161 projekt podpira. Uporabljajte natančna imena politik in letnice objave.',
        euContext: 'Ocenjevalci izrecno preverjajo usklajenost s politikami, zlasti s cilji razpisa. Omemba "pravih" politik kaže, da razumete kontekst EU financiranja. Vendar NE navajajte le politik \u2014 opis usklajenosti mora biti vsebinski in specifičen.',
        example: 'Primer: Politika: "Evropski akcijski načrt za digitalno izobraževanje (2021\u20132027)." Usklajenost: "DIGI-RURAL neposredno prispeva k Prednostnemu področju 1, Ukrepu 5 \u2014 \'Okviri digitalnih kompetenc za pedagoge\' \u2014 z razvojem in pilotiranjem kontekstualiziranega okvira, zasnovanega posebej za podeželske izobraževalne okolje, kar naslavlja izrecno skrb Akcijskega načrta glede geografskih razlik v pripravljenosti na digitalno izobraževanje."',
      },
    },
  },

  // ─── KORAK 3-6: Placeholders (enako kot EN) ───────────────
  generalObjectives: {
    stepTitle: 'Splo\u0161ni cilji',
    stepIntro: 'Splo\u0161ni cilji opredeljujejo \u0161iroke, dolgoročne cilje, h katerim va\u0161 projekt prispeva. Presegajo sam projekt \u2014 predstavljajo \u0161ir\u0161o spremembo, ki jo želite podpreti. Vsebina bo dopolnjena v naslednji seji.',
    fields: {
      objective: {
        whatIsThis: 'Splo\u0161ni cilj je \u0161irok, strate\u0161ki cilj, ki presega neposreden obseg in časovnico projekta.',
        whyImportant: 'Splo\u0161ni cilji povezujejo va\u0161 projekt s \u0161ir\u0161imi cilji EU in dru\u017Ebe ter dokazujejo njegov \u0161ir\u0161i pomen.',
        whatToWrite: 'Opredelite 2\u20133 \u0161iroke cilje, h katerim va\u0161 projekt prispeva (ne dosega sam). Usklajeni morajo biti z EU strategijami.',
        tips: 'Uporabljajte glagole kot "prispevati k," "podpreti," "spodbujati." Niso neposredno merljivi v časovnici projekta.',
        euContext: 'Ocenjevalci preverjajo, ali so splo\u0161ni cilji usklajeni s prednostnimi nalogami razpisa EU in \u0161ir\u0161imi politi\u010Dnimi cilji.',
        example: 'Primer: "Prispevati k zmanj\u0161anju vrzeli digitalnih kompetenc med mestnimi in pode\u017Eelskimi obmo\u010Dji v Jugovzhodni Evropi, v skladu s cilji Evropskega digitalnega desetletja 2030."',
      },
    },
  },
  specificObjectives: {
    stepTitle: 'Specifični cilji',
    stepIntro: 'Specifični cilji so konkretni, merljivi cilji, ki jih bo va\u0161 projekt neposredno dosegel v času trajanja. Morajo biti SMART. Vsebina bo dopolnjena v naslednji seji.',
    fields: {
      objective: {
        whatIsThis: 'Specifični cilj je konkreten, merljiv cilj, ki ga je mogoče neposredno doseči v časovnem okviru projekta.',
        whyImportant: 'Specifični cilji opredeljujejo, kaj bo va\u0161 projekt merljivo dosegel. Poganjajo va\u0161e aktivnosti in rezultate.',
        whatToWrite: 'Opredelite 3\u20135 SMART ciljev (Specifični, Merljivi, Dosegljivi, Relevantni, Časovno omejeni).',
        tips: 'Vsak specifični cilj naj bo povezan z vsaj enim delovnim sklopom. Vključite kvantificirane cilje.',
        euContext: 'Ocenjevalci presojajo, ali so specifični cilji realistični, merljivi in zadostni za dosego glavnega namena.',
        example: 'Primer: "Usposobiti in certificirati 2.000 pode\u017Eelskih pedagogov v digitalnih kompetencah stopenj B1\u2013B2 (DigComp 2.2) v 5 dr\u017Eavah v 30 mesecih od začetka projekta."',
      },
    },
  },
  activities: {
    stepTitle: 'Aktivnosti',
    stepIntro: 'Aktivnosti so najkompleksnej\u0161i razdelek \u2014 opredeljujejo, KAKO se bo va\u0161 projekt izvajal. To vključuje upravljavsko strukturo, konzorcij, delovne sklope, časovnico, proračun in obvladovanje tveganj. Vsebina bo dopolnjena v naslednji seji.',
    fields: {
      implementation: {
        whatIsThis: 'Opis implementacije pokriva strukturo upravljanja projekta, odločanje, zagotavljanje kakovosti in komunikacijo.',
        whyImportant: 'Kaže ocenjevalcem, da je va\u0161 projekt dobro organiziran in strokovno voden.',
        whatToWrite: 'Opišite upravljavski pristop, odločevalska telesa, nadzor kakovosti in interno komunikacijo.',
        tips: 'Vključite usmerjevalni odbor, svetovalni odbor in strukturo vodij DS. Opredelite pogostost sestankov.',
        euContext: 'Kakovost upravljanja je pomemben ocenjevalni kriterij \u2014 običajno 15\u201320 % skupne ocene.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      organigram: {
        whatIsThis: 'Vizualni organizacijski diagram, ki prikazuje upravljavsko strukturo projekta.',
        whyImportant: 'Zagotavlja takojšnjo vizualno jasnost o tem, kdo dela kaj in o hierarhiji poročanja.',
        whatToWrite: 'Generira se samodejno iz podatkov o upravljanju in partnerjih.',
        tips: 'Zagotovite, da so vsi vodje DS dodeljeni. Koordinator mora biti jasno na vrhu.',
        euContext: 'Ocenjevalci cenijo jasno vizualno upravljanje. Neurejen organigram signalizira slabo načrtovanje.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      partners: {
        whatIsThis: 'Sestava konzorcija \u2014 katere organizacije sodelujejo, iz katerih držav, s kakšnim strokovnim znanjem.',
        whyImportant: 'Pravi konzorcij je ključen. EU projekti zahtevajo nadnacionalna partnerstva z dopolnjujočimi kompetencami.',
        whatToWrite: 'Opredelite ime, državo, tip, vlogo in specifično strokovno znanje vsakega partnerja.',
        tips: 'Ciljajte na geografsko raznolikost, dopolnjujoče se strokovne znanje in uravnoteženo mešanico tipov partnerjev.',
        euContext: 'Ocenjevalci preverjajo geografsko ravnotežje, pokritost kompetenc in ali ima vsak partner jasno, utemeljeno vlogo.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      workplan: {
        whatIsThis: 'Strukturirani delovni načrt, sestavljen iz delovnih sklopov (DS), nalog, mejnikov in rezultatov.',
        whyImportant: 'Delovni načrt je operativno jedro. Pokazati mora logično, učinkovito in izvedljivo pot izvajanja.',
        whatToWrite: 'Vsak DS potrebuje naslov, opis, naloge z datumi, mejnike in rezultate.',
        tips: 'Zagotovite, da so naloge znotraj DS logično zaporedjene. Zadnja dva DS morata biti vedno Diseminacija in Upravljanje projekta.',
        euContext: 'Ocenjevalci presojajo, ali je delovni načrt realističen, dobro strukturiran in ima ustrezne kontrolne to\u010Dke.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      ganttChart: {
        whatIsThis: 'Vizualna časovnica, ki prikazuje vse naloge, njihovo trajanje in prekrivanja čez celoten životni cikel projekta.',
        whyImportant: 'Zagotavlja takojšnje vizualno razumevanje urnika projekta in razmerij med nalogami.',
        whatToWrite: 'Generira se samodejno iz podatkov delovnega načrta. Zagotovite, da imajo vse naloge začetni in končni datum.',
        tips: 'Preverite, da nobena naloga ne presega datuma zaključka projekta. DS upravljanja projekta mora pokrivati celoten projekt.',
        euContext: 'Dobro strukturiran Gantt diagram kaže sposobnost strokovnega načrtovanja projektov.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      pertChart: {
        whatIsThis: 'Mrežni diagram, ki prikazuje odvisnosti med nalogami in kritično pot skozi va\u0161 projekt.',
        whyImportant: 'Kaže, katere naloge so odvisne od drugih, in identificira kritično pot \u2014 najdaljšo verigo odvisnih nalog.',
        whatToWrite: 'Generira se samodejno iz odvisnosti med nalogami. Dodajte odvisnosti med nalogami v delovnem načrtu.',
        tips: 'Zagotovite logične odvisnosti. Rezultati DS1 morajo hraniti vhode DS2, kjer je relevantno.',
        euContext: 'PERT diagrami dokazujejo sistematično načrtovanje projektov in razumevanje medsebojnih odvisnosti nalog.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      finance: {
        whatIsThis: 'Proračun projekta \u2014 kako so sredstva razporejena med partnerje, delovne sklope in stroškovne kategorije.',
        whyImportant: 'Proračun mora biti realističen, utemeljen in skladen s pravili EU financiranja.',
        whatToWrite: 'Razporeditve generira UI na podlagi vlog partnerjev in zahtevnosti nalog.',
        tips: 'DS upravljanja ne sme presegati 5\u201315 % skupnega proračuna. Diseminacija naj bo okrog 15 %. Preverite ravnotežje med partnerji.',
        euContext: 'Koherentnost proračuna je ključna. Ocenjevalci preverjajo, ali razporeditve ustrezajo vlogam partnerjev in zahtevam nalog.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      riskMitigation: {
        whatIsThis: 'Strukturirana ocena potencialnih tveganj za projekt in strategije za njihovo preprečevanje ali ublažitev.',
        whyImportant: 'Kaže ocenjevalcem, da ste predvideli, kaj bi se lahko šlo narobe, in ste pripravljeni.',
        whatToWrite: 'Identificirajte 5\u20138 tveganj po kategorijah (tehni\u010Dna, dru\u017Ebena, ekonomska, okoljska) z verjetnostjo, vplivom in ukrepi za ublažitev.',
        tips: 'Vključite realistična tveganja, ne le generičnih. Vsako tveganje mora imeti specifično, izvedljivo strategijo za ublažitev.',
        euContext: 'Kakovost obvladovanja tveganj dokazuje sposobnost strokovnega vodenja projektov.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
    },
  },
  expectedResults: {
    stepTitle: 'Pričakovani rezultati',
    stepIntro: 'Pričakovani rezultati opredeljujejo, kaj bo va\u0161 projekt proizvedel in dosegel. To vključuje otipljive rezultate, merljive dosežke, dolgoročne vplive in ključne izkoriščljive rezultate. Vsebina bo dopolnjena v naslednji seji.',
    fields: {
      outputs: {
        whatIsThis: 'Rezultati (outputs) so otipljivi, konkretni dosežki va\u0161ega projekta \u2014 orodja, poročila, platforme, smernice, učna gradiva.',
        whyImportant: 'Rezultati dokazujejo konkretno produktivnost projekta in vrednost za denar.',
        whatToWrite: 'Navedite specifične, otipljive rezultate, vezane na delovne sklope.',
        tips: 'Vsak rezultat mora biti povezan s specifičnim DS in rezultatom. Bodite konkretni glede formata in obsega.',
        euContext: 'Ocenjevalci preverjajo, ali so rezultati realistični, koristni onkraj projekta in pravilno povezani z aktivnostmi.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      outcomes: {
        whatIsThis: 'Dosežki (outcomes) so kratko- do srednjeročne spremembe, ki nastanejo z uporabo rezultatov.',
        whyImportant: 'Dosežki kažejo resničen učinek va\u0161ega projekta na ciljno skupino.',
        whatToWrite: 'Opišite merljive spremembe v znanju, kompetencah, vedenju ali zmogljivostih va\u0161ih ciljnih skupin.',
        tips: 'Vključite kvantificirane cilje. Dosežki morajo biti merljivi v času ali kmalu po zaključku projekta.',
        euContext: 'Močni dosežki dokazujejo, da projekt ustvarja trajno spremembo, ne le izdelke.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      impacts: {
        whatIsThis: 'Vplivi (impacts) so dolgoročni, \u0161irši učinki va\u0161ega projekta na dru\u017Ebo, gospodarstvo in politike.',
        whyImportant: 'Vplivi utemeljujejo naložbo EU s prikazom sistemske, trajne spremembe.',
        whatToWrite: 'Opišite 3\u20135 dolgoročnih vplivov čez različne dimenzije (dru\u017Ebene, ekonomske, politične, okoljske).',
        tips: 'Vplivi nastanejo PO zaključku projekta. Uporabljajte jezik kot "V 5 letih po zaključku projekta..."',
        euContext: 'Ocena vplivov EU gleda na razširljivost, prenosljivost in prispevek k ciljem politik EU.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
      kers: {
        whatIsThis: 'Klju\u010Dni izkori\u0161\u010Dljivi rezultati (KER) so najdragocenej\u0161i rezultati, ki imajo tržni potencial, pomen za politike ali jih je mogo\u010De prenesti v druge kontekste.',
        whyImportant: 'KER-ji dokazujejo trajnost \u2014 da rezultati projekta živijo naprej in ustvarjajo vrednost po zaključku financiranja.',
        whatToWrite: 'Identificirajte 2\u20134 ključne rezultate s podrobnimi opisi in strategijami izkoriščanja.',
        tips: 'Razmišljajte onkraj projekta: Kdo bo to uporabljal? Kako? Ali se da komercializirati, licencirati ali sprejeti v politike?',
        euContext: 'Izkoriščanje in trajnost sta ključna ocenjevalna kriterija, zlasti v Horizon Europe in Erasmus+.',
        example: 'Placeholder \u2014 polna vsebina v naslednji seji.',
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

export function getStepGuide(stepKey: string, lang: GuideLanguage): StepGuide | null {
  var source = lang === 'si' ? GUIDE_SI : GUIDE_EN;
  return source[stepKey] || null;
}

export function getFieldGuide(stepKey: string, fieldKey: string, lang: GuideLanguage): GuideEntry | null {
  var source = lang === 'si' ? GUIDE_SI : GUIDE_EN;
  var step = source[stepKey];
  if (!step) return null;
  return step.fields[fieldKey] || null;
}

export function getStepIntro(stepKey: string, lang: GuideLanguage): string {
  var source = lang === 'si' ? GUIDE_SI : GUIDE_EN;
  var step = source[stepKey];
  return step ? step.stepIntro : '';
}

export function getAllFieldKeys(stepKey: string): string[] {
  var step = GUIDE_EN[stepKey];
  if (!step) return [];
  return Object.keys(step.fields);
}
