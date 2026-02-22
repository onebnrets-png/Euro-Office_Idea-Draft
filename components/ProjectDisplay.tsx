// components/ProjectDisplay.tsx
// ═══════════════════════════════════════════════════════════════
// v6.0 — 2026-02-22 — NEW: Partnership & Finance UI renderers
//   - NEW: renderPartners() — full consortium management UI
//   - NEW: renderFinance() — budget overview with direct/indirect costs
//   - renderActivities() now calls renderPartners() and renderFinance()
//   - Import PM_HOURS_PER_MONTH and cost constants from types.ts
//   - All previous v5.1 changes preserved.
//
// v5.1 — 2026-02-21 — FIX: YELLOW BACKGROUND BLEED-THROUGH ON CHARTS
// v5.0 — 2026-02-17 — DESIGN SYSTEM CARD LAYOUT + MICRO ANIMATIONS
// v4.9 — 2026-02-17 — INLINE CHARTS FOR ALL DESCRIPTION FIELDS
// v4.8 — 2026-02-16 — SECTION GENERATE BUTTONS FOR ALL SUB-SECTIONS
// v4.7 — 2026-02-14 — FIXES (risks, deliverables, scroll IDs)
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';
import { ICONS, getReadinessLevelsDefinitions, getSteps } from '../constants.tsx';
import { TEXT } from '../locales.ts';
import GanttChart from './GanttChart.tsx';
import PERTChart from './PERTChart.tsx';
import Organigram from './Organigram.tsx';
import { recalculateProjectSchedule } from '../utils.ts';
import InlineChart from './InlineChart.tsx';
import { stepColors } from '../design/theme.ts';
import StepNavigationBar from './StepNavigationBar.tsx';
import {
    PM_HOURS_PER_MONTH,
    CENTRALIZED_DIRECT_COSTS,
    CENTRALIZED_INDIRECT_COSTS,
    DECENTRALIZED_DIRECT_COSTS,
    DECENTRALIZED_INDIRECT_COSTS
} from '../types.ts';

const FieldHeader = ({ title, description, id = '', accentColor = '' }) => (
    <div className="mb-3 pt-5 animate-fadeIn" id={id}>
        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            {accentColor && <span style={{ width: 3, height: 20, borderRadius: 2, background: accentColor, flexShrink: 0 }} />}
            {title}
        </h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
    </div>
);

const SectionHeader = ({ title, onAdd, addText, children, accentColor = '' }: { title: string; onAdd?: () => void; addText?: string; children?: React.ReactNode; accentColor?: string }) => (
    <div
        className={`flex justify-between items-end mb-4 pt-6 pb-2 animate-fadeIn ${!accentColor ? 'border-b border-slate-200' : ''}`}
        style={accentColor ? { borderBottom: `2px solid ${accentColor}` } : undefined}
    >
        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            {accentColor && <span style={{ width: 4, height: 22, borderRadius: 3, background: accentColor, flexShrink: 0 }} />}
            {title}
        </h3>
        <div className="flex gap-2 items-center">
            {children}
            {onAdd && (
                <button
                    onClick={onAdd}
                    className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 hover:shadow-md active:scale-95"
                    style={{ background: accentColor || '#0284c7' }}
                >
                    <span className="text-base leading-none font-bold">+</span> {addText}
                </button>
            )}
        </div>
    </div>
);

const RemoveButton = ({ onClick, text }) => (
    <button onClick={onClick} className="ml-2 px-2.5 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-100 hover:border-red-200 active:scale-95">
        {text}
    </button>
);

