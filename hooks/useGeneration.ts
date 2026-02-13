// hooks/useGeneration.ts
// ═══════════════════════════════════════════════════════════════
// AI content generation — sections, fields, summaries.
// 
// SMART 3-LEVEL LOGIC for "Generate with AI" button:
//   1. Check if OTHER language version has content for this section
//      → If YES: offer "Translate from SI/EN" or "Generate new"
//   2. Check if CURRENT language already has content
//      → If YES: offer "Regenerate all" or "Fill missing only"
//   3. If nothing exists → generate without asking
//
// Errors are handled gracefully with user-friendly modals.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import {
  generateSectionContent,
  generateFieldContent,
  generateProjectSummary,
} from '../services/geminiService.ts';
import { generateSummaryDocx } from '../services/docxGenerator.ts';
import { recalculateProjectSchedule, downloadBlob } from '../utils.ts';
import { TEXT } from '../locales.ts';
import { storageService } from '../services/storageService.ts';
import { smartTranslateProject } from '../services/translationDiffService.ts';

interface UseGenerationProps {
  projectData: any;
  setProjectData: (fn: any) => void;
  language: 'en' | 'si';
  ensureApiKey: () => boolean;
  setIsSettingsOpen: (val: boolean) => void;
  setHasUnsavedTranslationChanges: (val: boolean) => void;
  handleUpdateData: (path: (string | number)[], value: any) => void;
  checkSectionHasContent: (sectionKey: string) => boolean;
  setModalConfig: (config: any) => void;
  closeModal: () => void;
  // NEW: needed for translation from other version
  currentProjectId: string | null;
  projectVersions: { en: any; si: any };
  setLanguage: (lang: 'en' | 'si') => void;
  setProjectVersions: (fn: (prev: { en: any; si: any }) => { en: any; si: any }) => void;
}

