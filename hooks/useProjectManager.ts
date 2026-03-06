// hooks/useProjectManager.ts
// ═══════════════════════════════════════════════════════════════
// Project CRUD, import/export, save, auto-save, navigation.
// On login: shows project list instead of auto-loading last project.
// v1.4 - 
// v1.3 — 2026-02-23 — FIX: Project duplication/loss race condition
//   - NEW: isLoadingProjectRef guard — prevents auto-save and sync effect
//     from interfering during loadActiveProject
//   - FIX: setProjectVersions now called BEFORE setProjectData in loadActiveProject
//   - FIX: sync useEffect and auto-save both skip when isLoadingProjectRef is true
//   - Resolves: project data mixing between EN/SI, project "disappearing"
//
// v1.2 — 2026-02-23 — FIX: WP/Task prefix migration on project load
//   - NEW: migrateActivityPrefixes() — auto-fixes WP/Task IDs per language
//   - EN: WP1, T1.1 | SI: DS1, N1.1
//   - Runs on every loadActiveProject, zero overhead if already correct
// v1.1 — 2026-02-21 — FIX: IMPORT SOURCE
//   - CHANGED: detectProjectLanguage imported from utils.ts instead of
//     geminiService.ts (was never re-exported from geminiService)
//   - All previous logic preserved.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { storageService } from '../services/storageService.ts';
import { generateDocx } from '../services/docxGenerator.ts';
import {
  set,
  createEmptyProjectData,
  downloadBlob,
  recalculateProjectSchedule,
  safeMerge,
  detectProjectLanguage,
} from '../utils.ts';
import html2canvas from 'html2canvas';

// ★ v1.2: Migrate WP/Task ID prefixes based on language
// EN: WP1, T1.1 | SI: DS1, N1.1
const migrateActivityPrefixes = (data: any, lang: 'en' | 'si'): any => {
  const activities = data?.activities;
  if (!activities || !Array.isArray(activities) || activities.length === 0) return data;

  const wpPfx = lang === 'si' ? 'DS' : 'WP';
  const tskPfx = lang === 'si' ? 'N' : 'T';
  const wrongWpPfx = lang === 'si' ? 'WP' : 'DS';
  const wrongTskPfx = lang === 'si' ? 'T' : 'N';

  // Check ALL WP and Task IDs — if ANY has wrong prefix, migrate everything
  let needsMigration = false;
  for (const wp of activities) {
    const wpId = (wp.id || '').toString();
    if (wpId.startsWith(wrongWpPfx)) { needsMigration = true; break; }
    for (const task of (wp.tasks || [])) {
      const taskId = (task.id || '').toString();
      if (taskId.startsWith(wrongTskPfx)) { needsMigration = true; break; }
    }
    if (needsMigration) break;
  }

  if (!needsMigration) return data;

  console.log(`[PrefixMigration] Migrating activity prefixes to ${lang.toUpperCase()} (${wpPfx}/${tskPfx})`);

  // Build old→new ID map for dependency fixes
  const idMap = new Map<string, string>();

  const migratedActivities = activities.map((wp: any, wpIdx: number) => {
    const newWpId = `${wpPfx}${wpIdx + 1}`;
    if (wp.id && wp.id !== newWpId) idMap.set(wp.id, newWpId);

    const tasks = (wp.tasks || []).map((task: any, tIdx: number) => {
      const newTaskId = `${tskPfx}${wpIdx + 1}.${tIdx + 1}`;
      if (task.id && task.id !== newTaskId) idMap.set(task.id, newTaskId);
      return { ...task, id: newTaskId };
    });

    const milestones = (wp.milestones || []).map((ms: any, mIdx: number) => ({
      ...ms,
      id: `M${wpIdx + 1}.${mIdx + 1}`,
    }));

    const deliverables = (wp.deliverables || []).map((del: any, dIdx: number) => ({
      ...del,
      id: `D${wpIdx + 1}.${dIdx + 1}`,
    }));

    return { ...wp, id: newWpId, tasks, milestones, deliverables };
  });

  // Fix dependency predecessorId references
  migratedActivities.forEach((wp: any) => {
    (wp.tasks || []).forEach((task: any) => {
      if (task.dependencies && Array.isArray(task.dependencies)) {
        task.dependencies = task.dependencies.map((dep: any) => ({
          ...dep,
          predecessorId: idMap.get(dep.predecessorId) || dep.predecessorId,
        }));
      }
    });
  });

console.log('[PrefixMigration] Migrated ' + idMap.size + ' IDs');

  // ★ v1.2: Migrate partner coordinator code (EN=CO, SI=KO)
  let migratedPartners = data.partners;
  if (Array.isArray(data.partners) && data.partners.length > 0) {
    const correctCoCode = lang === 'si' ? 'KO' : 'CO';
    const wrongCoCode = lang === 'si' ? 'CO' : 'KO';
    if (data.partners[0]?.code === wrongCoCode) {
      migratedPartners = data.partners.map((p: any, idx: number) => {
        if (idx === 0) return { ...p, code: correctCoCode };
        return p;
      });
      console.log('[PrefixMigration] Coordinator code: ' + wrongCoCode + ' -> ' + correctCoCode);
    }
  }

    return { ...data, activities: migratedActivities, partners: migratedPartners };
};