const GenerateButton = ({ onClick, isLoading, isField = false, title, text = '', missingApiKey = false }) => (
    <button
        onClick={onClick}
        disabled={!!isLoading}
        className={`flex items-center justify-center font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95
            ${isField 
                ? (missingApiKey ? 'p-1.5 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' : 'p-1.5 bg-white text-sky-600 border border-sky-200 hover:bg-sky-50 hover:shadow-md')
                : (missingApiKey ? 'px-3 py-1.5 text-sm bg-amber-500 text-white hover:bg-amber-600' : 'px-3.5 py-1.5 text-sm bg-white text-sky-700 border border-sky-200 hover:bg-sky-50 hover:shadow-md')
            }`
        }
        title={missingApiKey ? "Setup API Key" : title}
    >
        {isLoading ? (
            <div className={`mr-1.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin ${isField ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        ) : (
            missingApiKey ? <ICONS.LOCK className={`mr-1.5 ${isField ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} /> : <ICONS.SPARKLES className={`mr-1.5 ${isField ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        )}
        {isField ? '' : text}
    </button>
);

const TextArea = ({ label, path, value, onUpdate, onGenerate, isLoading, placeholder, rows = 5, generateTitle, missingApiKey, className = "mb-5 w-full group" }) => {
    const enGen = TEXT.en.generating;
    const siGen = TEXT.si.generating;
    const fieldIsLoading = isLoading === `${enGen} ${String(path[path.length - 1])}...` || isLoading === `${siGen} ${String(path[path.length - 1])}...`;
    
    const textAreaRef = useRef(null);
    
    const adjustHeight = useCallback(() => {
        const el = textAreaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, []);
    
    useEffect(() => {
        adjustHeight();
        const rafId = requestAnimationFrame(() => {
            adjustHeight();
        });
        return () => cancelAnimationFrame(rafId);
    }, [value, adjustHeight]);

    useEffect(() => {
        const el = textAreaRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => {
            adjustHeight();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [adjustHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [adjustHeight]);

    return (
        <div className={className}>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5 tracking-wide">{label}</label>
            <div className="relative">
                <textarea
                    ref={textAreaRef}
                    data-path={path.join(',')}
                    value={value || ''}
                    onChange={(e) => onUpdate(path, e.target.value)}
                    onInput={adjustHeight}
                    className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 pr-10 resize-none overflow-hidden block text-base leading-relaxed shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                    rows={rows}
                    placeholder={placeholder}
                />
                <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100">
                     <GenerateButton onClick={() => onGenerate(path)} isLoading={fieldIsLoading} isField title={generateTitle} missingApiKey={missingApiKey} />
                </div>
            </div>
        </div>
    );
};

const ReadinessLevelSelector = ({ readinessLevels, onUpdateData, onGenerateField, onGenerateSection, isLoading, language, missingApiKey }) => {
    const t = TEXT[language] || TEXT['en'];
    const definitions = getReadinessLevelsDefinitions(language);

    const handleLevelChange = (levelKey, value) => {
        onUpdateData(['projectIdea', 'readinessLevels', levelKey, 'level'], value);
    };

    return (
        <div id="readiness-levels" className="mt-8">
            <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-700">{t.readinessLevels}</h3>
                    <p className="text-sm text-slate-500 mt-1">{t.readinessLevelsDesc}</p>
                </div>
                <GenerateButton 
                    onClick={() => onGenerateSection('readinessLevels')} 
                    isLoading={isLoading === `${t.generating} readinessLevels...`} 
                    title={t.generateSection} 
                    text={t.generateAI} 
                    missingApiKey={missingApiKey} 
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(definitions).map(([key, def]) => {
                    const levelKey = key;
                    const selectedLevelData = readinessLevels ? readinessLevels[levelKey] : { level: null, justification: '' };

                    return (
                        <div key={key} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col hover:shadow-md transition-all card-hover animate-fadeIn">
                            <div className="mb-3">
                                <h4 className="font-bold text-slate-800 text-base">{def.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">{def.description}</p>
                            </div>
                            
                            <select
                                value={selectedLevelData?.level || ''}
                                onChange={(e) => handleLevelChange(levelKey, e.target.value ? parseInt(e.target.value, 10) : null)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg mb-4 text-base bg-slate-50 focus:bg-white transition-colors"
                            >
                                <option value="">{t.notSelected}</option>
                                {def.levels.map(l => (
                                    <option key={l.level} value={l.level}>
                                        {`${key} ${l.level}: ${l.title}`}
                                    </option>
                                ))}
                            </select>
                            
                            <div className="flex-grow flex flex-col">
                                <TextArea
                                    label={t.justification}
                                    path={['projectIdea', 'readinessLevels', levelKey, 'justification']}
                                    value={selectedLevelData?.justification || ''}
                                    onUpdate={onUpdateData}
                                    onGenerate={onGenerateField}
                                    isLoading={isLoading}
                                    rows={2}
                                    placeholder={t.justificationPlaceholder}
                                    generateTitle={`${t.generateField} ${t.justification}`}
                                    missingApiKey={missingApiKey}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DependencySelector = ({ task, allTasks, onAddDependency, onRemoveDependency, language }) => {
    const t = TEXT[language] || TEXT['en'];
    const [selectedId, setSelectedId] = React.useState('');
    const [selectedType, setSelectedType] = React.useState('FS');

    const handleAdd = () => {
        if (selectedId) {
            onAddDependency({ predecessorId: selectedId, type: selectedType });
            setSelectedId('');
        }
    };

    const availableTasks = allTasks.filter(t => t.id !== task.id && !(task.dependencies || []).some(d => d.predecessorId === t.id));

    return (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h6 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">{t.dependencies}</h6>
            <div className="flex gap-2 mb-2">
                <select 
                    className="flex-1 text-sm p-1.5 rounded border border-slate-300 bg-white" 
                    value={selectedId} 
                    onChange={e => setSelectedId(e.target.value)}
                >
                    <option value="">{t.predecessor}...</option>
                    {availableTasks.map(at => (
                        <option key={at.id} value={at.id}>{at.id}: {at.title.substring(0, 30)}...</option>
                    ))}
                </select>
                <select 
                    className="w-24 text-sm p-1.5 rounded border border-slate-300 bg-white"
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                >
                    {Object.keys(t.depTypes).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <button onClick={handleAdd} disabled={!selectedId} className="px-3 bg-sky-600 text-white rounded font-bold hover:bg-sky-700 disabled:opacity-50 transition-colors">+</button>
            </div>
            <div className="space-y-1.5">
                {(task.dependencies || []).map((dep, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white px-2 py-1.5 rounded border border-slate-200 text-xs shadow-sm">
                        <span className="text-slate-700">{t.predecessor}: <strong className="text-sky-700">{dep.predecessorId}</strong> <span className="text-slate-400">({dep.type})</span></span>
                        <button onClick={() => onRemoveDependency(idx)} className="text-red-400 hover:text-red-600 font-bold ml-2 px-1">✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Section Renderers ---
const renderProblemAnalysis = (props) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, onAddItem, onRemoveItem, isLoading, language, missingApiKey } = props;
    const { coreProblem, causes, consequences } = projectData.problemAnalysis;
    const path = ['problemAnalysis'];
    const t = TEXT[language] || TEXT['en'];

    return (
        <>
            <div id="core-problem">
                <SectionHeader title={t.coreProblem}>
                    <GenerateButton onClick={() => onGenerateSection('coreProblem')} isLoading={isLoading === `${t.generating} coreProblem...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </SectionHeader>
                <p className="text-sm text-slate-500 mb-3 -mt-2">{t.coreProblemDesc}</p>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <TextArea label={t.title} path={[...path, 'coreProblem', 'title']} value={coreProblem.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.coreProblemTitlePlaceholder} generateTitle={`${t.generateField} ${t.coreProblem}`} missingApiKey={missingApiKey} />
                    <TextArea label={t.description} path={[...path, 'coreProblem', 'description']} value={coreProblem.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.coreProblemDescPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                    <InlineChart text={coreProblem.description || ''} fieldContext="coreProblem" language={language} />
                </div>
            </div>

            <div id="causes" className="mt-8">
                <SectionHeader title={t.causes} onAdd={() => onAddItem([...path, 'causes'], { id: null, title: '', description: '' })} addText={t.add}>
                    <GenerateButton onClick={() => onGenerateSection('causes')} isLoading={isLoading === `${t.generating} causes...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </SectionHeader>
                {(causes || []).map((cause, index) => (
                    <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group transition-all hover:shadow-md card-hover animate-fadeIn">
                         <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([...path, 'causes'], index)} text={t.remove} /></div>
                        <TextArea label={`${t.causeTitle} #${index + 1}`} path={[...path, 'causes', index, 'title']} value={cause.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.causePlaceholder} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} />
                        <TextArea label={t.description} path={[...path, 'causes', index, 'description']} value={cause.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.causeDescPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                        <InlineChart text={cause.description || ''} fieldContext={`cause_${index}`} language={language} />
                    </div>
                ))}
            </div>

            <div id="consequences" className="mt-8">
                <SectionHeader title={t.consequences} onAdd={() => onAddItem([...path, 'consequences'], { id: null, title: '', description: '' })} addText={t.add}>
                    <GenerateButton onClick={() => onGenerateSection('consequences')} isLoading={isLoading === `${t.generating} consequences...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </SectionHeader>
                {(consequences || []).map((consequence, index) => (
                    <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group transition-all hover:shadow-md card-hover animate-fadeIn">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([...path, 'consequences'], index)} text={t.remove} /></div>
                        <TextArea label={`${t.consequenceTitle} #${index + 1}`} path={[...path, 'consequences', index, 'title']} value={consequence.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.consequencePlaceholder} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} />
                        <TextArea label={t.description} path={[...path, 'consequences', index, 'description']} value={consequence.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.consequenceDescPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                        <InlineChart text={consequence.description || ''} fieldContext={`consequence_${index}`} language={language} />
                    </div>
                ))}
            </div>
        </>
    );
};

const renderProjectIdea = (props) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, onAddItem, onRemoveItem, isLoading, language, missingApiKey } = props;
    const { mainAim, stateOfTheArt, proposedSolution, policies, readinessLevels, projectTitle, projectAcronym, startDate } = projectData.projectIdea;
    const path = ['projectIdea'];
    const t = TEXT[language] || TEXT['en'];
    
    const isCoreProblemFilled = projectData.problemAnalysis.coreProblem.title.trim() !== '';
    const isMainAimFilled = mainAim.trim() !== '';
    const canEditTitle = isCoreProblemFilled && isMainAimFilled;

    return (
        <>
            <div className={`mb-8 p-6 border border-slate-200 rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-sm transition-all duration-300 ${!canEditTitle ? 'filter blur-sm opacity-60 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{t.projectTitle}</h3>
                    <GenerateButton onClick={() => onGenerateSection('projectTitleAcronym')} isLoading={isLoading === `${t.generating} projectTitleAcronym...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextArea label={t.projectTitle} path={[...path, 'projectTitle']} value={projectTitle} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.projectTitlePlaceholder} generateTitle={`${t.generateField} ${t.projectTitle}`} missingApiKey={missingApiKey} />
                    <TextArea label={t.acronym} path={[...path, 'projectAcronym']} value={projectAcronym} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.projectAcronymPlaceholder} generateTitle={`${t.generateField} ${t.acronym}`} missingApiKey={missingApiKey} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.projectStartDate}</label>
                        <input type="date" value={startDate || ''} onChange={(e) => onUpdateData([...path, 'startDate'], e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm text-base" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.projectDuration}</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm text-base bg-white" value={projectData.projectIdea?.durationMonths || 24} onChange={(e) => onUpdateData(['projectIdea', 'durationMonths'], parseInt(e.target.value))}>
                            {[6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 42, 48, 54, 60].map(m => (
                                <option key={m} value={m}>{m} {t.months}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.projectEndDate}</label>
                        <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-base font-bold text-sky-700 shadow-sm">
                            {projectData.projectIdea?.startDate ? (() => {
                                const start = new Date(projectData.projectIdea.startDate);
                                const months = projectData.projectIdea?.durationMonths || 24;
                                const end = new Date(start);
                                end.setMonth(end.getMonth() + months);
                                end.setDate(end.getDate() - 1);
                                return end.toISOString().split('T')[0];
                            })() : '—'}
                        </div>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{t.projectDurationDesc}</p>
            </div>

            <div id="main-aim">
                <SectionHeader title={t.mainAim}>
                    <GenerateButton onClick={() => onGenerateSection('mainAim')} isLoading={isLoading === `${t.generating} mainAim...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </SectionHeader>
                <p className="text-sm text-slate-500 mb-3 -mt-2">{t.mainAimDesc}</p>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <TextArea label={t.mainAim} path={[...path, 'mainAim']} value={mainAim} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.mainAimPlaceholder} generateTitle={`${t.generateField} ${t.mainAim}`} missingApiKey={missingApiKey} />
                </div>
            </div>

            <div id="state-of-the-art" className="mt-6">
                <SectionHeader title={t.stateOfTheArt}>
                    <GenerateButton onClick={() => onGenerateSection('stateOfTheArt')} isLoading={isLoading === `${t.generating} stateOfTheArt...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </SectionHeader>
                <p className="text-sm text-slate-500 mb-3 -mt-2">{t.stateOfTheArtDesc}</p>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <TextArea label={t.stateOfTheArt} path={[...path, 'stateOfTheArt']} value={stateOfTheArt} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.stateOfTheArtPlaceholder} generateTitle={`${t.generateField} ${t.stateOfTheArt}`} missingApiKey={missingApiKey} />
                    <InlineChart text={stateOfTheArt || ''} fieldContext="stateOfTheArt" language={language} />
                </div>
            </div>

            <div id="proposed-solution" className="mt-6">
                <SectionHeader title={t.proposedSolution}>
                    <GenerateButton onClick={() => onGenerateSection('proposedSolution')} isLoading={isLoading === `${t.generating} proposedSolution...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </SectionHeader>
                <p className="text-sm text-slate-500 mb-3 -mt-2">{t.proposedSolutionDesc}</p>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <TextArea label={t.proposedSolution} path={[...path, 'proposedSolution']} value={proposedSolution} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.proposedSolutionPlaceholder} generateTitle={`${t.generateField} ${t.proposedSolution}`} missingApiKey={missingApiKey} />
                    <InlineChart text={proposedSolution || ''} fieldContext="proposedSolution" language={language} />
                </div>
            </div>
            
            <ReadinessLevelSelector readinessLevels={readinessLevels} onUpdateData={onUpdateData} onGenerateField={onGenerateField} onGenerateSection={onGenerateSection} isLoading={isLoading} language={language} missingApiKey={missingApiKey} />

            <div id="eu-policies" className="mt-8">
                 <SectionHeader title={t.euPolicies} onAdd={() => onAddItem([...path, 'policies'], { id: null, name: '', description: '' })} addText={t.add}>
                    <GenerateButton onClick={() => onGenerateSection('policies')} isLoading={isLoading === `${t.generating} policies...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                 </SectionHeader>
                 {(policies || []).map((policy, index) => (
                    <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group hover:shadow-md transition-all card-hover animate-fadeIn">
                         <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([...path, 'policies'], index)} text={t.remove} /></div>
                        <TextArea label={`${t.policyName} #${index + 1}`} path={[...path, 'policies', index, 'name']} value={policy.name} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.policyPlaceholder} generateTitle={`${t.generateField} ${t.policyName}`} missingApiKey={missingApiKey} />
                        <TextArea label={t.policyDesc} path={[...path, 'policies', index, 'description']} value={policy.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.policyDescPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                    </div>
                ))}
            </div>
        </>
    );
};

const renderGenericResults = (props, sectionKey) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, onAddItem, onRemoveItem, isLoading, language, missingApiKey } = props;
    const items = projectData[sectionKey];
    const t = TEXT[language] || TEXT['en'];
    const title = t[sectionKey];
    const getPrefix = (key) => { switch (key) { case 'outputs': return 'D'; case 'outcomes': return 'R'; case 'impacts': return 'I'; } };
    const prefix = getPrefix(sectionKey);

    return (
        <div id={sectionKey} className="mt-8">
             <SectionHeader title={title} onAdd={() => onAddItem([sectionKey], { id: null, title: '', description: '', indicator: '' })} addText={t.add}>
                <GenerateButton onClick={() => onGenerateSection(sectionKey)} isLoading={isLoading === `${t.generating} ${sectionKey}...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
             </SectionHeader>
             {(items || []).map((item, index) => (
                <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group hover:shadow-md transition-all card-hover animate-fadeIn">
                     <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([sectionKey], index)} text={t.remove} /></div>
                    <TextArea label={`${prefix}${index + 1}`} path={[sectionKey, index, 'title']} value={item.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.enterTitle} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} />
                    <TextArea label={t.description} path={[sectionKey, index, 'description']} value={item.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.enterDesc} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                    <InlineChart text={item.description || ''} fieldContext={`${sectionKey}_${index}`} language={language} />
                    <TextArea label={t.indicator} path={[sectionKey, index, 'indicator']} value={item.indicator} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.indicatorPlaceholder} generateTitle={`${t.generateField} ${t.indicator}`} missingApiKey={missingApiKey} />
                </div>
            ))}
        </div>
    );
};

const renderObjectives = (props, sectionKey) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, onAddItem, onRemoveItem, isLoading, language, missingApiKey } = props;
    const items = projectData[sectionKey];
    const t = TEXT[language] || TEXT['en'];
    const title = sectionKey === 'generalObjectives' ? t.generalObjectives : t.specificObjectives;
    const prefix = sectionKey === 'generalObjectives' ? 'GO' : 'SO';
    
    return (
        <div className="mt-2">
             <SectionHeader title={title} onAdd={() => onAddItem([sectionKey], { id: null, title: '', description: '', indicator: '' })} addText={t.add}>
                <GenerateButton onClick={() => onGenerateSection(sectionKey)} isLoading={isLoading === `${t.generating} ${sectionKey}...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
             </SectionHeader>
             {(items || []).map((item, index) => (
                <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group hover:shadow-md transition-all card-hover animate-fadeIn">
                     <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([sectionKey], index)} text={t.remove} /></div>
                    <TextArea label={`${prefix}${index + 1}`} path={[sectionKey, index, 'title']} value={item.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.enterTitle} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} />
                    <TextArea label={t.description} path={[sectionKey, index, 'description']} value={item.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.enterDesc} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                    <TextArea label={t.indicator} path={[sectionKey, index, 'indicator']} value={item.indicator} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.indicatorPlaceholder} generateTitle={`${t.generateField} ${t.indicator}`} missingApiKey={missingApiKey} />
                </div>
            ))}
        </div>
    );
};

