// hooks/useGeneration.ts
// ═══════════════════════════════════════════════════════════════
// AI content generation — sections, fields, summaries.
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
}: UseGenerationProps) => {
  const [isLoading, setIsLoading] = useState<boolean | string>(false);
  const [error, setError] = useState<string | null>(null);

  // Summary state
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const t = TEXT[language] || TEXT['en'];

  // ─── Friendly error handler ────────────────────────────────────
  // Converts raw API errors into user-friendly modal messages.
  // Never shows raw error text on the main screen.

  const handleAIError = useCallback(
    (e: any, context: string = '') => {
      const msg = e.message || e.toString();

      // Missing API key → open settings
      if (msg === 'MISSING_API_KEY') {
        setIsSettingsOpen(true);
        return;
      }

      // Quota / credit exceeded
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
          onConfirm: () => {
            closeModal();
            setIsSettingsOpen(true);
          },
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      // JSON parse error (AI returned bad format)
      if (msg.includes('JSON') || msg.includes('Unexpected token') || msg.includes('parse')) {
        setError(
          language === 'si'
            ? 'AI je vrnil nepravilen format. Poskusite ponovno.'
            : 'AI returned an invalid format. Please try again.'
        );
        return;
      }

      // Network error
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('ERR_')) {
        setError(
          language === 'si'
            ? 'Omrežna napaka. Preverite internetno povezavo in poskusite ponovno.'
            : 'Network error. Check your internet connection and try again.'
        );
        return;
      }

      // Generic fallback — still friendly, with console detail
      console.error(`[AI Error] ${context}:`, e);
      setError(
        language === 'si'
          ? 'Napaka pri generiranju. Preverite konzolo (F12) za podrobnosti.'
          : 'Generation error. Check console (F12) for details.'
      );
    },
    [language, setIsSettingsOpen, setModalConfig, closeModal]
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
            const risksContent = await generateSectionContent(
              'risks',
              newData,
              language,
              mode
            );
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
    [
      projectData,
      language,
      t,
      closeModal,
      setProjectData,
      setHasUnsavedTranslationChanges,
      handleAIError,
    ]
  );

  // ─── Handle generate (with content check + modal) ─────────────

  const handleGenerateSection = useCallback(
    (sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      if (checkSectionHasContent(sectionKey)) {
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
      } else {
        executeGeneration(sectionKey, 'regenerate');
      }
    },
    [
      ensureApiKey,
      checkSectionHasContent,
      executeGeneration,
      setModalConfig,
      closeModal,
      setIsSettingsOpen,
      t,
    ]
  );

  // ─── Composite generation (outputs + outcomes + impacts + KERs) ─

  const handleGenerateCompositeSection = useCallback(
    (_sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const sections = ['outputs', 'outcomes', 'impacts', 'kers'];
      const hasContentInSections = sections.some((s) => checkSectionHasContent(s));

      const runComposite = async (mode: string) => {
        closeModal();
        setIsLoading(true);
        setError(null);

        try {
          for (const s of sections) {
            setIsLoading(`${t.generating} ${s}...`);
            const generatedData = await generateSectionContent(
              s,
              projectData,
              language,
              mode
            );
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

      if (hasContentInSections) {
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
    [
      ensureApiKey,
      checkSectionHasContent,
      projectData,
      language,
      t,
      closeModal,
      setProjectData,
      setHasUnsavedTranslationChanges,
      setIsSettingsOpen,
      setModalConfig,
      handleAIError,
    ]
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
        setSummaryText(
          language === 'si'
            ? 'Nezadostna sredstva AI. Dopolnite kredit ali zamenjajte model v Nastavitvah.'
            : 'Insufficient AI credits. Top up credits or switch model in Settings.'
        );
      } else {
        setSummaryText(
          language === 'si'
            ? 'Napaka pri generiranju povzetka. Poskusite ponovno.'
            : 'Error generating summary. Please try again.'
        );
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
      downloadBlob(
        blob,
        `Summary - ${projectData.projectIdea?.projectTitle || 'Project'}.docx`
      );
    } catch (e: any) {
      console.error(e);
      alert(
        language === 'si'
          ? 'Napaka pri generiranju DOCX datoteke.'
          : 'Failed to generate DOCX file.'
      );
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
