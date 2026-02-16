// hooks/useGeneration.ts
// ═══════════════════════════════════════════════════════════════
// AI content generation — sections, fields, summaries.
// v4.2 — 2026-02-16 — SUB-SECTION GENERATION
//   - NEW: SUB_SECTION_MAP for mapping sub-section keys to parent/path.
//   - NEW: executeGeneration handles sub-section keys — generates only
//     the specific sub-part and inserts at correct path in ProjectData.
//   - NEW: handleGenerateSection checks sub-section content specifically
//     while using parent key for cross-language content lookup.
//   - Supports: coreProblem, causes, consequences, projectTitleAcronym,
//     mainAim, stateOfTheArt, proposedSolution, readinessLevels, policies.
//   - All previous v3.9 changes preserved.
//
// v3.9 — 2026-02-16 — PER-WP GENERATION COMPLETE
//   - FIX: Fill mode for incomplete WPs now uses generateActivitiesPerWP()
//     with existingScaffold + onlyIndices instead of broken generateSectionContent()
//     with unsupported _generateOnlyWP properties.
//   - FIX: Mandatory WP detection (PM/Dissemination) no longer destroys
//     existing WPs — now generates ONLY missing mandatory WPs and adds them
//     at the correct positions (PM=WP1, Dissemination=second-to-last).
//   - All previous v3.8 changes preserved.
//
// v3.8 — 2026-02-16 — PER-WP GENERATION
// v3.7 — 2026-02-15 — SMART FILL COMPOSITE
// v3.6 — 2026-02-15 — RETRY + BACKOFF + FRIENDLY MODALS
// v3.5.2 — 2026-02-14 — AUTO PM + ROBUST CHECKS + 3-OPTION MODAL
//
// SMART 4-LEVEL LOGIC for "Generate with AI" button:
//   1. OTHER language has content for THIS SECTION, CURRENT is empty
//      → "Translate from SI/EN" (primary) or "Generate new" (secondary)
//   2. BOTH languages have content for THIS SECTION
//      → "Generate/Enhance current" (primary) or "Translate from XX" (secondary)
//   3. CURRENT language has content, OTHER does not
//      → 3-option modal: Enhance / Fill / Regenerate
//   4. Nothing exists → generate without asking
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import {
  generateSectionContent,
  generateFieldContent,
  generateProjectSummary,
  generateTargetedFill,
  generateActivitiesPerWP,
  generateObjectFill,
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

  // ─── DEEP CONTENT CHECKER (shared utility) ─────────────────────

  const hasDeepContent = useCallback((data: any): boolean => {
    if (!data) return false;
    if (typeof data === 'string') return data.trim().length > 0;
    if (Array.isArray(data)) {
      return data.length > 0 && data.some((item: any) => hasDeepContent(item));
    }
    if (typeof data === 'object') {
      return Object.values(data).some((v: any) => hasDeepContent(v));
    }
    return false;
  }, []);

  // ─── ROBUST content checker (v3.4 FIX) ─────────────────────────

  const robustCheckSectionHasContent = useCallback(
    (sectionKey: string): boolean => {
      const section = projectData[sectionKey];
      if (!section) return false;
      return hasDeepContent(section);
    },
    [projectData, hasDeepContent]
  );

  // ─── v3.7: Check if a section needs generation (has empty items) ──

  const sectionNeedsGeneration = useCallback(
    (sectionKey: string): { needsFill: boolean; needsFullGeneration: boolean; emptyIndices: number[] } => {
      const section = projectData[sectionKey];

      if (!section) {
        return { needsFill: false, needsFullGeneration: true, emptyIndices: [] };
      }

      if (Array.isArray(section)) {
        if (section.length === 0) {
          return { needsFill: false, needsFullGeneration: true, emptyIndices: [] };
        }

        const emptyIndices: number[] = [];
        let hasAnyContent = false;

        section.forEach((item: any, index: number) => {
          if (!item || !hasDeepContent(item)) {
            emptyIndices.push(index);
          } else {
            const hasEmptyFields = Object.entries(item).some(([key, val]) => {
              if (key === 'id') return false;
              return typeof val === 'string' && val.trim().length === 0;
            });
            if (hasEmptyFields) {
              emptyIndices.push(index);
            }
            hasAnyContent = true;
          }
        });

        if (!hasAnyContent) {
          return { needsFill: false, needsFullGeneration: true, emptyIndices: [] };
        }

        if (emptyIndices.length > 0) {
          return { needsFill: true, needsFullGeneration: false, emptyIndices };
        }

        return { needsFill: false, needsFullGeneration: false, emptyIndices: [] };
      }

      if (typeof section === 'object') {
        const hasContent = hasDeepContent(section);
        if (!hasContent) {
          return { needsFill: false, needsFullGeneration: true, emptyIndices: [] };
        }
        const hasEmptyFields = Object.entries(section).some(([_key, val]) => {
          return typeof val === 'string' && val.trim().length === 0;
        });
        if (hasEmptyFields) {
          return { needsFill: true, needsFullGeneration: false, emptyIndices: [] };
        }
        return { needsFill: false, needsFullGeneration: false, emptyIndices: [] };
      }

      return { needsFill: false, needsFullGeneration: false, emptyIndices: [] };
    },
    [projectData, hasDeepContent]
  );

  // ─── ★ v4.2: Sub-section mapping — maps sub-section keys to their parent and data path ──

  const SUB_SECTION_MAP: Record<string, { parent: string; path: string[]; isString?: boolean }> = {
    coreProblem:        { parent: 'problemAnalysis', path: ['problemAnalysis', 'coreProblem'] },
    causes:             { parent: 'problemAnalysis', path: ['problemAnalysis', 'causes'] },
    consequences:       { parent: 'problemAnalysis', path: ['problemAnalysis', 'consequences'] },
    projectTitleAcronym:{ parent: 'projectIdea',     path: ['projectIdea'] }, // merges projectTitle + projectAcronym
    mainAim:            { parent: 'projectIdea',     path: ['projectIdea', 'mainAim'], isString: true },
    stateOfTheArt:      { parent: 'projectIdea',     path: ['projectIdea', 'stateOfTheArt'], isString: true },
    proposedSolution:   { parent: 'projectIdea',     path: ['projectIdea', 'proposedSolution'], isString: true },
    readinessLevels:    { parent: 'projectIdea',     path: ['projectIdea', 'readinessLevels'] },
    policies:           { parent: 'projectIdea',     path: ['projectIdea', 'policies'] },
  };

  // ─── ★ v4.0: Comprehensive error handler with specific modals ──

  const handleAIError = useCallback(
    (e: any, context: string = '') => {
      const msg = e.message || e.toString();
      const parts = msg.split('|');
      const errorCode = parts[0] || '';
      const provider = parts[1] || '';
      const providerLabel = provider === 'gemini' ? 'Google Gemini' : provider === 'openrouter' ? 'OpenRouter' : 'AI';

      console.warn(`[AI Error] ${context}: ${errorCode} (${provider})`, e);

      if (msg === 'MISSING_API_KEY' || errorCode === 'MISSING_API_KEY') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Manjkajoč API ključ' : 'Missing API Key',
          message: language === 'si'
            ? 'API ključ za AI ponudnika ni nastavljen ali ni veljaven.\n\nOdprite Nastavitve in vnesite veljaven API ključ.'
            : 'The AI provider API key is not set or is invalid.\n\nOpen Settings and enter a valid API key.',
          confirmText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          secondaryText: '',
          cancelText: language === 'si' ? 'Zapri' : 'Close',
          onConfirm: () => { closeModal(); setIsSettingsOpen(true); },
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'RATE_LIMIT') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Omejitev hitrosti dosežena' : 'Rate Limit Reached',
          message: language === 'si'
            ? `${providerLabel} je začasno omejil število zahtevkov.\n\nTo se zgodi pri brezplačnih načrtih (npr. 15 zahtevkov/minuto pri Gemini).\n\nMožne rešitve:\n• Počakajte 1–2 minuti in poskusite ponovno\n• V Nastavitvah zamenjajte na drug model\n• Nadgradite na plačljiv načrt pri ${providerLabel}`
            : `${providerLabel} has temporarily limited the number of requests.\n\nThis happens on free plans (e.g., 15 requests/minute on Gemini).\n\nPossible solutions:\n• Wait 1–2 minutes and try again\n• Switch to a different model in Settings\n• Upgrade to a paid plan with ${providerLabel}`,
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'INSUFFICIENT_CREDITS') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Nezadostna sredstva' : 'Insufficient Credits',
          message: language === 'si'
            ? `${providerLabel} nima dovolj sredstev za to zahtevo.\n\nMožne rešitve:\n• Dopolnite kredit pri ${providerLabel}\n• V Nastavitvah izberite cenejši ali brezplačen model\n• Preklopite na drugega AI ponudnika (npr. Gemini ima brezplačen načrt)`
            : `${providerLabel} does not have enough credits for this request.\n\nPossible solutions:\n• Top up credits with ${providerLabel}\n• Choose a cheaper or free model in Settings\n• Switch to another AI provider (e.g., Gemini has a free plan)`,
          confirmText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          secondaryText: '',
          cancelText: language === 'si' ? 'Zapri' : 'Close',
          onConfirm: () => { closeModal(); setIsSettingsOpen(true); },
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'MODEL_OVERLOADED') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Model začasno nedosegljiv' : 'Model Temporarily Unavailable',
          message: language === 'si'
            ? `Model pri ${providerLabel} je trenutno preobremenjen z visoko obremenitvijo.\n\nTo je začasna težava — model bo kmalu spet dosegljiv.\n\nMožne rešitve:\n• Počakajte 2–5 minut in poskusite ponovno\n• V Nastavitvah zamenjajte na drug model (npr. Gemini 2.5 Flash)`
            : `The model at ${providerLabel} is currently experiencing high demand.\n\nThis is a temporary issue — the model will be available again shortly.\n\nPossible solutions:\n• Wait 2–5 minutes and try again\n• Switch to a different model in Settings (e.g., Gemini 2.5 Flash)`,
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'SERVER_ERROR') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Napaka strežnika' : 'Server Error',
          message: language === 'si'
            ? `Strežnik ${providerLabel} je vrnil napako.\n\nTo je običajno začasna težava na strani ponudnika.\n\nMožne rešitve:\n• Poskusite ponovno čez 1–2 minuti\n• Če se napaka ponavlja, zamenjajte model v Nastavitvah`
            : `The ${providerLabel} server returned an error.\n\nThis is usually a temporary issue on the provider's side.\n\nPossible solutions:\n• Try again in 1–2 minutes\n• If the error persists, switch models in Settings`,
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'TIMEOUT') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Zahteva je potekla' : 'Request Timed Out',
          message: language === 'si'
            ? `Zahteva do ${providerLabel} je trajala predolgo in je potekla.\n\nTo se lahko zgodi pri velikih sekcijah (npr. aktivnosti z 8+ delovnimi sklopi).\n\nMožne rešitve:\n• Poskusite ponovno — včasih je strežnik le začasno počasen\n• V Nastavitvah izberite hitrejši model (npr. Gemini Flash)`
            : `The request to ${providerLabel} took too long and timed out.\n\nThis can happen with large sections (e.g., activities with 8+ work packages).\n\nPossible solutions:\n• Try again — sometimes the server is just temporarily slow\n• Choose a faster model in Settings (e.g., Gemini Flash)`,
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: '',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'NETWORK_ERROR' ||
          msg.includes('fetch') || msg.includes('network') ||
          msg.includes('Failed to fetch') || msg.includes('ERR_')) {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Omrežna napaka' : 'Network Error',
          message: language === 'si'
            ? 'Ni bilo mogoče vzpostaviti povezave z AI strežnikom.\n\nMožni vzroki:\n• Internetna povezava je prekinjena\n• Požarni zid ali VPN blokira dostop\n• AI strežnik je začasno nedosegljiv\n\nPreverite internetno povezavo in poskusite ponovno.'
            : 'Could not connect to the AI server.\n\nPossible causes:\n• Internet connection is down\n• Firewall or VPN is blocking access\n• AI server is temporarily unreachable\n\nCheck your internet connection and try again.',
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: '',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'CONTENT_BLOCKED') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Vsebina blokirana' : 'Content Blocked',
          message: language === 'si'
            ? 'AI varnostni filter je blokiral generiranje vsebine.\n\nTo se lahko zgodi, če projektna tema vsebuje občutljive izraze.\n\nMožne rešitve:\n• Preoblikujte opis projekta z manj občutljivimi izrazi\n• Poskusite z drugim AI modelom v Nastavitvah'
            : 'The AI safety filter blocked the content generation.\n\nThis can happen if the project topic contains sensitive terms.\n\nPossible solutions:\n• Rephrase the project description with less sensitive terms\n• Try a different AI model in Settings',
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: '',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'CONTEXT_TOO_LONG') {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Projekt prevelik za model' : 'Project Too Large for Model',
          message: language === 'si'
            ? 'Projektni podatki presegajo kontekstno okno izbranega AI modela.\n\nTo se zgodi pri zelo obsežnih projektih z veliko delovnimi sklopi.\n\nMožne rešitve:\n• V Nastavitvah izberite model z večjim kontekstom (npr. Gemini 2.5 Pro — 1M tokenov)\n• Generirajte posamezne razdelke namesto celotnega projekta'
            : 'The project data exceeds the context window of the selected AI model.\n\nThis happens with very large projects with many work packages.\n\nPossible solutions:\n• Choose a model with a larger context in Settings (e.g., Gemini 2.5 Pro — 1M tokens)\n• Generate individual sections instead of the entire project',
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
          onCancel: closeModal,
        });
        return;
      }

      if (errorCode === 'INVALID_JSON' ||
          msg.includes('JSON') || msg.includes('Unexpected token') || msg.includes('parse')) {
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Napaka formata odgovora' : 'Response Format Error',
          message: language === 'si'
            ? 'AI je vrnil nepravilen format odgovora (neveljaven JSON).\n\nTo se občasno zgodi — AI modeli niso vedno 100% zanesljivi pri strukturiranih odgovorih.\n\nPoskusite ponovno — naslednji poskus bo verjetno uspešen.'
            : 'The AI returned an invalid response format (invalid JSON).\n\nThis happens occasionally — AI models are not always 100% reliable with structured responses.\n\nPlease try again — the next attempt will likely succeed.',
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: '',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: null,
          onCancel: closeModal,
        });
        return;
      }

      console.error(`[AI Error] Unclassified: ${context}:`, e);
      setModalConfig({
        isOpen: true,
        title: language === 'si' ? 'Nepričakovana napaka' : 'Unexpected Error',
        message: language === 'si'
          ? `Pri komunikaciji z AI ponudnikom (${providerLabel}) je prišlo do nepričakovane napake.\n\nPodrobnosti: ${msg.substring(0, 200)}\n\nMožne rešitve:\n• Poskusite ponovno čez nekaj sekund\n• Če se napaka ponavlja, zamenjajte model ali ponudnika v Nastavitvah\n• Preverite konzolo brskalnika (F12) za več podrobnosti`
          : `An unexpected error occurred while communicating with the AI provider (${providerLabel}).\n\nDetails: ${msg.substring(0, 200)}\n\nPossible solutions:\n• Try again in a few seconds\n• If the error persists, switch models or providers in Settings\n• Check the browser console (F12) for more details`,
        confirmText: language === 'si' ? 'V redu' : 'OK',
        secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
        cancelText: '',
        onConfirm: closeModal,
        onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
        onCancel: closeModal,
      });
    },
    [language, setIsSettingsOpen, setModalConfig, closeModal]
  );
  // ─── Check if other language has content FOR THIS SECTION (v3.5) ──

  const checkOtherLanguageHasContent = useCallback(
    async (sectionKey: string): Promise<any | null> => {
      const otherLang = language === 'en' ? 'si' : 'en';

      const checkVersion = (projectVersion: any): any | null => {
        if (!projectVersion) return null;
        const sectionData = projectVersion[sectionKey];
        if (!sectionData) return null;
        if (hasDeepContent(sectionData)) {
          return projectVersion;
        }
        return null;
      };

      const cachedResult = checkVersion(projectVersions[otherLang]);
      if (cachedResult) return cachedResult;

      try {
        const loaded = await storageService.loadProject(otherLang, currentProjectId);
        const loadedResult = checkVersion(loaded);
        if (loadedResult) return loadedResult;
      } catch (e) {
        console.warn('[useGeneration] Could not load other language version:', e);
      }

      return null;
    },
    [language, projectVersions, currentProjectId, hasDeepContent]
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
          projectData,
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
          setError(
            language === 'si'
              ? `Prevod delno uspel: ${stats.translated}/${stats.changed} polj prevedenih.`
              : `Translation partially done: ${stats.translated}/${stats.changed} fields translated.`
          );
        }
      } catch (e: any) {
        handleAIError(e, 'translateFromOtherLanguage');
      } finally {
        setIsLoading(false);
      }
    },
    [
      language,
      projectData,
      currentProjectId,
      closeModal,
      setProjectData,
      setHasUnsavedTranslationChanges,
      setProjectVersions,
      handleAIError,
    ]
  );

  // ─── Execute section generation ────────────────────────────────
  // ★ v4.2: Added sub-section support via SUB_SECTION_MAP
  // v3.9 FIX: Fill mode now uses generateActivitiesPerWP() with
  // existingScaffold + onlyIndices. Mandatory WP detection adds
  // only missing WPs instead of destroying existing ones.

  const executeGeneration = useCallback(
    async (sectionKey: string, mode: string = 'regenerate') => {
      closeModal();
      setIsLoading(`${t.generating} ${sectionKey}...`);
      setError(null);

      try {
        let generatedData;

        // ★ v4.2: Check if this is a sub-section key
        const subMapping = SUB_SECTION_MAP[sectionKey];

        // ★ v4.2: Sub-section generation — generate ONLY a specific sub-part
        if (subMapping) {
          generatedData = await generateSectionContent(
            sectionKey,
            projectData,
            language,
            mode
          );

        // ★ v3.8/v3.9: Smart per-WP generation for activities
        } else if (sectionKey === 'activities') {
          const existingWPs = projectData.activities || [];
          const emptyWPIndices: number[] = [];

          // ────────────────────────────────────────────────────────
          // ★ v3.9: Mandatory WP detection — PM and Dissemination
          // ────────────────────────────────────────────────────────
          const hasPMWP = existingWPs.some((wp: any) => {
            const title = (wp.title || '').toLowerCase();
            return title.includes('management') || title.includes('coordination')
              || title.includes('upravljanje') || title.includes('koordinacija');
          });
          const hasDissWP = existingWPs.some((wp: any) => {
            const title = (wp.title || '').toLowerCase();
            return title.includes('dissemination') || title.includes('communication')
              || title.includes('diseminacija') || title.includes('komunikacija');
          });

          const missingPM = !hasPMWP && existingWPs.length > 0;
          const missingDiss = !hasDissWP && existingWPs.length > 0;
          const hasMissingMandatory = missingPM || missingDiss;

          // Detect which WPs are empty or missing content
          existingWPs.forEach((wp: any, idx: number) => {
            const hasTasks = wp.tasks && Array.isArray(wp.tasks) && wp.tasks.length > 0
              && wp.tasks.some((t: any) => t.title && t.title.trim().length > 0);
            const hasMilestones = wp.milestones && Array.isArray(wp.milestones) && wp.milestones.length > 0;
            const hasDeliverables = wp.deliverables && wp.deliverables.length > 0
              && wp.deliverables.some((d: any) => d.title && d.title.trim().length > 0);
            if (!hasTasks || !hasMilestones || !hasDeliverables) {
              emptyWPIndices.push(idx);
            }
          });

          if (mode === 'regenerate' || existingWPs.length === 0) {
            generatedData = await generateActivitiesPerWP(
              projectData,
              language,
              mode,
              (wpIndex, wpTotal, wpTitle) => {
                if (wpIndex === -1) {
                  setIsLoading(language === 'si' ? 'Generiranje strukture DS...' : 'Generating WP structure...');
                } else {
                  setIsLoading(
                    language === 'si'
                      ? `Generiram DS ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                      : `Generating WP ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                  );
                }
              }
            );

          } else if (hasMissingMandatory && mode !== 'enhance') {
            const durationMonths = projectData.projectIdea?.durationMonths || 24;
            const augmentedWPs = [...existingWPs];
            const mandatoryIndicesToGenerate: number[] = [];

            const missingNames: string[] = [];

            if (missingPM) {
              missingNames.push(language === 'si' ? 'Upravljanje projekta' : 'Project Management');

              const pmPlaceholder = {
                id: `WP${augmentedWPs.length + 1}`,
                title: language === 'si' ? 'Upravljanje in koordinacija projekta' : 'Project Management and Coordination',
                startDate: projectData.projectIdea?.startDate || new Date().toISOString().split('T')[0],
                endDate: '',
                startMonth: 1,
                endMonth: durationMonths,
                tasks: [],
                milestones: [],
                deliverables: [],
                leader: '',
                participants: [],
              };
              augmentedWPs.push(pmPlaceholder);
              mandatoryIndicesToGenerate.push(augmentedWPs.length - 1);
            }

            if (missingDiss) {
              missingNames.push(language === 'si' ? 'Diseminacija' : 'Dissemination');

              const dissInsertIdx = missingPM ? augmentedWPs.length - 1 : augmentedWPs.length;
              const dissPlaceholder = {
                id: '',
                title: language === 'si' ? 'Diseminacija, komunikacija in izkoriščanje rezultatov' : 'Dissemination, Communication and Exploitation of Results',
                startDate: projectData.projectIdea?.startDate || new Date().toISOString().split('T')[0],
                endDate: '',
                startMonth: 1,
                endMonth: durationMonths,
                tasks: [],
                milestones: [],
                deliverables: [],
                leader: '',
                participants: [],
              };

              augmentedWPs.splice(dissInsertIdx, 0, dissPlaceholder);

              if (missingPM) {
                mandatoryIndicesToGenerate[mandatoryIndicesToGenerate.length - 1] = augmentedWPs.length - 1;
              }
              mandatoryIndicesToGenerate.push(dissInsertIdx);
            }

            augmentedWPs.forEach((wp, idx) => {
              wp.id = `WP${idx + 1}`;
            });

            console.warn(`[Activities] Adding missing mandatory WPs: ${missingNames.join(', ')} — generating only indices [${mandatoryIndicesToGenerate.join(', ')}]`);

            const finalIndicesToGenerate: number[] = [];
            augmentedWPs.forEach((wp: any, idx: number) => {
              const hasTasks = wp.tasks && Array.isArray(wp.tasks) && wp.tasks.length > 0
                && wp.tasks.some((t: any) => t.title && t.title.trim().length > 0);
              const hasMilestones = wp.milestones && Array.isArray(wp.milestones) && wp.milestones.length > 0;
              const hasDeliverableContent = wp.deliverables && wp.deliverables.length > 0
                && wp.deliverables.some((d: any) => d.title && d.title.trim().length > 0);
              if (!hasTasks || !hasMilestones || !hasDeliverableContent) {
                finalIndicesToGenerate.push(idx);
              }
            });

            generatedData = await generateActivitiesPerWP(
              { ...projectData, activities: augmentedWPs },
              language,
              'fill',
              (wpIndex, wpTotal, wpTitle) => {
                if (wpIndex === -1) {
                  setIsLoading(
                    language === 'si'
                      ? `Dodajam manjkajoče DS (${missingNames.join(' + ')})...`
                      : `Adding missing WPs (${missingNames.join(' + ')})...`
                  );
                } else {
                  setIsLoading(
                    language === 'si'
                      ? `Generiram DS ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                      : `Generating WP ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                  );
                }
              },
              augmentedWPs,
              finalIndicesToGenerate
            );

          } else if (emptyWPIndices.length > 0) {
            generatedData = await generateActivitiesPerWP(
              projectData,
              language,
              'fill',
              (wpIndex, wpTotal, wpTitle) => {
                if (wpIndex === -1) {
                  setIsLoading(
                    language === 'si'
                      ? `Dopolnjujem ${emptyWPIndices.length} nepopolnih DS...`
                      : `Filling ${emptyWPIndices.length} incomplete WPs...`
                  );
                } else {
                  setIsLoading(
                    language === 'si'
                      ? `Dopolnjujem DS ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                      : `Filling WP ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                  );
                }
              },
              existingWPs,
              emptyWPIndices
            );

          } else if (mode === 'enhance') {
            generatedData = await generateSectionContent(
              sectionKey,
              projectData,
              language,
              mode
            );

          } else {
            generatedData = existingWPs;
          }

                } else if (
          mode === 'fill' &&
          ['projectIdea', 'problemAnalysis', 'projectManagement'].includes(sectionKey) &&
          projectData[sectionKey] &&
          typeof projectData[sectionKey] === 'object' &&
          !Array.isArray(projectData[sectionKey])
        ) {
          const sectionData = projectData[sectionKey];
          const emptyFields: string[] = [];

          for (const [key, val] of Object.entries(sectionData)) {
            if (typeof val === 'string' && val.trim().length === 0) {
              emptyFields.push(key);
            }
          }

          const expectedFields: Record<string, string[]> = {
            projectIdea: ['projectTitle', 'projectAcronym', 'mainAim', 'stateOfTheArt', 'proposedSolution'],
            problemAnalysis: [],
            projectManagement: ['description'],
          };
          const expected = expectedFields[sectionKey] || [];
          for (const field of expected) {
            if (!sectionData[field] || (typeof sectionData[field] === 'string' && sectionData[field].trim().length === 0)) {
              if (!emptyFields.includes(field)) {
                emptyFields.push(field);
              }
            }
          }

          if (sectionKey === 'projectIdea') {
            const rl = sectionData.readinessLevels;
            if (!rl || !rl.TRL || !rl.SRL || !rl.ORL || !rl.LRL) {
              if (!emptyFields.includes('readinessLevels')) {
                emptyFields.push('readinessLevels');
              }
            } else {
              for (const level of ['TRL', 'SRL', 'ORL', 'LRL']) {
                if (rl[level] && typeof rl[level].justification === 'string' && rl[level].justification.trim().length === 0) {
                  if (!emptyFields.includes('readinessLevels')) {
                    emptyFields.push('readinessLevels');
                  }
                  break;
                }
              }
            }

            const policies = sectionData.policies;
            if (!policies || !Array.isArray(policies) || policies.length === 0) {
              if (!emptyFields.includes('policies')) {
                emptyFields.push('policies');
              }
            }
          }

          if (emptyFields.length === 0) {
            setModalConfig({
              isOpen: true,
              title: language === 'si' ? 'Vse je izpolnjeno' : 'Everything is filled',
              message: language === 'si'
                ? 'Vsa polja v tem razdelku so že izpolnjena. Če želite izboljšati vsebino, uporabite možnost "Izboljšaj obstoječe".'
                : 'All fields in this section are already filled. To improve content, use the "Enhance existing" option.',
              confirmText: language === 'si' ? 'V redu' : 'OK',
              secondaryText: '',
              cancelText: '',
              onConfirm: () => closeModal(),
              onSecondary: null,
              onCancel: () => closeModal(),
            });
            generatedData = sectionData;
          } else {
            const fieldNames = emptyFields.join(', ');
            console.log(`[ObjectFill] ${sectionKey}: Empty fields detected: [${fieldNames}]`);
            setIsLoading(
              language === 'si'
                ? `Dopolnjujem ${emptyFields.length} praznih polj: ${fieldNames}...`
                : `Filling ${emptyFields.length} empty fields: ${fieldNames}...`
            );

            generatedData = await generateObjectFill(
              sectionKey,
              projectData,
              language,
              emptyFields
            );
          }

                } else if (mode === 'fill') {
          const sectionData = projectData[sectionKey];

          if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0) || !hasDeepContent(sectionData)) {
            console.log(`[SmartFill] ${sectionKey}: No data → full regeneration`);
            setIsLoading(
              language === 'si'
                ? `Generiram ${sectionKey} (ni obstoječih podatkov)...`
                : `Generating ${sectionKey} (no existing data)...`
            );
            generatedData = await generateSectionContent(
              sectionKey,
              projectData,
              language,
              'regenerate'
            );

          } else if (Array.isArray(sectionData)) {
            const emptyIndices: number[] = [];
            sectionData.forEach((item: any, index: number) => {
              if (!item || !hasDeepContent(item)) {
                emptyIndices.push(index);
              } else {
                const hasEmptyFields = Object.entries(item).some(([key, val]) => {
                  if (key === 'id') return false;
                  return typeof val === 'string' && (val as string).trim().length === 0;
                });
                if (hasEmptyFields) {
                  emptyIndices.push(index);
                }
              }
            });

            if (emptyIndices.length === 0) {
              console.log(`[SmartFill] ${sectionKey}: All ${sectionData.length} items complete → nothing to fill`);
              setModalConfig({
                isOpen: true,
                title: language === 'si' ? 'Vse je izpolnjeno' : 'Everything is filled',
                message: language === 'si'
                  ? `Vsi elementi v razdelku "${sectionKey}" so že izpolnjeni. Za izboljšanje vsebine uporabite "Izboljšaj obstoječe".`
                  : `All items in "${sectionKey}" are already filled. To improve content, use "Enhance existing".`,
                confirmText: language === 'si' ? 'V redu' : 'OK',
                secondaryText: '',
                cancelText: '',
                onConfirm: () => closeModal(),
                onSecondary: null,
                onCancel: () => closeModal(),
              });
              generatedData = sectionData;
            } else {
              console.log(`[SmartFill] ${sectionKey}: ${emptyIndices.length} of ${sectionData.length} items need filling at indices [${emptyIndices.join(', ')}]`);
              setIsLoading(
                language === 'si'
                  ? `Dopolnjujem ${emptyIndices.length} od ${sectionData.length} elementov v ${sectionKey}...`
                  : `Filling ${emptyIndices.length} of ${sectionData.length} items in ${sectionKey}...`
              );
              generatedData = await generateTargetedFill(
                sectionKey,
                projectData,
                language,
                emptyIndices
              );
            }

          } else if (typeof sectionData === 'object') {
            const emptyFields: string[] = [];

            if (sectionKey === 'projectIdea') {
              for (const field of ['projectTitle', 'projectAcronym', 'mainAim', 'stateOfTheArt', 'proposedSolution']) {
                const val = sectionData[field];
                if (!val || (typeof val === 'string' && val.trim().length === 0)) {
                  emptyFields.push(field);
                }
              }
              const rl = sectionData.readinessLevels;
              if (!rl || !rl.TRL || !rl.SRL || !rl.ORL || !rl.LRL) {
                emptyFields.push('readinessLevels');
              } else {
                for (const level of ['TRL', 'SRL', 'ORL', 'LRL']) {
                  if (rl[level] && (!rl[level].justification || rl[level].justification.trim().length === 0)) {
                    if (!emptyFields.includes('readinessLevels')) emptyFields.push('readinessLevels');
                    break;
                  }
                }
              }
              const policies = sectionData.policies;
              if (!policies || !Array.isArray(policies) || policies.length === 0) {
                emptyFields.push('policies');
              } else {
                const hasEmptyPolicy = policies.some((p: any) =>
                  !p.name || p.name.trim().length === 0 || !p.description || p.description.trim().length === 0
                );
                if (hasEmptyPolicy && !emptyFields.includes('policies')) {
                  emptyFields.push('policies');
                }
              }

            } else if (sectionKey === 'problemAnalysis') {
              const cp = sectionData.coreProblem;
              if (!cp || !cp.title || cp.title.trim().length === 0 || !cp.description || cp.description.trim().length === 0) {
                emptyFields.push('coreProblem');
              }
              const causes = sectionData.causes;
              if (!causes || !Array.isArray(causes) || causes.length === 0) {
                emptyFields.push('causes');
              } else {
                const hasEmptyCause = causes.some((c: any) =>
                  !c.title || c.title.trim().length === 0 || !c.description || c.description.trim().length === 0
                );
                if (hasEmptyCause && !emptyFields.includes('causes')) {
                  emptyFields.push('causes');
                }
              }
              const consequences = sectionData.consequences;
              if (!consequences || !Array.isArray(consequences) || consequences.length === 0) {
                emptyFields.push('consequences');
              } else {
                const hasEmptyConseq = consequences.some((c: any) =>
                  !c.title || c.title.trim().length === 0 || !c.description || c.description.trim().length === 0
                );
                if (hasEmptyConseq && !emptyFields.includes('consequences')) {
                  emptyFields.push('consequences');
                }
              }

            } else if (sectionKey === 'projectManagement') {
              if (!sectionData.description || sectionData.description.trim().length === 0) {
                emptyFields.push('description');
              }
              const structure = sectionData.structure;
              if (!structure) {
                emptyFields.push('structure');
              } else {
                for (const field of ['coordinator', 'steeringCommittee', 'advisoryBoard', 'wpLeaders']) {
                  if (!structure[field] || structure[field].trim().length === 0) {
                    if (!emptyFields.includes('structure')) emptyFields.push('structure');
                    break;
                  }
                }
              }

            } else {
              for (const [key, val] of Object.entries(sectionData)) {
                if (typeof val === 'string' && val.trim().length === 0) {
                  emptyFields.push(key);
                }
              }
            }

            if (emptyFields.length === 0) {
              console.log(`[SmartFill] ${sectionKey}: All fields complete → nothing to fill`);
              setModalConfig({
                isOpen: true,
                title: language === 'si' ? 'Vse je izpolnjeno' : 'Everything is filled',
                message: language === 'si'
                  ? `Vsa polja v razdelku "${sectionKey}" so že izpolnjena. Za izboljšanje vsebine uporabite "Izboljšaj obstoječe".`
                  : `All fields in "${sectionKey}" are already filled. To improve content, use "Enhance existing".`,
                confirmText: language === 'si' ? 'V redu' : 'OK',
                secondaryText: '',
                cancelText: '',
                onConfirm: () => closeModal(),
                onSecondary: null,
                onCancel: () => closeModal(),
              });
              generatedData = sectionData;
            } else {
              const fieldNames = emptyFields.join(', ');
              console.log(`[SmartFill] ${sectionKey}: Empty fields detected: [${fieldNames}]`);
              setIsLoading(
                language === 'si'
                  ? `Dopolnjujem ${emptyFields.length} praznih polj (${fieldNames})...`
                  : `Filling ${emptyFields.length} empty fields (${fieldNames})...`
              );
              generatedData = await generateObjectFill(
                sectionKey,
                projectData,
                language,
                emptyFields
              );
            }

          } else {
            generatedData = await generateSectionContent(
              sectionKey,
              projectData,
              language,
              mode
            );
          }

        } else {
          generatedData = await generateSectionContent(
            sectionKey,
            projectData,
            language,
            mode
          );
        }

        // ═══════════════════════════════════════════════════════════
        // ★ v4.2: DATA INSERTION — sub-section aware
        // ═══════════════════════════════════════════════════════════
        let newData = { ...projectData };

        if (subMapping) {
          // ★ v4.2: Sub-section data insertion
          if (sectionKey === 'projectTitleAcronym') {
            // Merge projectTitle + projectAcronym into projectIdea
            newData.projectIdea = {
              ...newData.projectIdea,
              projectTitle: generatedData.projectTitle || newData.projectIdea.projectTitle,
              projectAcronym: generatedData.projectAcronym || newData.projectIdea.projectAcronym,
            };
          } else if (subMapping.isString) {
            // String sub-sections (mainAim, stateOfTheArt, proposedSolution)
            const parentKey = subMapping.path[0];
            const fieldKey = subMapping.path[1];
            newData[parentKey] = {
              ...newData[parentKey],
              [fieldKey]: generatedData,
            };
          } else if (subMapping.path.length === 2) {
            // Object/Array sub-sections (coreProblem, causes, consequences, readinessLevels, policies)
            const parentKey = subMapping.path[0];
            const fieldKey = subMapping.path[1];
            newData[parentKey] = {
              ...newData[parentKey],
              [fieldKey]: generatedData,
            };
          }
        } else if (['problemAnalysis', 'projectIdea'].includes(sectionKey)) {
          newData[sectionKey] = { ...newData[sectionKey], ...generatedData };
        } else if (sectionKey === 'activities') {
          if (Array.isArray(generatedData)) {
            newData[sectionKey] = generatedData;
          } else if (generatedData && Array.isArray(generatedData.activities)) {
            newData[sectionKey] = generatedData.activities;
          } else if (generatedData && typeof generatedData === 'object' && !Array.isArray(generatedData)) {
            newData[sectionKey] = [generatedData];
          } else {
            console.warn('[executeGeneration] activities: unexpected format, keeping original');
          }
        } else if (sectionKey === 'expectedResults') {
          const compositeData = generatedData as any;
          if (compositeData.outputs) newData.outputs = compositeData.outputs;
          if (compositeData.outcomes) newData.outcomes = compositeData.outcomes;
          if (compositeData.impacts) newData.impacts = compositeData.impacts;
        } else {
          newData[sectionKey] = generatedData;
        }

        if (sectionKey === 'activities') {
          const schedResult = recalculateProjectSchedule(newData);
          newData = schedResult.projectData;
          if (schedResult.warnings.length > 0) {
            console.warn('Schedule warnings:', schedResult.warnings);
          }

          await new Promise(r => setTimeout(r, 3000));
          setIsLoading(`${t.generating} ${t.subSteps.implementation}...`);
          try {
            const pmContent = await generateSectionContent(
              'projectManagement',
              newData,
              language,
              mode
            );
            newData.projectManagement = {
              ...newData.projectManagement,
              ...pmContent,
              structure: {
                ...(newData.projectManagement?.structure || {}),
                ...(pmContent?.structure || {}),
              },
            };
          } catch (e: any) {
            console.error('[Auto-gen projectManagement]:', e);
            const emsg = e.message || '';
            const isRateLimit = emsg.includes('429') || emsg.includes('Quota') || emsg.includes('rate limit') || emsg.includes('RESOURCE_EXHAUSTED');
            if (isRateLimit) {
              console.warn('[Auto-gen projectManagement] Rate limit hit — retrying in 20s...');
              setIsLoading(
                language === 'si'
                  ? 'Čakam na API kvoto... 20s → Implementacija'
                  : 'Waiting for API quota... 20s → Implementation'
              );
              await new Promise(r => setTimeout(r, 20000));
              setIsLoading(`${t.generating} ${t.subSteps.implementation}...`);
              try {
                const pmRetry = await generateSectionContent('projectManagement', newData, language, mode);
                newData.projectManagement = {
                  ...newData.projectManagement,
                  ...pmRetry,
                  structure: {
                    ...(newData.projectManagement?.structure || {}),
                    ...(pmRetry?.structure || {}),
                  },
                };
                            } catch (e2) {
                console.error('[Auto-gen projectManagement] Retry also failed:', e2);
                setError(
                  language === 'si'
                    ? 'Implementacija ni bila generirana (omejitev API). Generirajte jo ročno v koraku 5 → Implementacija.'
                    : 'Implementation was not generated (API limit). Generate it manually in Step 5 → Implementation.'
                );
              }
            } else {
              setError(
                language === 'si'
                  ? 'Implementacija ni bila generirana. Generirajte jo ročno v koraku 5 → Implementacija.'
                  : 'Implementation was not generated. Generate it manually in Step 5 → Implementation.'
              );
            }
          }

          await new Promise(r => setTimeout(r, 3000));
          setIsLoading(`${t.generating} ${t.subSteps.riskMitigation}...`);
          try {
            const risksContent = await generateSectionContent(
              'risks',
              newData,
              language,
              mode
            );
            if (Array.isArray(risksContent)) {
              newData.risks = risksContent;
            } else if (risksContent && Array.isArray(risksContent.risks)) {
              newData.risks = risksContent.risks;
            } else {
              console.warn('[executeGeneration] risks: unexpected format, keeping original');
            }
          } catch (e: any) {
            console.error('[Auto-gen risks]:', e);
            const emsg = e.message || '';
            const isRateLimit = emsg.includes('429') || emsg.includes('Quota') || emsg.includes('rate limit') || emsg.includes('RESOURCE_EXHAUSTED');
            if (isRateLimit) {
              console.warn('[Auto-gen risks] Rate limit hit — retrying in 20s...');
              setIsLoading(
                language === 'si'
                  ? 'Čakam na API kvoto... 20s → Obvladovanje tveganj'
                  : 'Waiting for API quota... 20s → Risk Mitigation'
              );
              await new Promise(r => setTimeout(r, 20000));
              setIsLoading(`${t.generating} ${t.subSteps.riskMitigation}...`);
              try {
                const risksRetry = await generateSectionContent('risks', newData, language, mode);
                if (Array.isArray(risksRetry)) {
                  newData.risks = risksRetry;
                } else if (risksRetry && Array.isArray((risksRetry as any).risks)) {
                  newData.risks = (risksRetry as any).risks;
                }
              } catch (e2) {
                console.error('[Auto-gen risks] Retry also failed:', e2);
                setModalConfig({
                  isOpen: true,
                  title: language === 'si' ? 'Tveganja niso bila generirana' : 'Risks Were Not Generated',
                  message: language === 'si'
                    ? 'Avtomatsko generiranje tveganj ni uspelo zaradi omejitve API ponudnika.\n\nTo ni kritična napaka — aktivnosti in implementacija so uspešno generirani.\n\nTveganja lahko generirate ročno:\n• Pojdite na korak 5 → Obvladovanje tveganj\n• Kliknite "Generiraj z UI"'
                    : 'Automatic risk generation failed due to API provider limits.\n\nThis is not a critical error — activities and implementation were generated successfully.\n\nYou can generate risks manually:\n• Go to Step 5 → Risk Mitigation\n• Click "Generate with AI"',
                  confirmText: language === 'si' ? 'V redu' : 'OK',
                  secondaryText: '',
                  cancelText: '',
                  onConfirm: () => closeModal(),
                  onSecondary: null,
                  onCancel: () => closeModal(),
                });
              }
            } else {
              setModalConfig({
                isOpen: true,
                title: language === 'si' ? 'Tveganja niso bila generirana' : 'Risks Were Not Generated',
                message: language === 'si'
                  ? 'Avtomatsko generiranje tveganj ni uspelo.\n\nTo ni kritična napaka — aktivnosti in implementacija so uspešno generirani.\n\nTveganja lahko generirate ročno:\n• Pojdite na korak 5 → Obvladovanje tveganj\n• Kliknite "Generiraj z UI"'
                  : 'Automatic risk generation failed.\n\nThis is not a critical error — activities and implementation were generated successfully.\n\nYou can generate risks manually:\n• Go to Step 5 → Risk Mitigation\n• Click "Generate with AI"',
                confirmText: language === 'si' ? 'V redu' : 'OK',
                secondaryText: '',
                cancelText: '',
                onConfirm: () => closeModal(),
                onSecondary: null,
                onCancel: () => closeModal(),
              });
            }

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
  // ─── 3-option generation modal helper ──────────────────────────

  const show3OptionModal = useCallback(
    (onEnhance: () => void, onFill: () => void, onRegenerate: () => void) => {
      setModalConfig({
        isOpen: true,
        title: t.modals.generationChoiceTitle,
        message: t.modals.generationChoiceMsg,

        confirmText: t.modals.enhanceExistingBtn,
        confirmDesc: t.modals.enhanceExistingDesc,
        onConfirm: onEnhance,

        secondaryText: t.modals.fillMissingBtn,
        secondaryDesc: t.modals.fillMissingDesc,
        onSecondary: onFill,

        tertiaryText: t.modals.regenerateAllBtn,
        tertiaryDesc: t.modals.regenerateAllDesc,
        onTertiary: onRegenerate,

        cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
        onCancel: closeModal,
      });
    },
    [t, language, setModalConfig, closeModal]
  );

  // ─── SMART Handle generate (4-level logic — v3.5.1) ────────────
  // ★ v4.2: Sub-section aware — checks sub-section content specifically

  const handleGenerateSection = useCallback(
    async (sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const otherLang = language === 'en' ? 'SI' : 'EN';

      // ★ v4.2: For sub-sections, check content of the specific sub-part
      // but use parent key for cross-language storage lookup
      const subMapping = SUB_SECTION_MAP[sectionKey];
      const contentCheckKey = subMapping ? subMapping.parent : sectionKey;

      // v3.4/3.5 FIX: Use robust check — for sub-sections, check specific sub-part
      const currentHasContent = subMapping
        ? (() => {
            // Check if THIS specific sub-section has content
            let data: any = projectData;
            for (const key of subMapping.path) {
              data = data?.[key];
            }
            return hasDeepContent(data);
          })()
        : robustCheckSectionHasContent(sectionKey);

      // Check if other language has content — use parent key for storage lookup
      const otherLangData = await checkOtherLanguageHasContent(contentCheckKey);

      if (otherLangData && !currentHasContent) {
        setModalConfig({
          isOpen: true,
          title:
            language === 'si'
              ? `Vsebina obstaja v ${otherLang}`
              : `Content exists in ${otherLang}`,
          message:
            language === 'si'
              ? `To poglavje že ima vsebino v ${otherLang} jeziku. Želite prevesti obstoječo vsebino ali generirati novo?`
              : `This section already has content in ${otherLang}. Would you like to translate existing content or generate new?`,
          confirmText:
            language === 'si'
              ? `Prevedi iz ${otherLang}`
              : `Translate from ${otherLang}`,
          secondaryText: language === 'si' ? 'Generiraj novo' : 'Generate new',
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
          onConfirm: () => performTranslationFromOther(otherLangData),
          onSecondary: () => executeGeneration(sectionKey, 'regenerate'),
          onCancel: closeModal,
        });
        return;
      }

      if (otherLangData && currentHasContent) {
        setModalConfig({
          isOpen: true,
          title:
            language === 'si'
              ? `Vsebina obstaja v obeh jezikih`
              : `Content exists in both languages`,
          message:
            language === 'si'
              ? `To poglavje ima vsebino v slovenščini in angleščini. Kaj želite storiti?`
              : `This section has content in both SI and EN. What would you like to do?`,
          confirmText:
            language === 'si'
              ? 'Generiraj / izboljšaj trenutno'
              : 'Generate / enhance current',
          secondaryText:
            language === 'si'
              ? `Prevedi iz ${otherLang}`
              : `Translate from ${otherLang}`,
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
          onConfirm: () => {
            closeModal();
            setTimeout(() => {
              show3OptionModal(
                () => executeGeneration(sectionKey, 'enhance'),
                () => executeGeneration(sectionKey, 'fill'),
                () => executeGeneration(sectionKey, 'regenerate')
              );
            }, 100);
          },
          onSecondary: () => performTranslationFromOther(otherLangData),
          onCancel: closeModal,
        });
        return;
      }

      if (currentHasContent) {
        show3OptionModal(
          () => executeGeneration(sectionKey, 'enhance'),
          () => executeGeneration(sectionKey, 'fill'),
          () => executeGeneration(sectionKey, 'regenerate')
        );
        return;
      }

      executeGeneration(sectionKey, 'regenerate');
    },
    [
      ensureApiKey,
      language,
      projectData,
      hasDeepContent,
      robustCheckSectionHasContent,
      checkOtherLanguageHasContent,
      executeGeneration,
      performTranslationFromOther,
      show3OptionModal,
      setModalConfig,
      closeModal,
      setIsSettingsOpen,
    ]
  );

  // ─── Composite generation (outputs + outcomes + impacts + KERs) ─

  const handleGenerateCompositeSection = useCallback(
    async (_sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const allSections = ['outputs', 'outcomes', 'impacts', 'kers'];

      const hasContentInSections = allSections.some((s) =>
        robustCheckSectionHasContent(s)
      );

      const otherLang = language === 'en' ? 'SI' : 'EN';

      let otherLangData: any = null;
      for (const s of allSections) {
        otherLangData = await checkOtherLanguageHasContent(s);
        if (otherLangData) break;
      }

      const runComposite = async (mode: string) => {
        closeModal();
        setIsLoading(true);
        setError(null);

        let successCount = 0;
        let skippedCount = 0;
        let lastError: any = null;

        let sectionsToProcess: { key: string; action: 'fill' | 'generate' | 'enhance' | 'regenerate'; emptyIndices: number[] }[] = [];

        if (mode === 'fill') {
          for (const s of allSections) {
            const status = sectionNeedsGeneration(s);
            if (status.needsFullGeneration) {
              sectionsToProcess.push({ key: s, action: 'generate', emptyIndices: [] });
            } else if (status.needsFill) {
              sectionsToProcess.push({ key: s, action: 'fill', emptyIndices: status.emptyIndices });
            }
          }

          if (sectionsToProcess.length === 0) {
            setModalConfig({
              isOpen: true,
              title: language === 'si' ? 'Vse je izpolnjeno' : 'Everything is filled',
              message: language === 'si'
                ? 'Vsi razdelki pričakovanih rezultatov so že izpolnjeni. Če želite izboljšati vsebino, uporabite možnost "Izboljšaj obstoječe".'
                : 'All expected results sections are already filled. To improve content, use the "Enhance existing" option.',
              confirmText: language === 'si' ? 'V redu' : 'OK',
              secondaryText: '',
              cancelText: '',
              onConfirm: () => closeModal(),
              onSecondary: null,
              onCancel: () => closeModal(),
            });
            setIsLoading(false);
            return;
          }
        } else if (mode === 'enhance') {
          for (const s of allSections) {
            const status = sectionNeedsGeneration(s);
            if (!status.needsFullGeneration) {
              sectionsToProcess.push({ key: s, action: 'enhance', emptyIndices: [] });
            }
          }
          if (sectionsToProcess.length === 0) {
            setModalConfig({
              isOpen: true,
              title: language === 'si' ? 'Ni vsebine za izboljšanje' : 'No content to enhance',
              message: language === 'si'
                ? 'Nobeden razdelek nima vsebine za izboljšanje. Uporabite možnost "Generiraj vse na novo".'
                : 'No sections have content to enhance. Use the "Regenerate all" option.',
              confirmText: language === 'si' ? 'V redu' : 'OK',
              secondaryText: '',
              cancelText: '',
              onConfirm: () => closeModal(),
              onSecondary: null,
              onCancel: () => closeModal(),
            });
            setIsLoading(false);
            return;
          }
        } else {
          sectionsToProcess = allSections.map(s => ({ key: s, action: 'regenerate' as const, emptyIndices: [] }));
        }

        const totalToProcess = sectionsToProcess.length;
        skippedCount = allSections.length - totalToProcess;

        const modeLabels: Record<string, { si: string; en: string }> = {
          fill: { si: 'Dopolnjujem', en: 'Filling' },
          generate: { si: 'Generiram', en: 'Generating' },
          enhance: { si: 'Izboljšujem', en: 'Enhancing' },
          regenerate: { si: 'Generiram na novo', en: 'Regenerating' },
        };

        const waitLabel = language === 'si' ? 'Čakam na API kvoto' : 'Waiting for API quota';

        for (let idx = 0; idx < sectionsToProcess.length; idx++) {
          const { key: s, action, emptyIndices } = sectionsToProcess[idx];
          const label = modeLabels[action]?.[language] || modeLabels['generate'][language];
          const sectionLabel = s.charAt(0).toUpperCase() + s.slice(1);

          setIsLoading(`${label} ${sectionLabel} (${idx + 1}/${totalToProcess})...`);

          let success = false;
          let retries = 0;
          const maxRetries = 3;

          while (!success && retries <= maxRetries) {
            try {
              let generatedData: any;

              if (action === 'fill' && emptyIndices.length > 0) {
                generatedData = await generateTargetedFill(
                  s,
                  projectData,
                  language,
                  emptyIndices
                );
              } else {
                const genMode = action === 'generate' ? 'regenerate' : action;
                generatedData = await generateSectionContent(
                  s,
                  projectData,
                  language,
                  genMode
                );
              }

              setProjectData((prev: any) => {
                const next = { ...prev };
                next[s] = generatedData;
                return next;
              });
              successCount++;
              success = true;
            } catch (e: any) {
              const emsg = e.message || '';
              const isRateLimit = emsg.includes('429') || emsg.includes('Quota') || emsg.includes('rate limit') || emsg.includes('RESOURCE_EXHAUSTED');

              if (isRateLimit && retries < maxRetries) {
                retries++;
                const waitSeconds = retries * 20;
                console.warn(`[runComposite] Rate limit on ${s}, retry ${retries}/${maxRetries} in ${waitSeconds}s...`);
                for (let countdown = waitSeconds; countdown > 0; countdown--) {
                  setIsLoading(`${waitLabel}... ${countdown}s → ${sectionLabel}`);
                  await new Promise((r) => setTimeout(r, 1000));
                }
              } else {
                console.error(`[runComposite] Failed to generate ${s}:`, e);
                lastError = e;
                break;
              }
            }
          }

          if (success) {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }

        if (successCount > 0) {
          setHasUnsavedTranslationChanges(true);
        }

        if (!lastError && successCount === totalToProcess) {
          if (skippedCount > 0) {
            const skippedNames = allSections
              .filter(s => !sectionsToProcess.find(sp => sp.key === s))
              .map(s => s.charAt(0).toUpperCase() + s.slice(1))
              .join(', ');

            setModalConfig({
              isOpen: true,
              title: language === 'si' ? 'Dopolnjevanje končano' : 'Fill complete',
              message: language === 'si'
                ? `Uspešno dopolnjeno: ${successCount} razdelkov.\n\nPreskočeni razdelki (že izpolnjeni): ${skippedNames}.`
                : `Successfully filled: ${successCount} sections.\n\nSkipped sections (already complete): ${skippedNames}.`,
              confirmText: language === 'si' ? 'V redu' : 'OK',
              secondaryText: '',
              cancelText: '',
              onConfirm: () => closeModal(),
              onSecondary: null,
              onCancel: () => closeModal(),
            });
          }
        } else if (lastError && successCount < totalToProcess) {
          const failedCount = totalToProcess - successCount;
          const emsg = lastError.message || '';
          const isRateLimit = emsg.includes('429') || emsg.includes('Quota') || emsg.includes('rate limit') || emsg.includes('RESOURCE_EXHAUSTED');
          const isCredits = emsg.includes('afford') || emsg.includes('credits') || emsg.includes('402');
          const isJSON = emsg.includes('JSON') || emsg.includes('Unexpected token') || emsg.includes('parse');
          const isNetwork = emsg.includes('fetch') || emsg.includes('network') || emsg.includes('Failed to fetch') || emsg.includes('ERR_');

          let modalTitle: string;
          let modalMessage: string;

          if (isRateLimit) {
            modalTitle = language === 'si' ? 'Omejitev API klicev' : 'API Rate Limit Reached';
            modalMessage = language === 'si'
              ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker je bil dosežen limit AI ponudnika (15 zahtevkov/minuto).\n\nPočakajte 1–2 minuti in poskusite ponovno, ali preklopite na drug model v Nastavitvah.`
              : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to AI provider rate limits (15 requests/minute).\n\nWait 1–2 minutes and try again, or switch models in Settings.`;
          } else if (isCredits) {
            modalTitle = language === 'si' ? 'Nezadostna sredstva AI' : 'Insufficient AI Credits';
            modalMessage = language === 'si'
              ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker vaš AI ponudnik nima dovolj sredstev.\n\nDopolnite kredit pri vašem ponudniku ali preklopite na drug model v Nastavitvah.`
              : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to insufficient AI credits.\n\nTop up your credits or switch models in Settings.`;
          } else if (isJSON) {
            modalTitle = language === 'si' ? 'Napaka formata' : 'Format Error';
            modalMessage = language === 'si'
              ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker je AI vrnil nepravilen format.\n\nPoskusite ponovno — AI modeli občasno vrnejo nepopoln odgovor.`
              : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated because the AI returned an invalid format.\n\nPlease try again — AI models occasionally return incomplete responses.`;
          } else if (isNetwork) {
            modalTitle = language === 'si' ? 'Omrežna napaka' : 'Network Error';
            modalMessage = language === 'si'
              ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati zaradi omrežne napake.\n\nPreverite internetno povezavo in poskusite ponovno.`
              : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to a network error.\n\nCheck your internet connection and try again.`;
          } else {
            modalTitle = language === 'si' ? 'Delna generacija' : 'Partial Generation';
            modalMessage = language === 'si'
              ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati.\n\nPoskusite ponovno ali preklopite na drug AI model v Nastavitvah.`
              : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated.\n\nPlease try again or switch to a different AI model in Settings.`;
          }

          setModalConfig({
            isOpen: true,
            title: modalTitle,
            message: modalMessage,
            confirmText: language === 'si' ? 'V redu' : 'OK',
            secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
            cancelText: '',
            onConfirm: () => closeModal(),
            onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
            onCancel: () => closeModal(),
          });
        }

        setIsLoading(false);
      };

      if (otherLangData && !hasContentInSections) {
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
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
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
            ? `Rezultati obstajajo v slovenščini in angleščini. Kaj želite storiti?`
            : `Results exist in both SI and EN. What would you like to do?`,
          confirmText: language === 'si'
            ? 'Generiraj / izboljšaj trenutno'
            : 'Generate / enhance current',
          secondaryText: language === 'si'
            ? `Prevedi iz ${otherLang}`
            : `Translate from ${otherLang}`,
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
          onConfirm: () => {
            closeModal();
            setTimeout(() => {
              show3OptionModal(
                () => runComposite('enhance'),
                () => runComposite('fill'),
                () => runComposite('regenerate')
              );
            }, 100);
          },
          onSecondary: () => performTranslationFromOther(otherLangData),
          onCancel: closeModal,
        });
      } else if (hasContentInSections) {
        show3OptionModal(
          () => runComposite('enhance'),
          () => runComposite('fill'),
          () => runComposite('regenerate')
        );
      } else {
        runComposite('regenerate');
      }
    },
    [
      ensureApiKey,
      robustCheckSectionHasContent,
      sectionNeedsGeneration,
      checkOtherLanguageHasContent,
      projectData,
      language,
      t,
      closeModal,
      setProjectData,
      setHasUnsavedTranslationChanges,
      setIsSettingsOpen,
      setModalConfig,
      handleAIError,
      performTranslationFromOther,
      show3OptionModal,
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