interface UseProjectManagerProps {

  language: 'en' | 'si';
  setLanguage: (lang: 'en' | 'si') => void;
  currentUser: string | null;
}

export const useProjectManager = ({
  language,
  setLanguage,
  currentUser,
}: UseProjectManagerProps) => {
  const [projectData, setProjectData] = useState(createEmptyProjectData());
  const [projectVersions, setProjectVersions] = useState<{ en: any; si: any }>({
    en: null,
    si: null,
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [hasUnsavedTranslationChanges, setHasUnsavedTranslationChanges] =
    useState(false);
  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  
  // NEW: Flag to show project list on login
  const [showProjectListOnLogin, setShowProjectListOnLogin] = useState(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const isLoadingProjectRef = useRef(false);
  
  // ★ v1.4: Undo/Redo history stack (5 steps max)
  const MAX_HISTORY = 5;
  const undoStackRef = useRef<any[]>([]);
  const redoStackRef = useRef<any[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const skipHistoryRef = useRef(false);
  
  // ─── Helpers ───────────────────────────────────────────────────

  const hasContent = useCallback((data: any): boolean => {
    if (!data) return false;
    // Check core fields
    if ((data.problemAnalysis?.coreProblem?.title || '') !== '') return true;
    if ((data.projectIdea?.projectTitle || '') !== '') return true;
    if ((data.projectIdea?.mainAim || '') !== '') return true;
    // Check array sections — if any has content, project should be saved
    const arraySections = ['generalObjectives', 'specificObjectives', 'activities', 'outputs', 'outcomes', 'impacts', 'risks', 'kers', 'partners'];
    for (const key of arraySections) {
      const arr = data[key];
      if (Array.isArray(arr) && arr.length > 0) {
        if (arr.some((item: any) => 
          (item.title && item.title.trim() !== '') || 
          (item.description && item.description.trim() !== '') ||
          (item.name && item.name.trim() !== '')
        )) return true;
      }
    }
    return false;
  }, []);

  // ★ v1.4: Push current state to undo stack before any change
const pushToHistory = useCallback(function(data: any) {
  if (skipHistoryRef.current) return;
  var stack = undoStackRef.current;
  // Don't push if data is identical to last snapshot
  if (stack.length > 0) {
    var lastJson = JSON.stringify(stack[stack.length - 1]);
    var currentJson = JSON.stringify(data);
    if (lastJson === currentJson) return;
  }
  stack.push(JSON.parse(JSON.stringify(data)));
  if (stack.length > MAX_HISTORY) {
    stack.shift();
  }
  undoStackRef.current = stack;
  redoStackRef.current = [];
  setCanUndo(stack.length > 0);
  setCanRedo(false);
}, []);

  // ★ v1.4: Undo — restore previous state
var handleUndo = useCallback(function() {
  var stack = undoStackRef.current;
  if (stack.length === 0) return;
  var previousState = stack.pop();
  undoStackRef.current = stack;
  // Push current state to redo
  redoStackRef.current.push(JSON.parse(JSON.stringify(projectData)));
  if (redoStackRef.current.length > MAX_HISTORY) redoStackRef.current.shift();
  // Restore without pushing to history
  skipHistoryRef.current = true;
  setProjectData(previousState);
  setHasUnsavedTranslationChanges(true);
  skipHistoryRef.current = false;
  setCanUndo(stack.length > 0);
  setCanRedo(redoStackRef.current.length > 0);
}, [projectData]);

// ★ v1.4: Redo — restore next state
var handleRedo = useCallback(function() {
  var stack = redoStackRef.current;
  if (stack.length === 0) return;
  var nextState = stack.pop();
  redoStackRef.current = stack;
  // Push current state to undo
  undoStackRef.current.push(JSON.parse(JSON.stringify(projectData)));
  if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
  // Restore without pushing to history
  skipHistoryRef.current = true;
  setProjectData(nextState);
  setHasUnsavedTranslationChanges(true);
  skipHistoryRef.current = false;
  setCanUndo(undoStackRef.current.length > 0);
  setCanRedo(stack.length > 0);
}, [projectData]);

  
  const generateFilename = useCallback((extension: string): string => {
    const acronym = projectData.projectIdea?.projectAcronym?.trim();
    const title = projectData.projectIdea?.projectTitle?.trim();
    let baseName = 'eu-project';
    if (acronym && title) baseName = `${acronym} - ${title}`;
    else if (title) baseName = title;
    else if (acronym) baseName = acronym;
    const sanitized = baseName.replace(/[<>:"/\\|?*]/g, '_');
    return `${sanitized}.${extension}`;
  }, [projectData.projectIdea?.projectAcronym, projectData.projectIdea?.projectTitle]);

  const getNestedValue = (obj: any, path: (string | number)[]): any => {
    return path.reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj
    );
  };

  const checkSectionHasContent = useCallback((sectionKey: string): boolean => {
    const data = (projectData as any)[sectionKey];
    if (Array.isArray(data)) {
      return data.some(
        (item: any) =>
          (item.title && item.title.trim() !== '') ||
          (item.description && item.description.trim() !== '')
      );
    }
    if (sectionKey === 'problemAnalysis') {
      return (
        !!data.coreProblem.title ||
        data.causes.some((c: any) => c.title) ||
        data.consequences.some((c: any) => c.title)
      );
    }
    if (sectionKey === 'projectIdea') {
      return !!data.mainAim || !!data.proposedSolution;
    }
    return false;
  }, [projectData]);

  // ─── Project list ──────────────────────────────────────────────

  const refreshProjectList = useCallback(async () => {
    const list = await storageService.getUserProjects();
    setUserProjects(list);
    return list;
  }, []);

  // ─── Load active project ──────────────────────────────────────
  // ★ v1.2: Added migrateActivityPrefixes call after safeMerge

    const loadActiveProject = useCallback(
    async (specificId: string | null = null) => {
      // ★ v1.3: Guard — prevent auto-save and sync effect during load
      isLoadingProjectRef.current = true;
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      canUndo,
      canRedo,
      handleUndo,
      handleRedo,
      try {
        const loadedData = await storageService.loadProject(language, specificId);

        if (loadedData) {
          // ★ v1.2: Migrate WP/Task prefixes to match current language
          const mergedData = migrateActivityPrefixes(safeMerge(loadedData), language);
          const otherLang = language === 'en' ? 'si' : 'en';
          const otherData = await storageService.loadProject(otherLang, specificId);
          const mergedOther = otherData ? migrateActivityPrefixes(safeMerge(otherData), otherLang) : null;

          // ★ v1.3: Set projectVersions BEFORE projectData to prevent sync effect from overwriting
          setProjectVersions({
            en: language === 'en' ? mergedData : mergedOther,
            si: language === 'si' ? mergedData : mergedOther,
          });
          setProjectData(mergedData);
        } else {
          setProjectData(createEmptyProjectData());
          setProjectVersions({ en: null, si: null });
        }

        const activeId = storageService.getCurrentProjectId();
        setCurrentProjectId(activeId);
      } finally {
        // ★ v1.3: Release guard after a tick to let React batch the state updates
        setTimeout(() => { isLoadingProjectRef.current = false; }, 100);
      }
    },
    [language]
  );

  // ─── Initialize on login ──────────────────────────────────────
  // CHANGED: Don't auto-load last project. Instead, load project list
  // and signal App.tsx to show the project selection modal.

  useEffect(() => {
    if (currentUser) {
      const init = async () => {
        await storageService.loadSettings();
        const projects = await refreshProjectList();
        
        // Always show project list on login so user can choose
        if (projects.length > 0) {
          setShowProjectListOnLogin(true);
        } else {
          // No projects — create first one and go directly
          const newProj = await storageService.createProject();
          if (newProj) {
            setCurrentProjectId(newProj.id);
            storageService.setCurrentProjectId(newProj.id);
            await loadActiveProject(newProj.id);
            await refreshProjectList();
          }
        }
      };
      init();
    }
  }, [currentUser]); // intentionally omit refreshProjectList, loadActiveProject

  // ─── Sync project versions ────────────────────────────────────
  // ★ v1.3: Skip sync during loadActiveProject to prevent overwriting other language

  useEffect(() => {
    if (isLoadingProjectRef.current) return;
    setProjectVersions((prev) => ({
      en: language === 'en' ? projectData : prev.en,
      si: language === 'si' ? projectData : prev.si,
    }));
  }, [projectData, language]);

  // ─── Auto-save (debounced 2s) ─────────────────────────────────
  // ★ v1.3: Skip auto-save during loadActiveProject to prevent saving migrated data prematurely

  useEffect(() => {
    // Only auto-save if a project is actually loaded
    if (!currentProjectId) return;
    
    const timer = setTimeout(async () => {
      if (isLoadingProjectRef.current) return;
      if (currentUser && hasContent(projectData)) {
        await storageService.saveProject(projectData, language, currentProjectId);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [projectData, currentUser, language, currentProjectId, hasContent]);

  // ─── Logout cleanup ───────────────────────────────────────────

  const resetOnLogout = useCallback(() => {
    setCurrentProjectId(null);
    setProjectData(createEmptyProjectData());
    setCurrentStepId(null);
    setHasUnsavedTranslationChanges(false);
    setShowProjectListOnLogin(false);
  }, []);

  // ─── CRUD handlers ────────────────────────────────────────────

  const handleSwitchProject = useCallback(
    async (projectId: string) => {
      if (projectId === currentProjectId) {
        // Even if same project, dismiss the login modal
        setShowProjectListOnLogin(false);
        return;
      }

      // Save current project before switching (if one is loaded)
      if (currentProjectId && hasContent(projectData)) {
        await storageService.saveProject(projectData, language, currentProjectId);
      }
      
      storageService.setCurrentProjectId(projectId);
      await loadActiveProject(projectId);
      setCurrentStepId(null);
      setHasUnsavedTranslationChanges(false);
      setShowProjectListOnLogin(false);
    },
    [currentProjectId, projectData, language, loadActiveProject, hasContent]
  );

  const handleCreateProject = useCallback(async () => {
    if (currentProjectId && hasContent(projectData)) {
      await storageService.saveProject(projectData, language, currentProjectId);
    }

    const newProj = await storageService.createProject();
    if (!newProj || !newProj.id) {
      throw new Error('Failed to create project. Check your session.');
    }

    await refreshProjectList();
    setCurrentProjectId(newProj.id);
    storageService.setCurrentProjectId(newProj.id);
    await loadActiveProject(newProj.id);
    setCurrentStepId(1);
    setShowProjectListOnLogin(false);
    return newProj;
  }, [currentProjectId, projectData, language, hasContent, refreshProjectList, loadActiveProject]);

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      await storageService.deleteProject(projectId);
      await refreshProjectList();

      if (projectId === currentProjectId) {
        setCurrentProjectId(null);
        setProjectData(createEmptyProjectData());
        setCurrentStepId(null);
      }
    },
    [currentProjectId, refreshProjectList]
  );

  // ─── Data update ──────────────────────────────────────────────

  const handleUpdateData = useCallback(
  (path: (string | number)[], value: any) => {
    setProjectData((prevData: any) => {
      pushToHistory(prevData);
      setProjectData((prevData: any) => {
        let newData = set(prevData, path, value);
        if (path[0] === 'activities') {
          const scheduleResult = recalculateProjectSchedule(newData);
          newData = scheduleResult.projectData;
          if (scheduleResult.warnings.length > 0) {
            console.warn('Schedule warnings:', scheduleResult.warnings);
          }
        }
        return newData;
      });
      setHasUnsavedTranslationChanges(true);
    },
    []
  );

  const handleAddItem = useCallback(
  (path: (string | number)[], newItem: any) => {
    setProjectData((prev: any) => {
      pushToHistory(prev);
        const list = getNestedValue(prev, path) || [];
        return set(prev, path, [...list, newItem]);
      });
      setHasUnsavedTranslationChanges(true);
    },
    []
  );

  const handleRemoveItem = useCallback(
  (path: (string | number)[], index: number) => {
    setProjectData((prev: any) => {
      pushToHistory(prev);
        const list = getNestedValue(prev, path);
        if (!Array.isArray(list)) return prev;
        const newList = list.filter((_: any, i: number) => i !== index);
        return set(prev, path, newList);
      });
      setHasUnsavedTranslationChanges(true);
    },
    []
  );

  // ─── Save + Export JSON ────────────────────────────────────────

  const handleSaveToStorage = useCallback(async () => {
    if (!currentUser) {
      alert('Not logged in!');
      return;
    }

    try {
      await storageService.saveProject(projectData, language, currentProjectId);
      const otherLang = language === 'en' ? 'si' : 'en';
      if (projectVersions[otherLang]) {
        await storageService.saveProject(
          projectVersions[otherLang],
          otherLang,
          currentProjectId
        );
      }
      await refreshProjectList();

      const exportData = {
        meta: {
          version: '3.0',
          createdAt: new Date().toISOString(),
          activeLanguage: language,
          author: currentUser,
          projectId: currentProjectId,
        },
        data: {
          en: language === 'en' ? projectData : projectVersions.en || null,
          si: language === 'si' ? projectData : projectVersions.si || null,
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      downloadBlob(blob, generateFilename('json'));
    } catch (e: any) {
      console.error('Save error:', e);
      alert('Error saving project: ' + e.message);
    }
  }, [currentUser, projectData, language, currentProjectId, projectVersions, refreshProjectList, generateFilename]);

  // ─── Import JSON ───────────────────────────────────────────────

  const handleImportProject = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const text = e.target?.result;
            if (typeof text !== 'string')
              throw new Error('File content is not valid text.');
            const importedJson = JSON.parse(text);

            const newProj = await storageService.createProject();
            if (!newProj || !newProj.id) {
              throw new Error(
                'Failed to create new project. Please check your login session.'
              );
            }

            let finalData = createEmptyProjectData();
            let targetLang: 'en' | 'si' = 'en';

            if (importedJson.meta && importedJson.data) {
              const { en, si } = importedJson.data;
              const preferredLang = importedJson.meta.activeLanguage || 'en';
              const safeEn = en ? safeMerge(en) : null;
              const safeSi = si ? safeMerge(si) : null;

              if (safeEn) await storageService.saveProject(safeEn, 'en', newProj.id);
              if (safeSi) await storageService.saveProject(safeSi, 'si', newProj.id);

              if (preferredLang === 'si' && safeSi) {
                finalData = safeSi;
                targetLang = 'si';
              } else {
                finalData = safeEn || safeSi || createEmptyProjectData();
                targetLang = safeEn ? 'en' : 'si';
              }
            } else if (importedJson.problemAnalysis) {
              const detectedLang = detectProjectLanguage(importedJson);
              finalData = safeMerge(importedJson);
              targetLang = detectedLang as 'en' | 'si';
              await storageService.saveProject(finalData, targetLang, newProj.id);
            } else {
              throw new Error(
                'Unrecognized JSON format. Expected project data with meta+data or problemAnalysis.'
              );
            }

            await refreshProjectList();
            setCurrentProjectId(newProj.id);
            storageService.setCurrentProjectId(newProj.id);
            setProjectData(finalData);
            setLanguage(targetLang);
            setCurrentStepId(1);
            setShowProjectListOnLogin(false);
            resolve();
          } catch (err: any) {
            reject(err);
          }
        };
        reader.readAsText(file);
        event.target.value = '';
      });
    },
    [refreshProjectList, setLanguage]
  );

  // ─── Export DOCX ───────────────────────────────────────────────

  const handleExportDocx = useCallback(
    async (setIsLoading: (val: boolean | string) => void) => {
      setIsLoading('Rendering Graphs...');
      await new Promise((r) => setTimeout(r, 2000));

      const exportOptions = {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      };

      let ganttData = null;
      const ganttEl = document.getElementById('gantt-chart-export');
      if (ganttEl) {
        try {
          const ganttExportOptions = {
            ...exportOptions,
            width: ganttEl.scrollWidth,
            height: ganttEl.scrollHeight,
            windowWidth: ganttEl.scrollWidth,
            windowHeight: ganttEl.scrollHeight,
          };
          const canvas = await html2canvas(ganttEl as HTMLElement, ganttExportOptions);
          ganttData = {
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
          };
        } catch (e) {
          console.warn('Gantt capture failed', e);
        }
      }

      let pertData = null;
      const pertEl = document.getElementById('pert-chart-export');
      if (pertEl) {
        try {
          const canvas = await html2canvas(pertEl as HTMLElement, exportOptions);
          pertData = {
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
          };
        } catch (e) {
          console.warn('PERT capture failed', e);
        }
      }

      let organigramData = null;
      const orgEl = document.getElementById('organigram-export');
      if (orgEl) {
        try {
          const canvas = await html2canvas(orgEl as HTMLElement, exportOptions);
          organigramData = {
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
          };
        } catch (e) {
          console.warn('Organigram capture failed', e);
        }
      }

      setIsLoading('Generating DOCX...');
      try {
        const blob = await generateDocx(projectData, language, ganttData, pertData, organigramData);
        downloadBlob(blob, generateFilename('docx'));
      } catch (e: any) {
        throw new Error('Failed to generate DOCX file: ' + e.message);
      } finally {
        setIsLoading(false);
      }
    },
    [projectData, language, generateFilename]
  );

  // ─── Navigation ────────────────────────────────────────────────

  const handleStartEditing = useCallback((stepId: number) => {
    setCurrentStepId(stepId);
  }, []);

  const handleBackToWelcome = useCallback(() => {
    setCurrentStepId(null);
  }, []);

  const handleSubStepClick = useCallback((subStepId: string) => {
    const el = document.getElementById(subStepId);
    const container = document.getElementById('main-content-area');
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top;
      container.scrollBy({ top: relativeTop - 24, behavior: 'smooth' });
    } else if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    projectData,
    setProjectData,
    projectVersions,
    setProjectVersions,
    currentProjectId,
    setCurrentProjectId,
    userProjects,
    currentStepId,
    setCurrentStepId,
    hasUnsavedTranslationChanges,
    setHasUnsavedTranslationChanges,
    showProjectListOnLogin,
    setShowProjectListOnLogin,
    importInputRef,
    hasContent,
    checkSectionHasContent,
    generateFilename,
    refreshProjectList,
    loadActiveProject,
    resetOnLogout,
    handleSwitchProject,
    handleCreateProject,
    handleDeleteProject,
    handleUpdateData,
    handleAddItem,
    handleRemoveItem,
    handleSaveToStorage,
    handleImportProject,
    handleExportDocx,
    handleStartEditing,
    handleBackToWelcome,
    handleSubStepClick,
  };
};