const renderProjectManagement = (props) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, isLoading, language, missingApiKey } = props;
    const { projectManagement } = projectData;
    const t = TEXT[language] || TEXT['en'];
    const pmPath = ['projectManagement'];

    return (
        <div id="implementation" className="mb-10 pb-8">
            <SectionHeader title={t.management.title}>
                <GenerateButton onClick={() => onGenerateSection('projectManagement')} isLoading={isLoading === `${t.generating} projectManagement...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
            </SectionHeader>
            <p className="text-sm text-slate-500 mb-6 -mt-2">{t.management.desc}</p>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                <TextArea label={t.description} path={[...pmPath, 'description']} value={projectManagement?.description || ''} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.management.placeholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
            </div>
            <div id="organigram">
                <div className="mb-3 border-b border-slate-200 pb-2">
                    <h4 className="text-lg font-bold text-slate-700">{t.management.organigram}</h4>
                </div>
                <div className="chart-container-white overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Organigram structure={projectManagement?.structure} activities={projectData.activities} language={language} id="organigram-interactive" />
                </div>
            </div>
        </div>
    );
};

const renderRisks = (props) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, onAddItem, onRemoveItem, isLoading, language, missingApiKey } = props;
    const { risks } = projectData;
    const path = ['risks'];
    const t = TEXT[language] || TEXT['en'];
    const trafficColors = { low: 'bg-green-100 border-green-300 text-green-800', medium: 'bg-yellow-100 border-yellow-300 text-yellow-800', high: 'bg-red-100 border-red-300 text-red-800' };
    const getTrafficColor = (value) => { if (!value) return trafficColors.low; return trafficColors[value.toLowerCase()] || trafficColors.low; };
    
    return (
        <div id="risk-mitigation" className="mt-12 border-t-2 border-slate-200 pt-8">
            <SectionHeader title={t.subSteps.riskMitigation} onAdd={() => onAddItem(path, { id: `RISK${risks.length + 1}`, category: 'technical', title: '', description: '', likelihood: 'low', impact: 'low', mitigation: '' })} addText={t.add}>
                <GenerateButton onClick={() => onGenerateSection('risks')} isLoading={isLoading === `${t.generating} risks...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
            </SectionHeader>
            {(risks || []).map((risk, index) => {
                const likelihoodLoading = isLoading === `${t.generating} likelihood...`;
                const impactLoading = isLoading === `${t.generating} impact...`;
                return (
                <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group hover:shadow-md transition-all card-hover animate-fadeIn">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem(path, index)} text={t.remove} /></div>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="w-28">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.risks.riskId}</label>
                            <input type="text" value={risk.id || ''} onChange={(e) => onUpdateData([...path, index, 'id'], e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-bold bg-slate-50 text-base" />
                        </div>
                        <div className="w-48">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.risks.category}</label>
                            <select value={risk.category || 'technical'} onChange={(e) => onUpdateData([...path, index, 'category'], e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-base">
                                <option value="technical">{t.risks.categories.technical}</option>
                                <option value="social">{t.risks.categories.social}</option>
                                <option value="economic">{t.risks.categories.economic}</option>
                                <option value="environmental">{t.risks.categories.environmental}</option>
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                             <TextArea label={t.risks.riskTitle} path={[...path, index, 'title']} value={risk.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.risks.titlePlaceholder} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} className="w-full group" />
                        </div>
                    </div>
                    <TextArea label={t.risks.riskDescription} path={[...path, index, 'description']} value={risk.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.risks.descPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.risks.likelihood}</label>
                            <div className="relative">
                                <select value={risk.likelihood} onChange={(e) => onUpdateData([...path, index, 'likelihood'], e.target.value)} className={`w-full p-2.5 border rounded-lg font-bold ${getTrafficColor(risk.likelihood)} pr-10 appearance-none transition-colors cursor-pointer text-base`}>
                                    <option value="low" className="bg-white text-slate-800">{t.risks.levels.low}</option>
                                    <option value="medium" className="bg-white text-slate-800">{t.risks.levels.medium}</option>
                                    <option value="high" className="bg-white text-slate-800">{t.risks.levels.high}</option>
                                </select>
                                <div className="absolute top-1.5 right-1.5"><GenerateButton onClick={() => onGenerateField([...path, index, 'likelihood'])} isLoading={likelihoodLoading} isField title={t.generateAI} missingApiKey={missingApiKey} /></div>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.risks.impact}</label>
                             <div className="relative">
                                <select value={risk.impact} onChange={(e) => onUpdateData([...path, index, 'impact'], e.target.value)} className={`w-full p-2.5 border rounded-lg font-bold ${getTrafficColor(risk.impact)} pr-10 appearance-none transition-colors cursor-pointer text-base`}>
                                    <option value="low" className="bg-white text-slate-800">{t.risks.levels.low}</option>
                                    <option value="medium" className="bg-white text-slate-800">{t.risks.levels.medium}</option>
                                    <option value="high" className="bg-white text-slate-800">{t.risks.levels.high}</option>
                                </select>
                                <div className="absolute top-1.5 right-1.5"><GenerateButton onClick={() => onGenerateField([...path, index, 'impact'])} isLoading={impactLoading} isField title={t.generateAI} missingApiKey={missingApiKey} /></div>
                            </div>
                        </div>
                    </div>
                    <TextArea label={t.risks.mitigation} path={[...path, index, 'mitigation']} value={risk.mitigation} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.risks.mitigationPlaceholder} generateTitle={`${t.generateField} ${t.risks.mitigation}`} missingApiKey={missingApiKey} />
                </div>
            )})}
        </div>
    );
};

