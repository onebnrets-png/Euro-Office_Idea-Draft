// hooks/useGeneration.ts
// ═══════════════════════════════════════════════════════════════
// AI content generation — sections, fields, summaries.
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

          // Auto-generate risks after activities (matching original exactly)
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
        if (e.message === 'MISSING_API_KEY') {
          setIsSettingsOpen(true);
        } else {
          setError(`${t.error}: ${e.message}`);
        }
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
      setIsSettingsOpen,
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
        } catch (e: any) {
          setError(e.message);
        } finally {
          setIsLoading(false);
          setHasUnsavedTranslationChanges(true);
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

      try {
        const content = await generateFieldContent(path, projectData, language);
        handleUpdateData(path, content);
      } catch (e: any) {
        if (e.message === 'MISSING_API_KEY') {
          setIsSettingsOpen(true);
        } else {
          console.error(e);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [ensureApiKey, projectData, language, t, handleUpdateData, setIsSettingsOpen]
  );

  // ─── Summary generation ────────────────────────────────────────

  const runSummaryGeneration = useCallback(async () => {
    setIsGeneratingSummary(true);
    setSummaryText('');
    try {
      const text = await generateProjectSummary(projectData, language);
      setSummaryText(text);
    } catch (e: any) {
      setSummaryText('Error generating summary: ' + e.message);
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
      alert('Failed to generate DOCX');
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
