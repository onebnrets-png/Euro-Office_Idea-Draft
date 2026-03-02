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
    stepIntro: 'Activities is the most complex section — it defines HOW your project will be implemented. This includes the management structure, consortium, work packages, timeline, budget, and risk management. Content will be expanded in the next session.',
    fields: {
      implementation: {
        whatIsThis: 'The implementation description covers project management structure, decision-making, quality assurance, and communication.',
        whyImportant: 'Shows evaluators your project is well-organized and professionally managed.',
        whatToWrite: 'Describe the management approach, decision-making bodies, quality control, and internal communication.',
        tips: 'Include Steering Committee, Advisory Board, and WP leader structure. Define meeting frequency and escalation procedures.',
        euContext: 'Management quality is a significant scoring criterion — typically 15-20% of the total.',
        example: 'Placeholder — full content in next session.',
      },
      organigram: {
        whatIsThis: 'A visual organizational chart showing the project\'s governance structure.',
        whyImportant: 'Provides immediate visual clarity about who does what and reporting lines.',
        whatToWrite: 'Generated automatically from your management structure and partner data.',
        tips: 'Ensure all WP leaders are assigned. The coordinator should be clearly at the top.',
        euContext: 'Evaluators appreciate clear visual governance. A messy organigram signals poor planning.',
        example: 'Placeholder — full content in next session.',
      },
      partners: {
        whatIsThis: 'The consortium composition — which organizations participate, from which countries, with what expertise.',
        whyImportant: 'The right consortium is critical. EU projects require transnational partnerships with complementary skills.',
        whatToWrite: 'Define each partner\'s name, country, type, role, and specific expertise relevant to the project.',
        tips: 'Aim for geographic diversity, complementary expertise, and a balanced mix of partner types.',
        euContext: 'Evaluators check geographic balance, expertise coverage, and whether each partner has a clear, justified role.',
        example: 'Placeholder — full content in next session.',
      },
      workplan: {
        whatIsThis: 'The structured work plan consisting of Work Packages (WPs), tasks, milestones, and deliverables.',
        whyImportant: 'The workplan is the operational core. It must show a logical, efficient, and feasible implementation path.',
        whatToWrite: 'Each WP needs a title, description, tasks with dates, milestones, and deliverables.',
        tips: 'Ensure tasks within a WP are logically sequenced. Last two WPs should always be Dissemination and Project Management.',
        euContext: 'Evaluators assess whether the workplan is realistic, well-structured, and has appropriate monitoring points.',
        example: 'Placeholder — full content in next session.',
      },
      ganttChart: {
        whatIsThis: 'A visual timeline showing all tasks, their duration, and overlaps across the project lifecycle.',
        whyImportant: 'Provides immediate visual understanding of the project schedule and task relationships.',
        whatToWrite: 'Generated automatically from your workplan data. Ensure all tasks have start and end dates.',
        tips: 'Check that no task extends beyond the project end date. PM WP should span the entire project.',
        euContext: 'A well-structured Gantt chart shows professional project planning capability.',
        example: 'Placeholder — full content in next session.',
      },
      pertChart: {
        whatIsThis: 'A network diagram showing task dependencies and the critical path through your project.',
        whyImportant: 'Shows which tasks depend on others and identifies the critical path — the longest chain of dependent tasks.',
        whatToWrite: 'Generated automatically from your task dependencies. Add dependencies between tasks in the workplan.',
        tips: 'Ensure logical dependencies. WP1 outputs should feed into WP2 inputs where relevant.',
        euContext: 'PERT charts demonstrate systematic project planning and understanding of task interdependencies.',
        example: 'Placeholder — full content in next session.',
      },
      finance: {
        whatIsThis: 'The project budget — how funds are allocated across partners, work packages, and cost categories.',
        whyImportant: 'Budget must be realistic, justified, and compliant with EU funding rules.',
        whatToWrite: 'Allocations are generated by AI based on partner roles and task complexity.',
        tips: 'PM WP should not exceed 5-15% of total budget. Dissemination should be around 15%. Check partner balance.',
        euContext: 'Budget coherence is critical. Evaluators check whether allocations match partner roles and task requirements.',
        example: 'Placeholder — full content in next session.',
      },
      riskMitigation: {
        whatIsThis: 'A structured assessment of potential risks to the project and strategies to prevent or mitigate them.',
        whyImportant: 'Shows evaluators you have anticipated what could go wrong and are prepared.',
        whatToWrite: 'Identify 5-8 risks across categories (technical, social, economic, environmental) with likelihood, impact, and mitigation.',
        tips: 'Include realistic risks, not just generic ones. Each risk should have a specific, actionable mitigation strategy.',
        euContext: 'Risk management quality demonstrates professional project management capability.',
        example: 'Placeholder — full content in next session.',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STEP 6: EXPECTED RESULTS (placeholder for next session)
  // ─────────────────────────────────────────────────────────────
  expectedResults: {
    stepTitle: 'Expected Results',
    stepIntro: 'Expected Results define what your project will produce and achieve. This includes tangible outputs, measurable outcomes, long-term impacts, and key exploitable results. Content will be expanded in the next session.',
    fields: {
      outputs: {
        whatIsThis: 'Outputs are the tangible, concrete deliverables your project produces — tools, reports, platforms, guidelines, training materials.',
        whyImportant: 'Outputs demonstrate the project\'s concrete productivity and value for money.',
        whatToWrite: 'List specific, tangible results tied to work packages.',
        tips: 'Each output should be linked to a specific WP and deliverable. Be concrete about format and scope.',
        euContext: 'Evaluators check whether outputs are realistic, useful beyond the project, and properly linked to activities.',
        example: 'Placeholder — full content in next session.',
      },
      outcomes: {
        whatIsThis: 'Outcomes are the short-to-medium-term changes that result from using the outputs.',
        whyImportant: 'Outcomes show the real-world effect of your project on the target group.',
        whatToWrite: 'Describe measurable changes in knowledge, skills, behavior, or capacity in your target groups.',
        tips: 'Include quantified targets. Outcomes should be measurable within or shortly after the project.',
        euContext: 'Strong outcomes demonstrate that the project creates lasting change, not just products.',
        example: 'Placeholder — full content in next session.',
      },
      impacts: {
        whatIsThis: 'Impacts are the long-term, broader effects of your project on society, economy, and policy.',
        whyImportant: 'Impacts justify the EU investment by showing systemic, lasting change.',
        whatToWrite: 'Describe 3-5 long-term impacts across different dimensions (social, economic, policy, environmental).',
        tips: 'Impacts occur AFTER the project ends. Use language like "In the 5 years following project completion..."',
        euContext: 'EU impact assessment looks at scalability, transferability, and contribution to EU policy goals.',
        example: 'Placeholder — full content in next session.',
      },
      kers: {
        whatIsThis: 'Key Exploitable Results (KERs) are the most valuable outputs that have market potential, policy relevance, or can be transferred to other contexts.',
        whyImportant: 'KERs demonstrate sustainability — that project results live on and create value after funding ends.',
        whatToWrite: 'Identify 2-4 key results with detailed descriptions and exploitation strategies.',
        tips: 'Think beyond the project: Who will use this? How? Can it be commercialized, licensed, or adopted by policy?',
        euContext: 'Exploitation and sustainability are key evaluation criteria, especially in Horizon Europe and Erasmus+.',
        example: 'Placeholder — full content in next session.',
      },
    },
  },
};

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
