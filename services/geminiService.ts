import { GoogleGenAI, Type } from "@google/genai";
import { storageService } from './storageService.ts';
import { getAppInstructions } from './Instructions.ts';
import { detectProjectLanguage as detectLanguage } from '../utils.ts';

// Check if a valid key is available from either storage or env
export const hasValidApiKey = (): boolean => {
    const storedKey = storageService.getApiKey();
    if (storedKey && storedKey.trim().length > 30 && storedKey.startsWith('AIza')) {
        return true;
    }

    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        const envKey = process.env.API_KEY.trim();
        if (envKey.length > 30 && envKey.startsWith('AIza')) {
            return true;
        }
    }

    return false;
};

// Dynamic client creator
const getAIClient = (): GoogleGenAI => {
    const userKey = storageService.getApiKey();
    if (userKey && userKey.trim().length > 0 && userKey.startsWith('AIza')) {
        return new GoogleGenAI({ apiKey: userKey });
    }

    if (typeof process !== 'undefined' && process.env?.API_KEY && process.env.API_KEY.startsWith('AIza')) {
        return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    throw new Error("MISSING_API_KEY");
};

// Helper to get the model name (default or custom)
const getModel = (): string => {
    const custom = storageService.getCustomModel();
    return custom || 'gemini-3-pro-preview';
};

// Error Handler helper
const handleGeminiError = (e: any): never => {
    const msg = e.message || e.toString();

    if (msg === 'MISSING_API_KEY' || msg.includes('400') || msg.includes('403') || msg.includes('API key not valid')) {
        throw new Error('MISSING_API_KEY');
    }

    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("Google Gemini API Quota Exceeded. You have reached the limit for the free tier. Please try again later or switch to a paid plan.");
    }

    console.error("Gemini API Error:", e);
    throw new Error(`AI Generation Failed: ${msg.substring(0, 100)}...`);
};

// Validate the API key by making a lightweight call
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey || apiKey.trim().length < 30 || !apiKey.startsWith('AIza')) {
        console.warn("API Key validation failed: Key format invalid (Must start with AIza).");
        return false;
    }

    try {
        const client = new GoogleGenAI({ apiKey: apiKey });
        await client.models.countTokens({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: "test" }] }]
        });
        return true;
    } catch (error) {
        console.error("API Key Validation Failed:", error);
        return false;
    }
};

// Helper to stringify project data for prompts
const getContext = (projectData: any): string => {
    let context = "Here is the current project information (Context):\n";
    if (projectData.problemAnalysis?.coreProblem?.title) {
        context += `Problem Analysis: ${JSON.stringify(projectData.problemAnalysis, null, 2)}\n`;
    }
    if (projectData.projectIdea?.mainAim) {
        context += `Project Idea: ${JSON.stringify(projectData.projectIdea, null, 2)}\n`;
    }
    if (projectData.generalObjectives?.length > 0) {
        context += `General Objectives: ${JSON.stringify(projectData.generalObjectives, null, 2)}\n`;
    }
    if (projectData.specificObjectives?.length > 0) {
        context += `Specific Objectives: ${JSON.stringify(projectData.specificObjectives, null, 2)}\n`;
    }
    if (projectData.activities?.length > 0) {
        context += `Activities (Work Packages): ${JSON.stringify(projectData.activities, null, 2)}\n`;
    }
    if (projectData.outputs?.length > 0) {
        context += `Outputs: ${JSON.stringify(projectData.outputs, null, 2)}\n`;
    }
    if (projectData.outcomes?.length > 0) {
        context += `Outcomes: ${JSON.stringify(projectData.outcomes, null, 2)}\n`;
    }
    if (projectData.impacts?.length > 0) {
        context += `Impacts: ${JSON.stringify(projectData.impacts, null, 2)}\n`;
    }

    return context;
};

// --- SCHEMAS FOR JSON MODE ---
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

const schemas = {
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
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                    },
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

const isValidDate = (d: any): boolean => d instanceof Date && !isNaN(d.getTime());