const renderKERs = (props) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, onAddItem, onRemoveItem, isLoading, language, missingApiKey } = props;
    const { kers } = projectData;
    const path = ['kers'];
    const t = TEXT[language] || TEXT['en'];

    return (
        <div id="kers" className="mt-12 border-t-2 border-slate-200 pt-8">
            <SectionHeader title={t.subSteps.kers} onAdd={() => onAddItem(path, { id: `KER${kers.length + 1}`, title: '', description: '', exploitationStrategy: '' })} addText={t.add}>
                <GenerateButton onClick={() => onGenerateSection('kers')} isLoading={isLoading === `${t.generating} kers...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
            </SectionHeader>
            {(kers || []).map((ker, index) => (
                 <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group hover:shadow-md transition-all card-hover animate-fadeIn">
                     <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem(path, index)} text={t.remove} /></div>
                     <div className="flex flex-wrap gap-4 mb-4">
                        <div className="w-28">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.kers.kerId}</label>
                            <input type="text" value={ker.id || ''} onChange={(e) => onUpdateData([...path, index, 'id'], e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-bold bg-slate-50 text-base" />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                             <TextArea label={t.kers.kerTitle} path={[...path, index, 'title']} value={ker.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.kers.titlePlaceholder} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} className="w-full group" />
                        </div>
                     </div>
                     <TextArea label={t.kers.kerDesc} path={[...path, index, 'description']} value={ker.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.kers.descPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                     <TextArea label={t.kers.exploitationStrategy} path={[...path, index, 'exploitationStrategy']} value={ker.exploitationStrategy} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.kers.strategyPlaceholder} generateTitle={`${t.generateField} ${t.kers.exploitationStrategy}`} missingApiKey={missingApiKey} />
                </div>
            ))}
        </div>
    );
};
// ★ v6.0: Partnership (Consortium) renderer
const renderPartners = (props) => {
    const { projectData, onUpdateData, onAddItem, onRemoveItem, onGenerateSection, isLoading, language, missingApiKey } = props;
    const t = TEXT[language] || TEXT['en'];
    const tp = t.partners || {};
    const partners = projectData.partners || [];
    const fundingModel = projectData.fundingModel || 'centralized';

    return (
        <div id="partners" className="mt-12 mb-8 border-t-2 border-slate-200 pt-8">
            <SectionHeader title={tp.title || 'Partnership (Consortium)'}>
                <GenerateButton
                    onClick={() => onGenerateSection('partners')}
                    isLoading={isLoading === `${t.generating} partners...`}
                    title={t.generateSection}
                    text={tp.suggestPartners || t.generateAI}
                    missingApiKey={missingApiKey}
                />
            </SectionHeader>
            <p className="text-sm text-slate-500 mb-6 -mt-2">{tp.titleDesc || ''}</p>

            {/* Funding Model Selector */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{tp.fundingModel || 'Funding Model'}</label>
                        <p className="text-xs text-slate-400 mb-2">{tp.fundingModelDesc || ''}</p>
                        <select
                            value={fundingModel}
                            onChange={(e) => onUpdateData(['fundingModel'], e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-base"
                        >
                            <option value="centralized">{tp.centralized || 'Centralized'}</option>
                            <option value="decentralized">{tp.decentralized || 'Decentralized'}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{tp.maxPartners || 'Max Partners'}</label>
                        <p className="text-xs text-slate-400 mb-2">{tp.maxPartnersDesc || ''}</p>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={projectData.maxPartners || ''}
                            onChange={(e) => onUpdateData(['maxPartners'], e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder={tp.maxPartnersPlaceholder || 'e.g. 8'}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-base"
                        />
                    </div>
                </div>
            </div>

            {/* Info: 1 PM = 143 hours */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2 mb-6 text-sm text-sky-700 font-medium">
                {tp.hoursPerPM || `1 PM = ${PM_HOURS_PER_MONTH} hours (EU standard)`}
            </div>

            {/* Partner List Header */}
            <div className="mb-4">
                <SectionHeader
                    title={tp.partnerName || 'Partners'}
                    onAdd={() => {
                        const nextIndex = partners.length;
                        const code = nextIndex === 0 ? 'CO' : `P${nextIndex + 1}`;
                        onAddItem(['partners'], {
                            id: `partner-${Date.now()}`,
                            code: code,
                            name: '',
                            expertise: '',
                            pmRate: 0
                        });
                    }}
                    addText={tp.addPartner || t.add}
                />
            </div>

            {partners.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic">
                    {tp.noPartnersYet || 'No partners defined yet.'}
                </div>
            )}

            {partners.map((partner, index) => (
                <div key={index} className="p-5 border border-slate-200 rounded-xl mb-4 bg-white shadow-sm relative group hover:shadow-md transition-all card-hover animate-fadeIn">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RemoveButton onClick={() => onRemoveItem(['partners'], index)} text={tp.removePartner || t.remove} />
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-sky-100 text-sky-800 border border-sky-200'}`}>
                            {partner.code || (index === 0 ? 'CO' : `P${index + 1}`)}
                        </span>
                        {index === 0 && <span className="text-xs text-amber-600 font-semibold">{tp.coordinator || 'Coordinator'}</span>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">{tp.code || 'Code'}</label>
                            <input
                                type="text"
                                value={partner.code || ''}
                                onChange={(e) => onUpdateData(['partners', index, 'code'], e.target.value)}
                                placeholder={tp.codePlaceholder || 'CO, P2, P3...'}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">{tp.partnerName || 'Name'}</label>
                            <input
                                type="text"
                                value={partner.name || ''}
                                onChange={(e) => onUpdateData(['partners', index, 'name'], e.target.value)}
                                placeholder={tp.partnerNamePlaceholder || 'Organization name...'}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">{tp.expertise || 'Expertise'}</label>
                            <input
                                type="text"
                                value={partner.expertise || ''}
                                onChange={(e) => onUpdateData(['partners', index, 'expertise'], e.target.value)}
                                placeholder={tp.expertisePlaceholder || 'Short expertise description...'}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">{tp.pmRate || 'PM Rate (EUR)'}</label>
                            <input
                                type="number"
                                min={0}
                                value={partner.pmRate || ''}
                                onChange={(e) => onUpdateData(['partners', index, 'pmRate'], e.target.value ? parseFloat(e.target.value) : 0)}
                                placeholder={tp.pmRatePlaceholder || '5700'}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base"
                            />
                        </div>
                    </div>

                    {/* Partner Type Selector */}
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5">{tp.partnerType || 'Partner Type'}</label>
                        <select
                            value={(partner as any).partnerType || ''}
                            onChange={(e) => onUpdateData(['partners', index, 'partnerType'], e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-base"
                        >
                            <option value="">—</option>
                            {Object.entries(tp.partnerTypes || {}).map(([key, label]) => (
                                <option key={key} value={key}>{label as string}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ))}

            {/* Summary Table */}
            {partners.length > 0 && (
                <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">{tp.projectSummary || 'Project Partner Summary'}</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-300">
                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">{tp.code || 'Code'}</th>
                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">{tp.partnerName || 'Name'}</th>
                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">{tp.expertise || 'Expertise'}</th>
                                    <th className="text-left py-2 px-3 font-semibold text-slate-600">{tp.partnerType || 'Type'}</th>
                                    <th className="text-right py-2 px-3 font-semibold text-slate-600">{tp.pmRate || 'PM Rate'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partners.map((p, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-white transition-colors">
                                        <td className="py-2 px-3 font-bold text-sky-700">{p.code}</td>
                                        <td className="py-2 px-3">{p.name || '—'}</td>
                                        <td className="py-2 px-3 text-slate-500 text-xs">{p.expertise || '—'}</td>
                                        <td className="py-2 px-3 text-slate-500">{(tp.partnerTypes || {})[(p as any).partnerType] || '—'}</td>
                                        <td className="py-2 px-3 text-right font-mono">{p.pmRate ? `€${p.pmRate.toLocaleString()}` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ★ v6.0: Finance (Budget) renderer
const renderFinance = (props) => {
    const { projectData, language } = props;
    const t = TEXT[language] || TEXT['en'];
    const tf = t.finance || {};
    const tp = t.partners || {};
    const fundingModel = projectData.fundingModel || 'centralized';
    const partners = projectData.partners || [];
    const activities = Array.isArray(projectData.activities) ? projectData.activities : [];

    const directCostDefs = fundingModel === 'centralized' ? CENTRALIZED_DIRECT_COSTS : DECENTRALIZED_DIRECT_COSTS;
    const indirectCostDefs = fundingModel === 'centralized' ? CENTRALIZED_INDIRECT_COSTS : DECENTRALIZED_INDIRECT_COSTS;
    const lang = language === 'si' ? 'si' : 'en';

    // Collect all partner allocations from all tasks
    const allAllocations: any[] = [];
    activities.forEach((wp: any) => {
        (wp.tasks || []).forEach((task: any) => {
            (task.partnerAllocations || []).forEach((alloc: any) => {
                const partner = partners.find((p: any) => p.id === alloc.partnerId);
                const directTotal = (alloc.directCosts || []).reduce((sum: number, dc: any) => sum + (dc.amount || 0), 0);
                const indirectTotal = (alloc.indirectCosts || []).reduce((sum: number, ic: any) => sum + (ic.calculatedAmount || 0), 0);
                allAllocations.push({
                    wpId: wp.id, wpTitle: wp.title || '',
                    taskId: task.id, taskTitle: task.title || '',
                    partnerId: alloc.partnerId, partnerCode: partner?.code || '?',
                    hours: alloc.hours || 0, pm: alloc.pm || 0,
                    directTotal, indirectTotal, total: directTotal + indirectTotal,
                });
            });
        });
    });

    const grandDirectTotal = allAllocations.reduce((s, a) => s + a.directTotal, 0);
    const grandIndirectTotal = allAllocations.reduce((s, a) => s + a.indirectTotal, 0);
    const grandTotal = grandDirectTotal + grandIndirectTotal;

    // Group by WP
    const wpGroups: Record<string, any[]> = {};
    allAllocations.forEach(a => {
        if (!wpGroups[a.wpId]) wpGroups[a.wpId] = [];
        wpGroups[a.wpId].push(a);
    });

    // Group by Partner
    const partnerGroups: Record<string, any[]> = {};
    allAllocations.forEach(a => {
        if (!partnerGroups[a.partnerCode]) partnerGroups[a.partnerCode] = [];
        partnerGroups[a.partnerCode].push(a);
    });

    const hasData = allAllocations.length > 0;

    return (
        <div id="finance" className="mt-12 mb-8 border-t-2 border-slate-200 pt-8">
            <SectionHeader title={tf.title || 'Finance (Budget)'} />
            <p className="text-sm text-slate-500 mb-6 -mt-2">{tf.titleDesc || ''}</p>

            {/* Current Funding Model Info */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-600">{tf.costModel || 'Model'}:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${fundingModel === 'centralized' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                            {fundingModel === 'centralized' ? (tf.centralizedModel || 'Centralized') : (tf.decentralizedModel || 'Decentralized')}
                        </span>
                    </div>
                    <span className="text-xs text-slate-400">
                        ({language === 'si' ? 'spremeni v poglavju Partnerstvo' : 'change in Partnership section'})
                    </span>
                </div>
            </div>

            {/* Available Cost Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Direct Costs */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        {tf.directCosts || 'Direct Costs'}
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">{tf.directCostsDesc || ''}</p>
                    <div className="space-y-1.5">
                        {directCostDefs.map((cat, i) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 px-3 bg-green-50 rounded-lg border border-green-100 text-sm">
                                <span className="font-mono text-green-700 font-bold w-6">{i + 1}.</span>
                                <span className="text-slate-700">{cat[lang]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Indirect Costs */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        {tf.indirectCosts || 'Indirect Costs'}
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">{tf.indirectCostsDesc || ''}</p>
                    <div className="space-y-1.5">
                        {indirectCostDefs.map((cat, i) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 px-3 bg-amber-50 rounded-lg border border-amber-100 text-sm">
                                <span className="font-mono text-amber-700 font-bold w-6">{i + 1}.</span>
                                <span className="text-slate-700">{cat[lang]}</span>
                                <span className="ml-auto text-xs text-amber-500 font-semibold">% {tf.flatRate || 'flat rate'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Budget Overview */}
            {!hasData ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <div className="text-slate-400 text-4xl mb-3">📊</div>
                    <p className="text-slate-500 font-medium">{tf.noFinanceData || 'No finance data yet.'}</p>
                    <p className="text-slate-400 text-sm mt-1">
                        {language === 'si'
                            ? 'Dodajte partnerske dodelitve s stroški v nalogah načrta dela (Workplan).'
                            : 'Add partner allocations with costs in the Workplan tasks.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Grand Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">{tf.totalDirectCosts || 'Total Direct'}</p>
                            <p className="text-2xl font-bold text-green-800">€{grandDirectTotal.toLocaleString()}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">{tf.totalIndirectCosts || 'Total Indirect'}</p>
                            <p className="text-2xl font-bold text-amber-800">€{grandIndirectTotal.toLocaleString()}</p>
                        </div>
                        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-sky-600 font-semibold uppercase tracking-wider mb-1">{tf.grandTotal || 'Grand Total'}</p>
                            <p className="text-2xl font-bold text-sky-800">€{grandTotal.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* By WP */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">{tf.perWP || 'Per Work Package'}</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="text-left py-2 px-3 font-semibold text-slate-600">WP</th>
                                        <th className="text-right py-2 px-3 font-semibold text-green-600">{tf.directCosts || 'Direct'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-amber-600">{tf.indirectCosts || 'Indirect'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-sky-600">{tf.grandTotal || 'Total'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-slate-600">{tp.totalHours || 'Hours'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-slate-600">{tp.totalPM || 'PM'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(wpGroups).map(([wpId, items]) => {
                                        const wpDirect = items.reduce((s, a) => s + a.directTotal, 0);
                                        const wpIndirect = items.reduce((s, a) => s + a.indirectTotal, 0);
                                        const wpHours = items.reduce((s, a) => s + a.hours, 0);
                                        const wpPM = items.reduce((s, a) => s + a.pm, 0);
                                        return (
                                            <tr key={wpId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="py-2 px-3 font-bold text-sky-700">{wpId}</td>
                                                <td className="py-2 px-3 text-right font-mono text-green-700">€{wpDirect.toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono text-amber-700">€{wpIndirect.toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono font-bold">€{(wpDirect + wpIndirect).toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono">{wpHours.toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono">{wpPM.toFixed(1)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 font-bold">
                                        <td className="py-2 px-3">{tf.grandTotal || 'TOTAL'}</td>
                                        <td className="py-2 px-3 text-right font-mono text-green-800">€{grandDirectTotal.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono text-amber-800">€{grandIndirectTotal.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono text-sky-800">€{grandTotal.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono">{allAllocations.reduce((s, a) => s + a.hours, 0).toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono">{allAllocations.reduce((s, a) => s + a.pm, 0).toFixed(1)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* By Partner */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">{tf.perPartner || 'Per Partner'}</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="text-left py-2 px-3 font-semibold text-slate-600">{tp.code || 'Partner'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-green-600">{tf.directCosts || 'Direct'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-amber-600">{tf.indirectCosts || 'Indirect'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-sky-600">{tf.grandTotal || 'Total'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-slate-600">{tp.totalHours || 'Hours'}</th>
                                        <th className="text-right py-2 px-3 font-semibold text-slate-600">{tp.totalPM || 'PM'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(partnerGroups).map(([code, items]) => {
                                        const pDirect = items.reduce((s, a) => s + a.directTotal, 0);
                                        const pIndirect = items.reduce((s, a) => s + a.indirectTotal, 0);
                                        const pHours = items.reduce((s, a) => s + a.hours, 0);
                                        const pPM = items.reduce((s, a) => s + a.pm, 0);
                                        return (
                                            <tr key={code} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="py-2 px-3 font-bold text-sky-700">{code}</td>
                                                <td className="py-2 px-3 text-right font-mono text-green-700">€{pDirect.toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono text-amber-700">€{pIndirect.toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono font-bold">€{(pDirect + pIndirect).toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono">{pHours.toLocaleString()}</td>
                                                <td className="py-2 px-3 text-right font-mono">{pPM.toFixed(1)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 font-bold">
                                        <td className="py-2 px-3">{tf.grandTotal || 'TOTAL'}</td>
                                        <td className="py-2 px-3 text-right font-mono text-green-800">€{grandDirectTotal.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono text-amber-800">€{grandIndirectTotal.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono text-sky-800">€{grandTotal.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono">{allAllocations.reduce((s, a) => s + a.hours, 0).toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono">{allAllocations.reduce((s, a) => s + a.pm, 0).toFixed(1)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const renderActivities = (props) => {
    const { projectData, onUpdateData, onGenerateField, onGenerateSection, onAddItem, onRemoveItem, isLoading, language, missingApiKey } = props;
    const path = ['activities'];
    const t = TEXT[language] || TEXT['en'];

    const rawActivities = projectData.activities;
    const activities = Array.isArray(rawActivities)
        ? rawActivities
        : (rawActivities && Array.isArray(rawActivities.activities))
            ? rawActivities.activities
            : (rawActivities && typeof rawActivities === 'object' && rawActivities.id)
                ? [rawActivities]
                : [];

    const allTasks = activities.flatMap(wp => wp.tasks || []);

    const handleTaskUpdate = (itemPath, value) => {
        if (itemPath.includes('tasks')) {
            const tempProjectData = JSON.parse(JSON.stringify(projectData));
            let current = tempProjectData;
            for(let i=0; i<itemPath.length-1; i++) {
                current = current[itemPath[i]];
            }
            current[itemPath[itemPath.length-1]] = value;
            const scheduledProjectData = recalculateProjectSchedule(tempProjectData);
            onUpdateData(['activities'], scheduledProjectData.activities);
        } else {
            onUpdateData(itemPath, value);
        }
    };

    return (
        <>
            {renderProjectManagement(props)}

            {/* ★ v6.0: Partnership section — between organigram and workplan */}
            {renderPartners(props)}

            <div id="workplan">
                <SectionHeader title={t.subSteps.workplan} onAdd={() => onAddItem(path, { id: `WP${activities.length + 1}`, title: '', tasks: [], milestones: [], deliverables: [] })} addText={t.add}>
                    <GenerateButton onClick={() => onGenerateSection('activities')} isLoading={isLoading === `${t.generating} activities...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                </SectionHeader>
                
                {(activities || []).map((wp, wpIndex) => (
                    <div key={wpIndex} className="p-6 border border-slate-200 rounded-xl mb-8 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <h4 className="text-lg font-bold text-sky-800 flex items-center gap-2">
                                <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-sm">{wp.id}</span> 
                                <span className="truncate">{wp.title || t.untitled}</span>
                            </h4>
                            <RemoveButton onClick={() => onRemoveItem(path, wpIndex)} text={t.remove} />
                        </div>
                        <TextArea label={t.wpTitle} path={[...path, wpIndex, 'title']} value={wp.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.wpTitlePlaceholder} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} />
                        
                        <div className="mt-6 pl-4 border-l-4 border-sky-100">
                            <SectionHeader title={t.tasks} onAdd={() => onAddItem([...path, wpIndex, 'tasks'], { id: `T${wpIndex + 1}.${(wp.tasks || []).length + 1}`, title: '', description: '', startDate: '', endDate: '', dependencies: [] })} addText={t.add} />
                            {(wp.tasks || []).map((task, taskIndex) => (
                                <div key={taskIndex} className="p-4 border border-slate-200 rounded-lg mb-4 bg-slate-50 relative group">
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([...path, wpIndex, 'tasks'], taskIndex)} text={t.remove} /></div>
                                    <h5 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs text-slate-500">{task.id}</span>
                                        {task.title || t.untitled}
                                    </h5>
                                    <TextArea label={t.taskTitle} path={[...path, wpIndex, 'tasks', taskIndex, 'title']} value={task.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.taskTitlePlaceholder} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} />
                                    <TextArea label={t.taskDesc} path={[...path, wpIndex, 'tasks', taskIndex, 'description']} value={task.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.taskDescPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.startDate}</label>
                                            <input type="date" value={task.startDate || ''} onChange={(e) => handleTaskUpdate([...path, wpIndex, 'tasks', taskIndex, 'startDate'], e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-base" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.endDate}</label>
                                            <input type="date" value={task.endDate || ''} onChange={(e) => handleTaskUpdate([...path, wpIndex, 'tasks', taskIndex, 'endDate'], e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-base" />
                                        </div>
                                    </div>
                                    <DependencySelector task={task} allTasks={allTasks} language={language}
                                        onAddDependency={(dep) => { const deps = task.dependencies || []; handleTaskUpdate([...path, wpIndex, 'tasks', taskIndex, 'dependencies'], [...deps, dep]); }}
                                        onRemoveDependency={(depIdx) => { const deps = task.dependencies || []; handleTaskUpdate([...path, wpIndex, 'tasks', taskIndex, 'dependencies'], deps.filter((_, i) => i !== depIdx)); }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pl-4 border-l-4 border-amber-100">
                            <SectionHeader title={t.milestones} onAdd={() => onAddItem([...path, wpIndex, 'milestones'], { id: `M${wpIndex + 1}.${(wp.milestones || []).length + 1}`, description: '', date: '' })} addText={t.add} />
                            {(wp.milestones || []).map((milestone, msIndex) => {
                                const enGen = TEXT.en.generating;
                                const siGen = TEXT.si.generating;
                                const dateLoading = isLoading === `${enGen} date...` || isLoading === `${siGen} date...`;
                                return (
                                    <div key={msIndex} className="relative mb-3 bg-amber-50/50 p-4 rounded-lg border border-amber-100 group">
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([...path, wpIndex, 'milestones'], msIndex)} text={t.remove} /></div>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1">
                                                <TextArea label={`Milestone ${milestone.id}`} path={[...path, wpIndex, 'milestones', msIndex, 'description']} value={milestone.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.milestonePlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} className="w-full group" />
                                            </div>
                                            <div className="w-full md:w-48">
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.dates}</label>
                                                <div className="flex gap-1 items-end">
                                                    <input type="date" value={milestone.date || ''} onChange={(e) => onUpdateData([...path, wpIndex, 'milestones', msIndex, 'date'], e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-base flex-1" />
                                                    <GenerateButton onClick={() => onGenerateField([...path, wpIndex, 'milestones', msIndex, 'date'])} isLoading={dateLoading} isField title={t.generateAI} missingApiKey={missingApiKey} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 pl-4 border-l-4 border-indigo-100">
                            <SectionHeader title={t.deliverables} onAdd={() => onAddItem([...path, wpIndex, 'deliverables'], { id: `D${wpIndex + 1}.${(wp.deliverables || []).length + 1}`, title: '', description: '', indicator: '' })} addText={t.add} />
                            {(wp.deliverables || []).map((deliverable, dIndex) => (
                                <div key={dIndex} className="relative mb-4 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 group">
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><RemoveButton onClick={() => onRemoveItem([...path, wpIndex, 'deliverables'], dIndex)} text={t.remove} /></div>
                                    <h5 className="font-semibold text-slate-700 mb-3">{deliverable.id}</h5>
                                    <TextArea label={t.deliverableTitle || 'Deliverable Title'} path={[...path, wpIndex, 'deliverables', dIndex, 'title']} value={deliverable.title} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.deliverableTitlePlaceholder || 'Enter deliverable title...'} generateTitle={`${t.generateField} ${t.title}`} missingApiKey={missingApiKey} />
                                    <TextArea label={t.description} path={[...path, wpIndex, 'deliverables', dIndex, 'description']} value={deliverable.description} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} placeholder={t.deliverableDescPlaceholder} generateTitle={`${t.generateField} ${t.description}`} missingApiKey={missingApiKey} />
                                    <TextArea label={t.indicator} path={[...path, wpIndex, 'deliverables', dIndex, 'indicator']} value={deliverable.indicator} onUpdate={onUpdateData} onGenerate={onGenerateField} isLoading={isLoading} rows={1} placeholder={t.indicatorPlaceholder} generateTitle={`${t.generateField} ${t.indicator}`} missingApiKey={missingApiKey} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div id="gantt-chart" className="mt-12 mb-8 border-t-2 border-slate-200 pt-8">
                <h3 className="text-xl font-bold text-slate-700 mb-4">{t.subSteps.ganttChart}</h3>
                <div className="chart-container-white bg-white rounded-xl">
                    <GanttChart activities={activities} language={language} id="gantt-chart-interactive" />
                </div>
            </div>

            <div id="pert-chart" className="mt-12 mb-8 border-t-2 border-slate-200 pt-8">
                <h3 className="text-xl font-bold text-slate-700 mb-4">{t.subSteps.pertChart}</h3>
                <div className="chart-container-white bg-white rounded-xl">
                    <PERTChart activities={activities} language={language} />
                </div>
            </div>

            {/* ★ v6.0: Finance section — between PERT and risks */}
            {renderFinance(props)}

            {renderRisks(props)}
        </>
    );
};
const renderExpectedResults = (props) => {
    return (
        <>
            {renderGenericResults(props, 'outputs')}
            {renderGenericResults(props, 'outcomes')}
            {renderGenericResults(props, 'impacts')}
            {renderKERs(props)}
        </>
    );
};

const ProjectDisplay = (props) => {
    const { activeStepId, onGenerateSection, isLoading, error, language, missingApiKey, completedStepsStatus, onStepClick } = props;
    const STEPS = getSteps(language);
    const activeStep = STEPS.find(step => step.id === activeStepId);
    const t = TEXT[language] || TEXT['en'];

    if (!activeStep) return <div className="p-8 text-center text-red-500">Error: Invalid Step Selected</div>;

    const sectionKey = activeStep.key;

    const stepColorMap: Record<string, string> = {
        problemAnalysis: '#EF4444',
        projectIdea: '#6366F1',
        generalObjectives: '#06B6D4',
        specificObjectives: '#8B5CF6',
        activities: '#F59E0B',
        expectedResults: '#10B981',
    };

    const renderContent = () => {
        switch (sectionKey) {
            case 'problemAnalysis': return renderProblemAnalysis(props);
            case 'projectIdea': return renderProjectIdea(props);
            case 'generalObjectives': return renderObjectives(props, 'generalObjectives');
            case 'specificObjectives': return renderObjectives(props, 'specificObjectives');
            case 'activities': return renderActivities(props);
            case 'expectedResults': return renderExpectedResults(props);
            default: return <div className="p-8 text-center text-slate-500">{t.selectStep}</div>;
        }
    };

    const showGenerateButton = ['problemAnalysis', 'projectIdea', 'generalObjectives', 'specificObjectives', 'activities', 'expectedResults'].includes(sectionKey);

    return (
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
            <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center flex-shrink-0 sticky top-0 z-20 shadow-sm animate-fadeIn" style={{ gap: '12px' }}>
                {/* Left: Step title + description */}
                <div className="flex items-start gap-2" style={{ flexShrink: 0, minWidth: '180px', maxWidth: '240px' }}>
                    <span style={{ width: 4, height: 28, borderRadius: 4, background: stepColorMap[sectionKey] || '#6366F1', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                        <h2 className="text-base font-bold text-slate-800 tracking-tight" style={{ lineHeight: 1.2 }}>{activeStep.title}</h2>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{t.stepSubtitle}</p>
                    </div>
                </div>

                {/* Center: Step Navigation Circles */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', minWidth: 0 }}>
                    <StepNavigationBar
                        language={language}
                        currentStepId={activeStepId}
                        completedStepsStatus={completedStepsStatus || []}
                        onStepClick={onStepClick || (() => {})}
                        isProblemAnalysisComplete={completedStepsStatus?.[0] || false}
                    />
                </div>

                {/* Right: Generate button */}
                <div className="flex items-center gap-4" style={{ flexShrink: 0 }}>
                    {showGenerateButton && (
                        sectionKey === 'expectedResults'
                            ? <GenerateButton onClick={() => props.onGenerateCompositeSection('expectedResults')} isLoading={!!isLoading} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                            : <GenerateButton onClick={() => onGenerateSection(sectionKey)} isLoading={isLoading === `${t.generating} ${sectionKey}...`} title={t.generateSection} text={t.generateAI} missingApiKey={missingApiKey} />
                    )}
                </div>
            </header>

            {error && (() => {
                const isWarning = error.includes('partially done') || error.includes('delno uspel') || error.includes('fields failed') || error.includes('polj ni uspelo');
                return (
                    <div
                        className={`mx-6 mt-4 mb-2 flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm animate-fadeIn ${
                            isWarning
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                        role="alert"
                    >
                        <span className="text-lg flex-shrink-0 mt-0.5">{isWarning ? '⚠️' : '❌'}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold mb-0.5">
                                {isWarning
                                    ? (language === 'si' ? 'Delni prevod' : 'Partial Translation')
                                    : 'Error'}
                            </p>
                            <p className="text-sm leading-relaxed">{error}</p>
                        </div>
                    </div>
                );
            })()}
            
            {isLoading && <div className="p-4 m-6 text-center text-sky-700 bg-sky-50 rounded-lg animate-pulse border border-sky-100 font-medium">{typeof isLoading === 'string' ? isLoading : t.loading}</div>}

            <div 
                id="main-scroll-container" 
                className="step-content flex-1 overflow-y-auto p-6 scroll-smooth relative"
                style={{
                    '--step-card-bg': stepColors[sectionKey as keyof typeof stepColors]?.light || '#FFFFFF',
                    '--step-card-border': stepColors[sectionKey as keyof typeof stepColors]?.border || '#E2E8F0',
                } as React.CSSProperties}
            >
                <div className="max-w-5xl mx-auto pb-20">
                    <div className="animate-fadeIn" key={activeStepId}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ProjectDisplay;
