// hooks/useTranslation.ts
// ═══════════════════════════════════════════════════════════════
// Language switching and smart diff-based translation.
// Errors are handled gracefully with user-friendly messages.
// ═══════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { storageService } from '../services/storageService.ts';
import { smartTranslateProject } from '../services/translationDiffService.ts';
import { createEmptyProjectData, detectProjectLanguage } from '../utils.ts';
import { TEXT } from '../locales.ts';

interface UseTranslationProps {
  language: 'en' | 'si';
  setLanguage: (lang: 'en' | 'si') => void;
  projectData: any;
  setProjectData: (data: any) => void;
  projectVersions: { en: any; si: any };
  setProjectVersions: (fn: (prev: { en: any; si: any }) => { en: any; si: any }) => void;
  currentProjectId: string | null;
  currentUser: string | null;
  hasUnsavedTranslationChanges: boolean;
  setHasUnsavedTranslationChanges: (val: boolean) => void;
  hasContent: (data: any) => boolean;
  ensureApiKey: () => boolean;
  setIsLoading: (val: boolean | string) => void;
  setError: (msg: string | null) => void;
  setIsSettingsOpen: (val: boolean) => void;
  setModalConfig: (config: any) => void;
  closeModal: () => void;
}

export const useTranslation = ({
  language,
  setLanguage,
  projectData,
  setProjectData,
  projectVersions,
  setProjectVersions,
  currentProjectId,
  currentUser,
  hasUnsavedTranslationChanges,
  setHasUnsavedTranslationChanges,
  hasContent,
  ensureApiKey,
  setIsLoading,
  setError,
  setIsSettingsOpen,
  setModalConfig,
  closeModal,
}: UseTranslationProps) => {

  // ─── Check if data is actually in the expected language ────────

  const isDataInCorrectLanguage = useCallback(
    (data: any, expectedLang: 'en' | 'si'): boolean => {
      if (!data || !hasContent(data)) return false;
      const detectedLang = detectProjectLanguage(data);
      return detectedLang === expectedLang;
    },
    [hasContent]
  );

  // ─── Friendly translation error handler ────────────────────────

  const handleTranslationError = useCallback(
    (e: any, targetLang: 'en' | 'si') => {
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
          title: targetLang === 'si' ? 'Nezadostna sredstva AI' : 'Insufficient AI Credits',
          message: targetLang === 'si'
            ? 'Za prevod ni dovolj sredstev pri AI ponudniku. Možne rešitve:\n\n• Dopolnite kredit pri vašem AI ponudniku\n• V Nastavitvah zamenjajte na cenejši model\n• V Nastavitvah preklopite na drugega AI ponudnika'
            : 'Not enough AI credits for translation. Possible solutions:\n\n• Top up credits with your AI provider\n• Switch to a cheaper model in Settings\n• Switch to a different AI provider in Settings',
          confirmText: targetLang === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          secondaryText: '',
          cancelText: targetLang === 'si' ? 'Zapri' : 'Close',
          onConfirm: () => {
            closeModal();
            setIsSettingsOpen(true);
          },
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      // Generic — friendly message, details in console
      console.error('[Translation Error]:', e);
      setError(
        targetLang === 'si'
          ? 'Napaka pri prevajanju. Preverite konzolo (F12) za podrobnosti.'
          : 'Translation failed. Check console (F12) for details.'
      );
    },
    [setIsSettingsOpen, setModalConfig, closeModal, setError]
  );

  // ─── Perform AI translation ────────────────────────────────────

  const performTranslation = useCallback(
    async (targetLang: 'en' | 'si', sourceData: any) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const tTarget = TEXT[targetLang] || TEXT['en'];
      setIsLoading(`${tTarget.generating} (Smart Translation)...`);
      setError(null);

      try {
        const existingTargetData = await storageService.loadProject(
          targetLang,
          currentProjectId
        );

        const { translatedData, stats } = await smartTranslateProject(
          sourceData,
          targetLang,
          existingTargetData,
          currentProjectId!
        );

        // Check if translation actually succeeded
        if (stats.failed > 0 && stats.translated === 0) {
          // ALL failed — don't switch, show friendly error
          throw new Error(
            stats.failed > 50
              ? 'credits'  // Likely a quota issue if all batches failed
              : 'Translation failed for all fields'
          );
        }

        setProjectData(translatedData);
        setLanguage(targetLang);
        setHasUnsavedTranslationChanges(false);
        await storageService.saveProject(translatedData, targetLang, currentProjectId);

        setProjectVersions((prev) => ({
          ...prev,
          [targetLang]: translatedData,
        }));

        if (stats.failed > 0) {
          // Partial success — switch but warn
          setError(
            targetLang === 'si'
              ? `Prevod delno uspel: ${stats.translated}/${stats.changed} polj prevedenih. Nekatera polja poskusite ponovno.`
              : `Translation partially done: ${stats.translated}/${stats.changed} fields translated. Try again for remaining fields.`
          );
        } else if (stats.changed === 0) {
          console.log('[Translation] No changes detected – all fields up to date.');
        }
      } catch (e: any) {
        handleTranslationError(e, targetLang);
      } finally {
        setIsLoading(false);
      }
    },
    [
      ensureApiKey,
      currentProjectId,
      setProjectData,
      setLanguage,
      setHasUnsavedTranslationChanges,
      setProjectVersions,
      setIsLoading,
      setError,
      setIsSettingsOpen,
      handleTranslationError,
    ]
  );

  // ─── Copy source to target (no translation) ───────────────────

  const performCopy = useCallback(
    (targetLang: 'en' | 'si', sourceData: any) => {
      setProjectData(sourceData);
      setLanguage(targetLang);
      setHasUnsavedTranslationChanges(true);
    },
    [setProjectData, setLanguage, setHasUnsavedTranslationChanges]
  );

  // ─── Switch to cached version ──────────────────────────────────

  const performSwitchOnly = useCallback(
    (targetLang: 'en' | 'si', cachedData: any) => {
      setProjectData(cachedData);
      setLanguage(targetLang);
      setHasUnsavedTranslationChanges(false);
    },
    [setProjectData, setLanguage, setHasUnsavedTranslationChanges]
  );

  // ─── Main language switch handler ──────────────────────────────

  const handleLanguageSwitchRequest = useCallback(
    async (newLang: 'en' | 'si') => {
      if (newLang === language) return;

      // Save current data before switching (only if logged in)
      if (currentUser) {
        await storageService.saveProject(projectData, language, currentProjectId);
      }

      // If no content in current project, just switch
      if (!hasContent(projectData)) {
        setLanguage(newLang);
        const loaded = await storageService.loadProject(newLang, currentProjectId);
        setProjectData(loaded || createEmptyProjectData());
        setHasUnsavedTranslationChanges(false);
        return;
      }

      // Check cached version
      let cachedVersion = projectVersions[newLang];
      if (!cachedVersion) {
        cachedVersion = await storageService.loadProject(newLang, currentProjectId);
      }

      const tCurrent = TEXT[language] || TEXT['en'];

      // KEY FIX: Check if cached version is ACTUALLY in the target language
      const cachedHasContent = hasContent(cachedVersion);
      const cachedIsCorrectLanguage = cachedHasContent && isDataInCorrectLanguage(cachedVersion, newLang);

      // No valid target version → ask to translate or copy
      if (!cachedHasContent || !cachedIsCorrectLanguage) {
        setModalConfig({
          isOpen: true,
          title: tCurrent.modals.missingTranslationTitle,
          message: tCurrent.modals.missingTranslationMsg,
          confirmText: tCurrent.modals.translateBtn,
          secondaryText: tCurrent.modals.copyBtn,
          cancelText: tCurrent.modals.cancel,
          onConfirm: () => {
            closeModal();
            performTranslation(newLang, projectData);
          },
          onSecondary: () => {
            closeModal();
            performCopy(newLang, projectData);
          },
          onCancel: closeModal,
        });
        return;
      }

      // Unsaved changes → ask to update translation or just switch
      if (hasUnsavedTranslationChanges) {
        setModalConfig({
          isOpen: true,
          title: tCurrent.modals.updateTranslationTitle,
          message: tCurrent.modals.updateTranslationMsg,
          confirmText: tCurrent.modals.updateBtn,
          secondaryText: tCurrent.modals.switchBtn,
          cancelText: tCurrent.modals.cancel,
          onConfirm: () => {
            closeModal();
            performTranslation(newLang, projectData);
          },
          onSecondary: () => {
            closeModal();
            performSwitchOnly(newLang, cachedVersion);
          },
          onCancel: closeModal,
        });
        return;
      }

      // Cached version exists, is in correct language, no changes → just switch
      performSwitchOnly(newLang, cachedVersion);
    },
    [
      language,
      projectData,
      projectVersions,
      currentProjectId,
      currentUser,
      hasContent,
      hasUnsavedTranslationChanges,
      isDataInCorrectLanguage,
      performTranslation,
      performCopy,
      performSwitchOnly,
      setModalConfig,
      closeModal,
      setLanguage,
      setProjectData,
      setHasUnsavedTranslationChanges,
    ]
  );

  return {
    handleLanguageSwitchRequest,
    performTranslation,
  };
};