export const useGeneration = ({
  projectData,
  setProjectData,
  language,
  ensureApiKey,
  setIsSettingsOpen,
  setHasUnsavedTranslationChanges,
  handleUpdateData,
  checkSectionHasContent,
  setModalConfig,
  closeModal,
  currentProjectId,
  projectVersions,
  setLanguage,
  setProjectVersions,
}: UseGenerationProps) => {
  const [isLoading, setIsLoading] = useState<boolean | string>(false);
  const [error, setError] = useState<string | null>(null);

  // Summary state
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const t = TEXT[language] || TEXT['en'];

  // ─── Friendly error handler ────────────────────────────────────

  const handleAIError = useCallback(
    (e: any, context: string = '') => {
      const msg = e.message || e.toString();

      if (msg === 'MISSING_API_KEY') {
        setIsSettingsOpen(true);
        return;
      }

      if (msg.includes('Quota') || msg.includes('credits') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate limit') || msg.includes('afford')) {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Nezadostna sredstva AI' : 'Insufficient AI Credits',
          message: language === 'si'
            ? 'Vaš AI ponudnik nima dovolj sredstev za to zahtevo. Možne rešitve:\n\n• Dopolnite kredit pri vašem AI ponudniku\n• V Nastavitvah zamenjajte na cenejši model\n• V Nastavitvah preklopite na drugega AI ponudnika'
            : 'Your AI provider does not have enough credits for this request. Possible solutions:\n\n• Top up credits with your AI provider\n• Switch to a cheaper model in Settings\n• Switch to a different AI provider in Settings',
          confirmText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          secondaryText: '',
          cancelText: language === 'si' ? 'Zapri' : 'Close',
          onConfirm: () => { closeModal(); setIsSettingsOpen(true); },
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      if (msg.includes('JSON') || msg.includes('Unexpected token') || msg.includes('parse')) {
        setError(language === 'si'
          ? 'AI je vrnil nepravilen format. Poskusite ponovno.'
          : 'AI returned an invalid format. Please try again.');
        return;
      }

      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('ERR_')) {
        setError(language === 'si'
          ? 'Omrežna napaka. Preverite internetno povezavo in poskusite ponovno.'
          : 'Network error. Check your internet connection and try again.');
        return;
      }

      console.error(`[AI Error] ${context}:`, e);
      setError(language === 'si'
        ? 'Napaka pri generiranju. Preverite konzolo (F12) za podrobnosti.'
        : 'Generation error. Check console (F12) for details.');
    },
    [language, setIsSettingsOpen, setModalConfig, closeModal]
  );

  // ─── Check if other language has content for a section ─────────

  const checkOtherLanguageHasContent = useCallback(
    async (sectionKey: string): Promise<any | null> => {
      const otherLang = language === 'en' ? 'si' : 'en';

      // First check in-memory versions
      const cached = projectVersions[otherLang];
      if (cached) {
        const sectionData = cached[sectionKey];
        if (sectionData) {
          if (Array.isArray(sectionData) && sectionData.length > 0 &&
              sectionData.some((item: any) => item.title?.trim() || item.description?.trim())) {
            return cached;
          }
          if (typeof sectionData === 'object' && !Array.isArray(sectionData)) {
            const hasText = Object.values(sectionData).some((v: any) =>
              typeof v === 'string' && v.trim().length > 0
            );
            if (hasText) return cached;
          }
        }
      }

      // If not in memory, try loading from storage
      try {
        const loaded = await storageService.loadProject(otherLang, currentProjectId);
        if (loaded) {
          const sectionData = loaded[sectionKey];
          if (sectionData) {
            if (Array.isArray(sectionData) && sectionData.length > 0 &&
                sectionData.some((item: any) => item.title?.trim() || item.description?.trim())) {
              return loaded;
            }
            if (typeof sectionData === 'object' && !Array.isArray(sectionData)) {
              const hasText = Object.values(sectionData).some((v: any) =>
                typeof v === 'string' && v.trim().length > 0
              );
              if (hasText) return loaded;
            }
          }
        }
      } catch (e) {
        console.warn('[useGeneration] Could not load other language version:', e);
      }

      return null;
    },
    [language, projectVersions, currentProjectId]
  );

  // ─── Perform translation from other language ───────────────────

  const performTranslationFromOther = useCallback(
    async (otherLangData: any) => {
      closeModal();
      setIsLoading(language === 'si' ? 'Prevajanje iz EN...' : 'Translating from SI...');
      setError(null);

      try {
        const { translatedData, stats } = await smartTranslateProject(
          otherLangData,
          language,
          projectData, // existing target = current data (preserve what we have)
          currentProjectId!
        );

        if (stats.failed > 0 && stats.translated === 0) {
          throw new Error('credits');
        }

        setProjectData(translatedData);
        setHasUnsavedTranslationChanges(false);
        await storageService.saveProject(translatedData, language, currentProjectId);

        setProjectVersions((prev) => ({
          ...prev,
          [language]: translatedData,
        }));

        if (stats.failed > 0) {
          setError(language === 'si'
            ? `Prevod delno uspel: ${stats.translated}/${stats.changed} polj prevedenih.`
            : `Translation partially done: ${stats.translated}/${stats.changed} fields translated.`);
        }
      } catch (e: any) {
        handleAIError(e, 'translateFromOtherLanguage');
      } finally {
        setIsLoading(false);
      }
    },
    [language, projectData, currentProjectId, closeModal, setProjectData,
     setHasUnsavedTranslationChanges, setProjectVersions, handleAIError]
  );

  // ─── Execute section generation ────────────────────────────────

  const executeGeneration = useCallback(
    async (sectionKey: string, mode: string = 'regenerate') => {
      closeModal();
      setIsLoading(`${t.generating} ${sectionKey}...`);
      setError(null);

      try {
        const generatedData = await generateSectionContent(
          sectionKey,
          projectData,
          language,
          mode
        );

        let newData = { ...projectData };
        if (['problemAnalysis', 'projectIdea'].includes(sectionKey)) {
          newData[sectionKey] = { ...newData[sectionKey], ...generatedData };
        } else {
          newData[sectionKey] = generatedData;
        }

        if (sectionKey === 'activities') {
          const schedResult = recalculateProjectSchedule(newData);
          newData = schedResult.projectData;
          if (schedResult.warnings.length > 0) {
            console.warn('Schedule warnings:', schedResult.warnings);
          }

          // Auto-generate risks after activities
          setIsLoading(`${t.generating} ${t.subSteps.riskMitigation}...`);
          try {
            const risksContent = await generateSectionContent('risks', newData, language, mode);
            newData.risks = risksContent;
          } catch (e) {
            console.error(e);
          }
        }

        setProjectData(newData);
        setHasUnsavedTranslationChanges(true);
      } catch (e: any) {
        handleAIError(e, `generateSection(${sectionKey})`);
      } finally {
        setIsLoading(false);
      }
    },
    [projectData, language, t, closeModal, setProjectData, setHasUnsavedTranslationChanges, handleAIError]
  );

  // ─── SMART Handle generate (3-level logic) ─────────────────────

  const handleGenerateSection = useCallback(
    async (sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const otherLang = language === 'en' ? 'SI' : 'EN';
      const currentHasContent = checkSectionHasContent(sectionKey);

      // LEVEL 1: Check if other language has content → offer translate
      const otherLangData = await checkOtherLanguageHasContent(sectionKey);

      if (otherLangData && !currentHasContent) {
        // Other language has content, current is empty → translate or generate?
        setModalConfig({
          isOpen: true,
          title: language === 'si'
            ? `Vsebina obstaja v ${otherLang}`
            : `Content exists in ${otherLang}`,
          message: language === 'si'
            ? `To poglavje že ima vsebino v ${otherLang} jeziku. Želite prevesti obstoječo vsebino ali generirati novo?`
            : `This section already has content in ${otherLang}. Would you like to translate existing content or generate new?`,
          confirmText: language === 'si'
            ? `Prevedi iz ${otherLang}`
            : `Translate from ${otherLang}`,
          secondaryText: language === 'si'
            ? 'Generiraj novo'
            : 'Generate new',
          cancelText: t.modals.cancel,
          onConfirm: () => performTranslationFromOther(otherLangData),
          onSecondary: () => executeGeneration(sectionKey, 'regenerate'),
          onCancel: closeModal,
        });
        return;
      }

      if (otherLangData && currentHasContent) {
        // Both languages have content → translate, regenerate, or fill?
        setModalConfig({
          isOpen: true,
          title: language === 'si'
            ? `Vsebina obstaja v obeh jezikih`
            : `Content exists in both languages`,
          message: language === 'si'
            ? `To poglavje ima vsebino v obeh jezikih. Želite prevesti iz ${otherLang}, generirati vse na novo, ali samo dopolniti prazna polja?`
            : `This section has content in both languages. Would you like to translate from ${otherLang}, regenerate everything, or just fill missing fields?`,
          confirmText: language === 'si'
            ? `Prevedi iz ${otherLang}`
            : `Translate from ${otherLang}`,
          secondaryText: t.modals.fillMissingBtn,
          cancelText: t.modals.cancel,
          onConfirm: () => performTranslationFromOther(otherLangData),
          onSecondary: () => executeGeneration(sectionKey, 'fill'),
          onCancel: closeModal,
        });
        return;
      }

      // LEVEL 2: Only current language has content → regenerate or fill?
      if (currentHasContent) {
        setModalConfig({
          isOpen: true,
          title: t.modals.generationChoiceTitle,
          message: t.modals.generationChoiceMsg,
          confirmText: t.modals.regenerateAllBtn,
          secondaryText: t.modals.fillMissingBtn,
          cancelText: t.modals.cancel,
          onConfirm: () => executeGeneration(sectionKey, 'regenerate'),
          onSecondary: () => executeGeneration(sectionKey, 'fill'),
          onCancel: closeModal,
        });
        return;
      }

      // LEVEL 3: Nothing exists anywhere → just generate
      executeGeneration(sectionKey, 'regenerate');
    },
    [ensureApiKey, language, t, checkSectionHasContent, checkOtherLanguageHasContent,
     executeGeneration, performTranslationFromOther, setModalConfig, closeModal, setIsSettingsOpen]
  );

  // ─── Composite generation (outputs + outcomes + impacts + KERs) ─

  const handleGenerateCompositeSection = useCallback(
    async (_sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const sections = ['outputs', 'outcomes', 'impacts', 'kers'];
      const hasContentInSections = sections.some((s) => checkSectionHasContent(s));
      const otherLang = language === 'en' ? 'SI' : 'EN';

      // Check if other language has content in any of the composite sections
      let otherLangData: any = null;
      for (const s of sections) {
        otherLangData = await checkOtherLanguageHasContent(s);
        if (otherLangData) break;
      }

      const runComposite = async (mode: string) => {
        closeModal();
        setIsLoading(true);
        setError(null);

        try {
          for (const s of sections) {
            setIsLoading(`${t.generating} ${s}...`);
            const generatedData = await generateSectionContent(s, projectData, language, mode);
            setProjectData((prev: any) => {
              const next = { ...prev };
              next[s] = generatedData;
              return next;
            });
            await new Promise((r) => setTimeout(r, 100));
          }
          setHasUnsavedTranslationChanges(true);
        } catch (e: any) {
          handleAIError(e, 'generateComposite');
        } finally {
          setIsLoading(false);
        }
      };

      if (otherLangData && !hasContentInSections) {
        // Other language has results, current is empty
        setModalConfig({
          isOpen: true,
          title: language === 'si'
            ? `Rezultati obstajajo v ${otherLang}`
            : `Results exist in ${otherLang}`,
          message: language === 'si'
            ? `Pričakovani rezultati že obstajajo v ${otherLang} jeziku. Želite prevesti ali generirati na novo?`
            : `Expected results already exist in ${otherLang}. Would you like to translate or generate new?`,
          confirmText: language === 'si'
            ? `Prevedi iz ${otherLang}`
            : `Translate from ${otherLang}`,
          secondaryText: language === 'si' ? 'Generiraj novo' : 'Generate new',
          cancelText: t.modals.cancel,
          onConfirm: () => performTranslationFromOther(otherLangData),
          onSecondary: () => runComposite('regenerate'),
          onCancel: closeModal,
        });
      } else if (otherLangData && hasContentInSections) {
        setModalConfig({
          isOpen: true,
          title: language === 'si'
            ? `Rezultati obstajajo v obeh jezikih`
            : `Results exist in both languages`,
          message: language === 'si'
            ? `Želite prevesti iz ${otherLang}, dopolniti manjkajoča polja ali generirati vse na novo?`
            : `Would you like to translate from ${otherLang}, fill missing fields, or regenerate everything?`,
          confirmText: language === 'si'
            ? `Prevedi iz ${otherLang}`
            : `Translate from ${otherLang}`,
          secondaryText: t.modals.fillMissingBtn,
          cancelText: t.modals.cancel,
          onConfirm: () => performTranslationFromOther(otherLangData),
          onSecondary: () => runComposite('fill'),
          onCancel: closeModal,
        });
      } else if (hasContentInSections) {
        setModalConfig({
          isOpen: true,
          title: t.modals.generationChoiceTitle,
          message: t.modals.generationChoiceMsg,
          confirmText: t.modals.regenerateAllBtn,
          secondaryText: t.modals.fillMissingBtn,
          cancelText: t.modals.cancel,
          onConfirm: () => runComposite('regenerate'),
          onSecondary: () => runComposite('fill'),
          onCancel: closeModal,
        });
      } else {
        runComposite('regenerate');
      }
    },
    [ensureApiKey, checkSectionHasContent, checkOtherLanguageHasContent, projectData,
     language, t, closeModal, setProjectData, setHasUnsavedTranslationChanges,
     setIsSettingsOpen, setModalConfig, handleAIError, performTranslationFromOther]
  );

  // ─── Single field generation ───────────────────────────────────

  const handleGenerateField = useCallback(
    async (path: (string | number)[]) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const fieldName = path[path.length - 1];
      setIsLoading(`${t.generating} ${String(fieldName)}...`);
      setError(null);

      try {
        const content = await generateFieldContent(path, projectData, language);
        handleUpdateData(path, content);
      } catch (e: any) {
        handleAIError(e, `generateField(${String(fieldName)})`);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureApiKey, projectData, language, t, handleUpdateData, setIsSettingsOpen, handleAIError]
  );

  // ─── Summary generation ────────────────────────────────────────

  const runSummaryGeneration = useCallback(async () => {
    setIsGeneratingSummary(true);
    setSummaryText('');
    try {
      const text = await generateProjectSummary(projectData, language);
      setSummaryText(text);
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('credits') || msg.includes('Quota') || msg.includes('afford')) {
        setSummaryText(language === 'si'
          ? 'Nezadostna sredstva AI. Dopolnite kredit ali zamenjajte model v Nastavitvah.'
          : 'Insufficient AI credits. Top up credits or switch model in Settings.');
      } else {
        setSummaryText(language === 'si'
          ? 'Napaka pri generiranju povzetka. Poskusite ponovno.'
          : 'Error generating summary. Please try again.');
      }
      console.error('[Summary Error]:', e);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [projectData, language]);

  const handleExportSummary = useCallback(() => {
    setSummaryModalOpen(true);
    if (!summaryText) {
      runSummaryGeneration();
    }
  }, [summaryText, runSummaryGeneration]);

  const handleDownloadSummaryDocx = useCallback(async () => {
    try {
      const blob = await generateSummaryDocx(
        summaryText,
        projectData.projectIdea?.projectTitle,
        language
      );
      downloadBlob(blob, `Summary - ${projectData.projectIdea?.projectTitle || 'Project'}.docx`);
    } catch (e: any) {
      console.error(e);
      alert(language === 'si'
        ? 'Napaka pri generiranju DOCX datoteke.'
        : 'Failed to generate DOCX file.');
    }
  }, [summaryText, projectData, language]);

  return {
    isLoading,
    setIsLoading,
    error,
    setError,
    summaryModalOpen,
    setSummaryModalOpen,
    summaryText,
    isGeneratingSummary,
    handleGenerateSection,
    handleGenerateCompositeSection,
    handleGenerateField,
    handleExportSummary,
    runSummaryGeneration,
    handleDownloadSummaryDocx,
  };
};