const sanitizeActivities = (activities: any[]): any[] => {
    const taskMap = new Map();
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

                        if (pred && curr && isValidDate(pred.startDate) && isValidDate(pred.endDate) && isValidDate(curr.startDate)) {
                            if (dep.type === 'FS') {
                                if (curr.startDate <= pred.endDate) {
                                    dep.type = 'SS';
                                }
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

    if (typeof original === 'string') {
        return original.trim().length > 0 ? original : generated;
    }

    if (Array.isArray(original) && Array.isArray(generated)) {
        const length = Math.max(original.length, generated.length);
        const mergedArray: any[] = [];
        for (let i = 0; i < length; i++) {
            if (i < original.length) {
                mergedArray.push(smartMerge(original[i], generated[i]));
            } else {
                mergedArray.push(generated[i]);
            }
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

// --- HELPER TO GET RULES FROM INSTRUCTIONS (language-aware) ---
const getRulesForSection = (sectionKey: string, language: 'en' | 'si' = 'en'): string => {
    const instructions = getAppInstructions(language);
    let chapterKey: string | null = null;

    if (sectionKey === 'problemAnalysis') chapterKey = "1";
    else if (sectionKey === 'projectIdea') chapterKey = "2";
    else if (['generalObjectives', 'specificObjectives'].includes(sectionKey)) chapterKey = "3_AND_4";
    else if (['activities', 'projectManagement', 'risks'].includes(sectionKey)) chapterKey = "5";
    else if (['outputs', 'outcomes', 'impacts', 'kers'].includes(sectionKey)) chapterKey = "6";

    if (chapterKey && instructions.CHAPTERS[chapterKey]) {
        const rules = instructions.CHAPTERS[chapterKey].RULES || [];
        return rules.length > 0 ? `\nSTRICT RULES FOR THIS SECTION:\n- ${rules.join('\n- ')}\n` : '';
    }
    return '';
};

const getPromptAndSchemaForSection = (sectionKey: string, projectData: any, language: 'en' | 'si' = 'en', mode: string = 'regenerate', currentSectionData: any = null) => {
    const context = getContext(projectData);
    let prompt = '';
    let schema: any;

    // Retrieve language-specific instructions
    const rules = getRulesForSection(sectionKey, language);
    const instructions = getAppInstructions(language);
    const globalRules = instructions.GLOBAL_RULES.join('\n');

    const languageInstruction = language === 'si'
        ? "KRITIČNO: Uporabnik je izbral SLOVENŠČINO. Celoten odgovor (naslovi, opisi, kazalniki itd.) MORA biti v SLOVENSKEM jeziku. Tudi če je podan kontekst v angleščini, MORAŠ generirati novo vsebino v slovenščini. Zagotovi visokokakovostno strokovno slovensko terminologijo."
        : "CRITICAL: The user has selected ENGLISH language. Write the response in English. If the context is in Slovenian, translate the logic/ideas into English for the new content.";

    const fillInstruction = mode === 'fill'
        ? `
    IMPORTANT: COMPLETION MODE.
    The user has provided existing data for this section: ${JSON.stringify(currentSectionData)}.
    Your task is to COMPLETE this data structure.
    RULES:
    1. KEEP all existing non-empty fields exactly as they are.
    2. GENERATE professional content ONLY for fields that are empty strings ("") or missing.
    3. If a list has fewer items than recommended (see RULES below), ADD NEW ITEMS.
    4. Ensure the final output is a valid JSON object matching the full schema.
    `
        : (language === 'si'
            ? "Generiraj popolnoma nov, celovit odgovor za ta razdelek na podlagi konteksta."
            : "Generate a completely new, full response for this section based on the context.");

    const commonPromptStart = `${context}\n${languageInstruction}\n${fillInstruction}\n\n${language === 'si' ? 'GLOBALNA PRAVILA' : 'GLOBAL RULES'}:\n${globalRules}\n\n${rules}\n`;

    switch (sectionKey) {
        case 'problemAnalysis':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? `Na podlagi osrednjega problema "${projectData.problemAnalysis?.coreProblem?.title || ''}" ustvari (ali dopolni) zelo podrobno analizo problemov v skladu s pravili.`
                : `Based on the core problem "${projectData.problemAnalysis?.coreProblem?.title || ''}", create (or complete) a very detailed problem analysis following the rules provided.`}`;
            schema = schemas.problemAnalysis;
            break;
        case 'projectIdea':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Na podlagi analize problemov razvij (ali dopolni) celovito projektno idejo. Upoštevaj posebna pravila oblikovanja za predlagano rešitev.'
                : 'Based on the problem analysis, develop (or complete) a comprehensive project idea. Follow the specific formatting rules for the Proposed Solution.'}`;
            schema = schemas.projectIdea;
            break;
        case 'generalObjectives':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Opredeli (ali dopolni) 3 do 5 širokih splošnih ciljev. Dosledno upoštevaj pravilo skladnje z GLAGOLOM V NEDOLOČNIKU.'
                : 'Define (or complete) 3 to 5 broader, overall general objectives. Adhere strictly to the INFINITIVE VERB syntax rule.'}`;
            schema = schemas.objectives;
            break;
        case 'specificObjectives':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Opredeli (ali dopolni) vsaj 5 ustvarjalnih, specifičnih S.M.A.R.T. ciljev. Dosledno upoštevaj pravilo skladnje z GLAGOLOM V NEDOLOČNIKU.'
                : 'Define (or complete) at least 5 creative, specific S.M.A.R.T. objectives. Adhere strictly to the INFINITIVE VERB syntax rule.'}`;
            schema = schemas.objectives;
            break;
        case 'projectManagement':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Ustvari VISOKO PROFESIONALEN, PODROBEN razdelek \'Upravljanje in organizacija\' v skladu s strogimi EU najboljšimi praksami in posebnimi vsebinskimi pravili.'
                : 'Create a HIGHLY PROFESSIONAL, DETAILED \'Management and Organization\' section following strict EU best practices and the specific content rules provided.'}`;
            schema = schemas.projectManagement;
            break;
        case 'activities':
            const today = new Date().toISOString().split('T')[0];
            const projectStart = projectData.projectIdea?.startDate || today;
            const startDateInstruction = language === 'si'
                ? `Projekt se strogo začne dne ${projectStart}. Vsi začetni datumi nalog MORAJO biti na ali po tem datumu.`
                : `The project is strictly scheduled to start on ${projectStart}. All task Start Dates MUST be on or after this date.`;

            prompt = `${commonPromptStart}\n${startDateInstruction}\n${language === 'si'
                ? 'Na podlagi specifičnih ciljev in rezultatov oblikuj (ali dopolni) podroben nabor delovnih sklopov (DS) v skladu s pravili glede količine, nalog in logike.'
                : 'Based on the specific objectives and outputs, design (or complete) a detailed set of Work Packages (WPs) following the rules regarding quantity, tasks, and logic.'}`;
            schema = schemas.activities;
            break;
        case 'outputs':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Navedi (ali dopolni) vsaj 6 zelo podrobnih, oprijemljivih neposrednih rezultatov (predvidenih rezultatov).'
                : 'List (or complete) at least 6 very detailed, tangible results (deliverables).'}`;
            schema = schemas.results;
            break;
        case 'outcomes':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Opiši (ali dopolni) vsaj 6 vmesnih učinkov (srednjeročne spremembe).'
                : 'Describe (or complete) at least 6 intangible results (medium-term changes).'}`;
            schema = schemas.results;
            break;
        case 'impacts':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Opiši (ali dopolni) vsaj 6 dolgoročnih vplivov.'
                : 'Describe (or complete) at least 6 long-term impacts.'}`;
            schema = schemas.results;
            break;
        case 'risks':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Identificiraj (ali dopolni) vsaj 5 potencialnih kritičnih tveganj (Tehnično, Družbeno, Ekonomsko) z ustrezno logiko semaforja za izvoz v Docx.'
                : 'Identify (or complete) at least 5 potential critical risks (Technical, Social, Economic) with correct Traffic Light coloring logic for Docx export in mind.'}`;
            schema = schemas.risks;
            break;
        case 'kers':
            prompt = `${commonPromptStart}\n${language === 'si'
                ? 'Identificiraj (ali dopolni) vsaj 5 ključnih izkoriščljivih rezultatov (KIR).'
                : 'Identify (or complete) at least 5 Key Exploitable Results (KERs).'}`;
            schema = schemas.kers;
            break;
        default:
            throw new Error(`Unknown section key: ${String(sectionKey)}`);
    }
    return { prompt, schema };
};

export const generateSectionContent = async (sectionKey: string, projectData: any, language: 'en' | 'si' = 'en', mode: string = 'regenerate') => {
    try {
        const ai = getAIClient();
        const currentModel = getModel();
        const currentSectionData = projectData[sectionKey];

        const { prompt, schema } = getPromptAndSchemaForSection(sectionKey, projectData, language, mode, currentSectionData);

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonStr = response.text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
        let parsedData = JSON.parse(jsonStr);

        if (sectionKey === 'projectIdea' && jsonStr.startsWith('[')) {
            throw new Error("API returned an array for projectIdea section, expected an object.");
        }

        if (sectionKey === 'activities' && Array.isArray(parsedData)) {
            parsedData = sanitizeActivities(parsedData);
        }

        if (sectionKey === 'projectIdea' && parsedData.proposedSolution) {
            let text = parsedData.proposedSolution;
            text = text.replace(/([^\n])\s*((?:\*\*|__)?(?:Faza|Phase)\s+\d+(?::|\.)(?:\*\*|__)?)/g, '$1\n\n$2');
            parsedData.proposedSolution = text;
        }

        if (mode === 'fill' && currentSectionData) {
            parsedData = smartMerge(currentSectionData, parsedData);
        }

        return parsedData;
    } catch (e) {
        handleGeminiError(e);
    }
};

const getPromptForField = (path: (string | number)[], projectData: any, language: 'en' | 'si' = 'en') => {
    const context = getContext(projectData);
    const fieldName = path[path.length - 1];
    const sectionName = path[0];

    const languageInstruction = language === 'si'
        ? "POMEMBNO: Odgovor napiši strogo v slovenskem jeziku. Če je kontekst v drugem jeziku, ga ignoriraj in piši v slovenščini."
        : "Provide the response in English.";

    // Inject language-specific global rules
    const instructions = getAppInstructions(language);
    const globalRules = instructions.GLOBAL_RULES.join('\n');

    let extraInstruction = "";
    if (fieldName === 'likelihood' || fieldName === 'impact') {
        extraInstruction = "RETURN ONLY ONE WORD: 'Low', 'Medium', or 'High'.";
    }

    let specificContext = "";
    if (path.includes('milestones')) {
        if (fieldName === 'date') {
            const projectStartDate = projectData.projectIdea?.startDate || new Date().toISOString().split('T')[0];
            const wpIdx = path[1];
            const msIdx = path[3];
            const milestoneDesc = projectData.activities?.[wpIdx as number]?.milestones?.[msIdx as number]?.description || "the current milestone";

            specificContext = language === 'si' ? "datum za mejnik" : "a date for a Milestone";
            extraInstruction += `
            CONTEXT:
            - Project Start Date: ${projectStartDate}
            - Milestone Description: "${milestoneDesc}"
            
            TASK: Estimate a realistic completion date for this milestone relative to the project start.
            FORMAT: Return ONLY the date string in 'YYYY-MM-DD' format. No other text.
            `;
        } else {
            specificContext = language === 'si'
                ? `mejnik v delovnem sklopu na poti ${JSON.stringify(path)}`
                : `a Milestone in the Work Package defined in the path ${JSON.stringify(path)}`;
            extraInstruction += language === 'si'
                ? "\nOpiši ta specifični mejnik jedrnato."
                : "\nDescribe this specific Milestone concisely.";
        }
    } else if (path.includes('tasks')) {
        specificContext = language === 'si'
            ? `nalogo v delovnem sklopu na poti ${JSON.stringify(path)}`
            : `a Task in the Work Package defined in the path ${JSON.stringify(path)}`;
        extraInstruction += language === 'si'
            ? "\nOpiši tehnične podrobnosti te specifične naloge."
            : "\nDescribe this specific Task technical details.";
    } else if (path.includes('deliverables')) {
        specificContext = language === 'si'
            ? `predvideni rezultat v delovnem sklopu na poti ${JSON.stringify(path)}`
            : `a Deliverable in the Work Package defined in the path ${JSON.stringify(path)}`;
        extraInstruction += language === 'si'
            ? "\nOpiši ta specifični predvideni rezultat."
            : "\nDescribe this specific Deliverable.";
    } else if (path.includes('risks')) {
        specificContext = language === 'si' ? "specifično tveganje" : "a specific Risk";
    } else {
        specificContext = language === 'si'
            ? `polje "${String(fieldName)}"`
            : `the field "${String(fieldName)}"`;
    }

    const prompt = `${context}\n${languageInstruction}\n${language === 'si' ? 'GLOBALNA PRAVILA' : 'GLOBAL RULES'}:\n${globalRules}\n\n${extraInstruction}\n${language === 'si'
        ? `Generiraj profesionalno in jedrnato vrednost za ${specificContext} znotraj razdelka "${String(sectionName)}" projektnega predloga. Vrni samo besedilno vrednost, brez dodatnega oblikovanja.`
        : `Generate a professional and concise value for ${specificContext} within the "${String(sectionName)}" section of the project proposal. Just return the text value, no extra formatting.`}`;
    return { prompt };
};

export const generateFieldContent = async (path: (string | number)[], projectData: any, language: 'en' | 'si' = 'en') => {
    try {
        const ai = getAIClient();
        const currentModel = getModel();
        const { prompt } = getPromptForField(path, projectData, language);

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
        });

        return response.text.trim();
    } catch (e) {
        handleGeminiError(e);
    }
};

export const generateProjectSummary = async (projectData: any, language: 'en' | 'si' = 'en') => {
    try {
        const ai = getAIClient();
        const currentModel = getModel();
        const context = getContext(projectData);

        const languageInstruction = language === 'si'
            ? "Napiši povzetek v profesionalnem slovenskem jeziku."
            : "Write the summary in professional English language.";

        const syntaxRule = language === 'si'
            ? "KRITIČNO PRAVILO SKLADNJE: Ko navajš ključne cilje, MORAŠ uporabiti GLAGOLE V NEDOLOČNIKU (npr. 'Razviti', 'Vzpostaviti')."
            : "CRITICAL SYNTAX RULE: When listing Key Objectives or Goals, you MUST use INFINITIVE verbs (e.g. 'To develop', 'To establish').";

        const terminologyRule = language === 'si'
            ? "TERMINOLOGIJA: Uporabi standardno EU terminologijo intervencijske logike v slovenščini."
            : "TERMINOLOGY: Use standard EU Intervention Logic terminology.";

        const prompt = `
        ${context}
        ${languageInstruction}
        
        ${language === 'si'
            ? 'Ustvari jedrnat, visoko profesionalen in prepričljiv 1-stranski povzetek tega projektnega predloga.'
            : 'Create a concise, highly professional, and persuasive 1-page summary of this project proposal.'}
        
        ${syntaxRule}
        ${terminologyRule}
        
        ${language === 'si'
            ? 'Oblikuj izhod z uporabo enostavnega Markdown za strukturo.'
            : 'Format the output using simple Markdown for structure.'}
        `;

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
        });

        return response.text.trim();
    } catch (e) {
        handleGeminiError(e);
    }
};

export const translateProjectContent = async (projectData: any, targetLanguage: 'en' | 'si') => {
    try {
        const ai = getAIClient();
        const currentModel = getModel();
        const langName = targetLanguage === 'si' ? 'Slovenian' : 'English';
        const prompt = `
        You are a professional translator for EU Project Proposals.
        Translate the following JSON object strictly into ${langName}.
        RULES:
        1. Maintain the EXACT JSON structure.
        2. Only translate the text values (strings).
        3. Ensure high-quality, professional terminology.
        4. Return ONLY the valid JSON string.

        JSON to Translate:
        ${JSON.stringify(projectData)}
        `;

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const jsonStr = response.text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
        return JSON.parse(jsonStr);
    } catch (e: any) {
        if (e.message === 'MISSING_API_KEY' || e.message?.includes('400') || e.message?.includes('403')) {
            throw new Error('MISSING_API_KEY');
        }
        if (e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED')) {
            throw new Error("Google Gemini API Quota Exceeded. Please try again later.");
        }
        console.error("Failed to parse translation response:", e);
        throw new Error("Translation failed: Malformed JSON returned.");
    }
};

/**
 * Re-exported from utils.ts for backward compatibility.
 * Components that import detectProjectLanguage from geminiService will still work.
 */
export const detectProjectLanguage = detectLanguage;
