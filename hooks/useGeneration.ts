// hooks/useGeneration.ts
// ═══════════════════════════════════════════════════════════════
// AI content generation — sections, fields, summaries.
// v7.5 — 2026-02-24 — ABORT/CANCEL SUPPORT + TOKEN OPTIMIZATION ALIGNMENT
//
// CHANGES v7.5:
//   ★ NEW: abortControllerRef — stores active AbortController
//   ★ NEW: cancelGeneration() — aborts current generation, resets state
//   ★ CHANGED: executeGeneration() creates AbortController, passes signal
//     to all generate* functions
//   ★ CHANGED: handleGenerateField() creates AbortController, passes signal
//   ★ CHANGED: runSummaryGeneration() creates AbortController, passes signal
//   ★ CHANGED: handleAIError() recognizes AbortError — no modal shown
//   ★ EXPORTED: cancelGeneration from hook return
//   ★ All previous v7.2 changes preserved.
//
// v7.2 — 2026-02-23 — SMART AI CREDIT PROTECTION
// v7.0 — 2026-02-22 — FULL v7.0 ALIGNMENT
// v5.0 — 2026-02-22 — PARTNERS (CONSORTIUM) AI GENERATION
// v4.2 — 2026-02-16 — SUB-SECTION GENERATION
// v3.9 — 2026-02-16 — PER-WP GENERATION COMPLETE
// v3.8 — 2026-02-16 — PER-WP GENERATION
// v3.7 — 2026-02-15 — SMART FILL COMPOSITE
// v3.6 — 2026-02-15 — RETRY + BACKOFF + FRIENDLY MODALS
// v3.5.2 — 2026-02-14 — AUTO PM + ROBUST CHECKS + 3-OPTION MODAL
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import {
  generateSectionContent,
  generateFieldContent,
  generateProjectSummary,
  generateTargetedFill,
  generateActivitiesPerWP,
  generateObjectFill,
  generatePartnerAllocations,
} from '../services/geminiService.ts';
import { getRateLimitStatus } from '../services/aiProvider.ts';
import { generateSummaryDocx } from '../services/docxGenerator.ts';
import { recalculateProjectSchedule, downloadBlob, set } from '../utils.ts';
import { TEXT } from '../locales.ts';
import { storageService } from '../services/storageService.ts';
import { smartTranslateProject } from '../services/translationDiffService.ts';
import { isValidPartnerType } from '../services/Instructions.ts';

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

  // ★ v7.2: Global generation lock
  const isGeneratingRef = useRef(false);
  const sessionCallCountRef = useRef(0);
  // ★ v7.5: AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const t = TEXT[language] || TEXT['en'];

  // ★ v7.5: Cancel active generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[useGeneration] Cancelling active generation...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isGeneratingRef.current = false;
    setIsLoading(false);
    setError(
      language === 'si'
        ? 'Generiranje preklicano.'
        : 'Generation cancelled.'
    );
    setTimeout(() => setError(null), 3000);
  }, [language]);

  // ★ v7.2: Pre-generation guard
  const preGenerationGuard = useCallback(
    (context: string): boolean => {
      if (isGeneratingRef.current) {
        console.warn(`[useGeneration] Blocked: already generating (${context})`);
        return false;
      }

      const status = getRateLimitStatus();
      if (status.requestsInWindow >= status.maxRequests - 1) {
        const waitSec = Math.ceil(status.windowMs / 1000);
        setModalConfig({
          isOpen: true,
          title: language === 'si' ? 'Preveč zahtevkov' : 'Too Many Requests',
          message: language === 'si'
            ? `V zadnji minuti ste poslali ${status.requestsInWindow} zahtevkov (omejitev: ${status.maxRequests}/min).\n\nPočakajte ~${waitSec} sekund preden nadaljujete, da se izognete blokiranju s strani AI ponudnika.\n\nTa seja: ${sessionCallCountRef.current} AI klicev.`
            : `You've made ${status.requestsInWindow} requests in the last minute (limit: ${status.maxRequests}/min).\n\nPlease wait ~${waitSec} seconds before continuing to avoid being blocked by the AI provider.\n\nThis session: ${sessionCallCountRef.current} AI calls.`,
          confirmText: language === 'si' ? 'V redu' : 'OK',
          secondaryText: '',
          cancelText: '',
          onConfirm: closeModal,
          onSecondary: null,
          onCancel: closeModal,
        });
        return false;
      }

      return true;
    },
    [language, setModalConfig, closeModal]
  );

  // ─── DEEP CONTENT CHECKER ─────────────────────────────────────

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

  // ─── ROBUST content checker ────────────────────────────────────

  const robustCheckSectionHasContent = useCallback(
    (sectionKey: string): boolean => {
      const section = projectData[sectionKey];
      if (!section) return false;
      return hasDeepContent(section);
    },
    [projectData, hasDeepContent]
  );

  // ─── Check if a section needs generation ───────────────────────

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
              if (val === undefined || val === null) return true;
              if (typeof val === 'string' && (val.trim().length === 0 || val.includes('[AI did not generate'))) return true;
              return false;
            });
            // ★ FIX: Also detect MISSING expected fields (e.g., indicator not returned by AI)
            const EXPECTED_FIELDS_MAP: Record<string, string[]> = {
              generalObjectives: ['title', 'description', 'indicator'],
              specificObjectives: ['title', 'description', 'indicator'],
              outputs: ['title', 'description', 'indicator'],
              outcomes: ['title', 'description', 'indicator'],
              impacts: ['title', 'description', 'indicator'],
              kers: ['title', 'description', 'exploitationStrategy'],
              risks: ['title', 'description', 'mitigation'],
            };
            const _expectedKeys = EXPECTED_FIELDS_MAP[sectionKey] || [];
            const hasMissingFields = _expectedKeys.length > 0 && _expectedKeys.some(k => !(k in item) || item[k] === undefined || item[k] === null || (typeof item[k] === 'string' && item[k].trim().length === 0));
            if (hasEmptyFields || hasMissingFields) {
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

  // ─── Sub-section mapping ───────────────────────────────────────

  const SUB_SECTION_MAP: Record<string, { parent: string; path: string[]; isString?: boolean }> = {
    coreProblem:        { parent: 'problemAnalysis', path: ['problemAnalysis', 'coreProblem'] },
    causes:             { parent: 'problemAnalysis', path: ['problemAnalysis', 'causes'] },
    consequences:       { parent: 'problemAnalysis', path: ['problemAnalysis', 'consequences'] },
    projectTitleAcronym:{ parent: 'projectIdea',     path: ['projectIdea'] },
    mainAim:            { parent: 'projectIdea',     path: ['projectIdea', 'mainAim'], isString: true },
    stateOfTheArt:      { parent: 'projectIdea',     path: ['projectIdea', 'stateOfTheArt'], isString: true },
    proposedSolution:   { parent: 'projectIdea',     path: ['projectIdea', 'proposedSolution'], isString: true },
    readinessLevels:    { parent: 'projectIdea',     path: ['projectIdea', 'readinessLevels'] },
    policies:           { parent: 'projectIdea',     path: ['projectIdea', 'policies'] },
  };

  // ─── Comprehensive error handler ───────────────────────────────
  // ★ v7.5: AbortError recognition added at the top

  const handleAIError = useCallback(
    (e: any, context: string = '') => {
      const msg = e.message || e.toString();

      // ★ v7.5: AbortError — user cancelled, don't show error modal
      if (e.name === 'AbortError' || msg.includes('abort') || msg.includes('cancelled') || msg.includes('Generation cancelled')) {
        console.log(`[useGeneration] Generation cancelled by user (${context})`);
        return;
      }

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

  // ─── Check other language content ──────────────────────────────

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
  // ★ v7.5: Creates AbortController, passes signal to all generate* calls

    const executeGeneration = useCallback(
    async (sectionKey: string, mode: string = 'regenerate') => {
      if (!preGenerationGuard(sectionKey)) return;

      isGeneratingRef.current = true;
      sessionCallCountRef.current++;

      // ★ v7.5: Create AbortController for this generation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const signal = abortController.signal;

      closeModal();
      setIsLoading(`${t.generating} ${sectionKey}...`);
      setError(null);

      try {
        let generatedData;

        const subMapping = SUB_SECTION_MAP[sectionKey];

        if (subMapping) {
          generatedData = await generateSectionContent(
            sectionKey,
            projectData,
            language,
            mode,
            null,
            signal  // ★ v7.5
          );

        } else if (sectionKey === 'partnerAllocations') {
          const pa_partners = Array.isArray(projectData.partners) ? projectData.partners : [];
          const pa_activities = Array.isArray(projectData.activities) ? projectData.activities : [];

          if (pa_partners.length === 0 || pa_activities.length === 0) {
            setModalConfig({
              isOpen: true,
              title: language === 'si' ? 'Manjkajo podatki' : 'Missing Data',
              message: language === 'si'
                ? 'Za generiranje alokacij partnerjev potrebujete definirane partnerje IN delovne pakete z nalogami.\n\nNajprej generirajte partnerje (Konzorcij) in aktivnosti (Delovni načrt).'
                : 'To generate partner allocations you need defined partners AND work packages with tasks.\n\nFirst generate Partners (Consortium) and Activities (Work Plan).',
              confirmText: language === 'si' ? 'V redu' : 'OK',
              secondaryText: '',
              cancelText: '',
              onConfirm: () => closeModal(),
              onSecondary: null,
              onCancel: () => closeModal(),
            });
            setIsLoading(false);
            isGeneratingRef.current = false;
            abortControllerRef.current = null;  // ★ v7.5
            return;
          }

          setIsLoading(
            language === 'si'
              ? 'Generiram alokacije partnerjev na naloge...'
              : 'Generating partner allocations for tasks...'
          );

          const allocResult = await generatePartnerAllocations(
            projectData,
            language,
            (msg: string) => setIsLoading(msg),
            signal  // ★ v7.5
          );

          const updatedActivities = pa_activities.map((wp: any) => ({
            ...wp,
            tasks: (wp.tasks || []).map((task: any) => {
              const taskAlloc = allocResult.find(
                (a: any) => a.taskId === task.id
              );
              if (taskAlloc && Array.isArray(taskAlloc.allocations) && taskAlloc.allocations.length > 0) {
                return {
                  ...task,
                  partnerAllocations: taskAlloc.allocations,
                };
              }
              return task;
            }),
          }));

          const newAllocData = { ...projectData, activities: updatedActivities };
          setProjectData(newAllocData);
          setHasUnsavedTranslationChanges(true);

          const totalAllocations = allocResult.reduce((s: number, t: any) => s + (t.allocations?.length || 0), 0);
          console.log(`[useGeneration] Partner allocations applied: ${totalAllocations} allocations across ${allocResult.length} tasks`);

          setIsLoading(false);
          isGeneratingRef.current = false;
          abortControllerRef.current = null;  // ★ v7.5
          return;

        } else if (sectionKey === 'partners') {
          const existingPartners = projectData.partners || [];

          if (mode === 'regenerate' || existingPartners.length === 0) {
            setIsLoading(
              language === 'si'
                ? 'Generiram konzorcij (partnerji)...'
                : 'Generating consortium (partners)...'
            );
            generatedData = await generateSectionContent(
              'partners',
              projectData,
              language,
              'regenerate',
              null,
              signal  // ★ v7.5
            );
          } else if (mode === 'enhance') {
            setIsLoading(
              language === 'si'
                ? 'Izboljšujem konzorcij...'
                : 'Enhancing consortium...'
            );
            generatedData = await generateSectionContent(
              'partners',
              projectData,
              language,
              'enhance',
              null,
              signal  // ★ v7.5
            );
          } else {
            const needsFill = existingPartners.some((p: any) =>
              !p.name || p.name.trim() === '' || !p.expertise || p.expertise.trim() === '' || !p.pmRate
            );
            if (needsFill) {
              setIsLoading(
                language === 'si'
                  ? 'Dopolnjujem podatke o partnerjih...'
                  : 'Filling partner data...'
              );
              generatedData = await generateSectionContent(
                'partners',
                { ...projectData, partners: existingPartners },
                language,
                'fill',
                null,
                signal  // ★ v7.5
              );
            } else {
              generatedData = existingPartners;
            }
          }

          if (Array.isArray(generatedData)) {
            generatedData = generatedData.map((p: any, idx: number) => ({
              ...p,
              id: p.id || `partner-${idx + 1}`,
              code: p.code || (idx === 0 ? (language === 'si' ? 'KO' : 'CO') : `P${idx + 1}`),
              partnerType: (p.partnerType && isValidPartnerType(p.partnerType))
                ? p.partnerType
                : 'other',
            }));
            console.log(`[useGeneration] Partners post-processed: ${generatedData.length} partners, types: ${generatedData.map((p: any) => p.partnerType).join(', ')}`);
          }

        } else if (sectionKey === 'activities') {
          const existingWPs = projectData.activities || [];
          const emptyWPIndices: number[] = [];

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
              (wpIndex: number, wpTotal: number, wpTitle: string) => {
                if (wpIndex === -1) {
                  setIsLoading(language === 'si' ? 'Generiranje strukture DS...' : 'Generating WP structure...');
                } else {
                  setIsLoading(
                    language === 'si'
                      ? `Generiram DS ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                      : `Generating WP ${wpIndex + 1}/${wpTotal}: ${wpTitle}...`
                  );
                }
              },
              undefined,
              undefined,
              signal  // ★ v7.5
            );

          } else if (hasMissingMandatory && mode !== 'enhance') {
            const durationMonths = projectData.projectIdea?.durationMonths || 24;
            const augmentedWPs = [...existingWPs];
            const mandatoryIndicesToGenerate: number[] = [];

            const missingNames: string[] = [];

            if (missingPM) {
              missingNames.push(language === 'si' ? 'Upravljanje projekta' : 'Project Management');

              const wpPfx2 = language === 'si' ? 'DS' : 'WP';
              const pmPlaceholder = {
                id: `${wpPfx2}${augmentedWPs.length + 1}`,
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
            const wpPfx = language === 'si' ? 'DS' : 'WP';
            augmentedWPs.forEach((wp, idx) => {
              wp.id = `${wpPfx}${idx + 1}`;
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
              (wpIndex: number, wpTotal: number, wpTitle: string) => {
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
              finalIndicesToGenerate,
              signal  // ★ v7.5
            );

          } else if (emptyWPIndices.length > 0) {
            generatedData = await generateActivitiesPerWP(
              projectData,
              language,
              'fill',
              (wpIndex: number, wpTotal: number, wpTitle: string) => {
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
              emptyWPIndices,
              signal  // ★ v7.5
            );

          } else if (mode === 'enhance') {
            generatedData = await generateSectionContent(
              sectionKey,
              projectData,
              language,
              mode,
              null,
              signal  // ★ v7.5
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
              projectData[sectionKey],  // currentData
              emptyFields,
              language,
              signal  // ★ v7.5
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
              'regenerate',
              null,
              signal  // ★ v7.5
            );

          } else if (Array.isArray(sectionData)) {
            const emptyIndices: number[] = [];
            sectionData.forEach((item: any, index: number) => {
              if (!item || !hasDeepContent(item)) {
                emptyIndices.push(index);
              } else {
            const hasEmptyFields = Object.entries(item).some(([key, val]) => {
              if (key === 'id') return false;
              if (val === undefined || val === null) return true;
              if (typeof val === 'string' && (val.trim().length === 0 || val.includes('[AI did not generate'))) return true;
              return false;
            });
            // ★ FIX: Also detect MISSING expected fields (e.g., indicator not returned by AI)
            const EXPECTED_FIELDS_MAP: Record<string, string[]> = {
              generalObjectives: ['title', 'description', 'indicator'],
              specificObjectives: ['title', 'description', 'indicator'],
              outputs: ['title', 'description', 'indicator'],
              outcomes: ['title', 'description', 'indicator'],
              impacts: ['title', 'description', 'indicator'],
              kers: ['title', 'description', 'exploitationStrategy'],
              risks: ['title', 'description', 'mitigation'],
            };
            const _expectedKeys = EXPECTED_FIELDS_MAP[sectionKey] || [];
            const hasMissingFields = _expectedKeys.length > 0 && _expectedKeys.some(k => !(k in item) || item[k] === undefined || item[k] === null || (typeof item[k] === 'string' && item[k].trim().length === 0));
            if (hasEmptyFields || hasMissingFields) {
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
                sectionData,  // currentData
                language,
                signal  // ★ v7.5
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
                sectionData,  // currentData
                emptyFields,
                language,
                signal  // ★ v7.5
              );
            }

          } else {
            generatedData = await generateSectionContent(
              sectionKey,
              projectData,
              language,
              mode,
              null,
              signal  // ★ v7.5
            );
          }

        } else {
          generatedData = await generateSectionContent(
            sectionKey,
            projectData,
            language,
            mode,
            null,
            signal  // ★ v7.5
          );
        }
        // ★ DIAGNOSTIC: Log what AI actually returned
        console.log(`[executeGeneration] ★ generatedData for "${sectionKey}":`, 
          JSON.stringify(generatedData)?.substring(0, 500),
          '| type:', typeof generatedData,
          '| isArray:', Array.isArray(generatedData),
          '| length:', Array.isArray(generatedData) ? generatedData.length : 'N/A'
        );
        // ★ GUARD: If AI returned nothing, don't overwrite existing data
        if (generatedData === undefined || generatedData === null) {
          console.error(`[executeGeneration] ★ CRITICAL: generatedData is ${generatedData} for "${sectionKey}" — aborting data insertion`);
          setError(
            language === 'si'
              ? 'AI ni vrnil podatkov. Poskusite ponovno.'
              : 'AI returned no data. Please try again.'
          );
          setIsLoading(false);
          isGeneratingRef.current = false;
          abortControllerRef.current = null;
          return;
        }

        // ═══ DATA INSERTION ═══
        let newData = { ...projectData };

        if (subMapping) {
          if (sectionKey === 'projectTitleAcronym') {
            newData.projectIdea = {
              ...newData.projectIdea,
              projectTitle: generatedData.projectTitle || newData.projectIdea.projectTitle,
              projectAcronym: generatedData.projectAcronym || newData.projectIdea.projectAcronym,
            };
          } else if (subMapping.isString) {
            const parentKey = subMapping.path[0];
            const fieldKey = subMapping.path[1];
            newData[parentKey] = {
              ...newData[parentKey],
              [fieldKey]: generatedData,
            };
          } else if (subMapping.path.length === 2) {
            const parentKey = subMapping.path[0];
            const fieldKey = subMapping.path[1];
            newData[parentKey] = {
              ...newData[parentKey],
              [fieldKey]: generatedData,
            };
          }
        } else if (sectionKey === 'partners') {
          newData.partners = generatedData;
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
          // ★ FIX: Handle AI returning {objectives: [...]} instead of [...]
          if (Array.isArray(generatedData)) {
            newData[sectionKey] = generatedData;
          } else if (generatedData && typeof generatedData === 'object' && !Array.isArray(generatedData)) {
            // AI might return wrapped object like {objectives: [...]} or {outputs: [...]}
            const values = Object.values(generatedData);
            const nestedArray = values.find((v: any) => Array.isArray(v) && v.length > 0);
            if (nestedArray) {
              console.warn(`[executeGeneration] ★ "${sectionKey}" returned as object, extracted nested array (${(nestedArray as any[]).length} items)`);
              newData[sectionKey] = nestedArray;
            } else {
              newData[sectionKey] = generatedData;
            }
          } else {
            console.warn(`[executeGeneration] ★ "${sectionKey}" generatedData is null/undefined — keeping original`);
            // Don't overwrite with null/undefined
          }
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
              mode,
              null,
              signal  // ★ v7.5
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
            // ★ v7.5: If cancelled, re-throw immediately
            if (e.name === 'AbortError') throw e;

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
              // ★ v7.5: Check abort after wait
              if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
              setIsLoading(`${t.generating} ${t.subSteps.implementation}...`);
              try {
                const pmRetry = await generateSectionContent('projectManagement', newData, language, mode, null, signal);
                newData.projectManagement = {
                  ...newData.projectManagement,
                  ...pmRetry,
                  structure: {
                    ...(newData.projectManagement?.structure || {}),
                    ...(pmRetry?.structure || {}),
                  },
                };
              } catch (e2: any) {
                if (e2.name === 'AbortError') throw e2;  // ★ v7.5
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
          // ★ v7.5: Check abort before risks generation
          if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
          setIsLoading(`${t.generating} ${t.subSteps.riskMitigation}...`);
          try {
            const risksContent = await generateSectionContent(
              'risks',
              newData,
              language,
              mode,
              null,
              signal  // ★ v7.5
            );
            if (Array.isArray(risksContent)) {
              newData.risks = risksContent;
            } else if (risksContent && Array.isArray(risksContent.risks)) {
              newData.risks = risksContent.risks;
            } else {
              console.warn('[executeGeneration] risks: unexpected format, keeping original');
            }
          } catch (e: any) {
            // ★ v7.5: If cancelled, re-throw immediately
            if (e.name === 'AbortError') throw e;

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
              if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');  // ★ v7.5
              setIsLoading(`${t.generating} ${t.subSteps.riskMitigation}...`);
              try {
                const risksRetry = await generateSectionContent('risks', newData, language, mode, null, signal);
                if (Array.isArray(risksRetry)) {
                  newData.risks = risksRetry;
                } else if (risksRetry && Array.isArray((risksRetry as any).risks)) {
                  newData.risks = (risksRetry as any).risks;
                }
              } catch (e2: any) {
                if (e2.name === 'AbortError') throw e2;  // ★ v7.5
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

        setProjectData((prev: any) => {
          const savedData = { ...prev, ...newData };
          // ★ EXPLICIT SAVE — save the ACTUAL merged state, not stale closure data
          if (currentProjectId) {
            storageService.saveProject(savedData, language, currentProjectId)
              .then(() => console.log(`[executeGeneration] ★ Explicit save after ${sectionKey} — lang=${language}, generalObjectives: ${Array.isArray(savedData.generalObjectives) && savedData.generalObjectives.some((o: any) => o.title?.trim()) ? '✅ HAS' : '⚠️ EMPTY'}`))
              .catch((e: any) => console.error(`[executeGeneration] ★ Explicit save failed:`, e));
          }
          return savedData;
        });
        setHasUnsavedTranslationChanges(true);

      } catch (e: any) {
        handleAIError(e, `generateSection(${sectionKey})`);
      } finally {

        setIsLoading(false);
        isGeneratingRef.current = false;
        abortControllerRef.current = null;  // ★ v7.5: Cleanup
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
      preGenerationGuard,
      currentProjectId,
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

  // ─── SMART Handle generate (4-level logic) ─────────────────────

  const handleGenerateSection = useCallback(
    async (sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const otherLang = language === 'en' ? 'SI' : 'EN';

      const subMapping = SUB_SECTION_MAP[sectionKey];
      const contentCheckKey = subMapping ? subMapping.parent : sectionKey;

      const currentHasContent = subMapping
        ? (() => {
            let data: any = projectData;
            for (const key of subMapping.path) {
              data = data?.[key];
            }
            return hasDeepContent(data);
          })()
        : robustCheckSectionHasContent(sectionKey);

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

    // ─── Composite generation (expectedResults OR activities) ───────

  const handleGenerateCompositeSection = useCallback(
    async (compositeSectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      // ── Determine which sub-sections to process ──
      const COMPOSITE_MAP: Record<string, string[]> = {
        expectedResults: ['outputs', 'outcomes', 'impacts', 'kers'],
        activities: ['projectManagement', 'partners', 'activities', 'partnerAllocations', 'risks'],
      };

      const allSections = COMPOSITE_MAP[compositeSectionKey];
      if (!allSections) {
        console.error(`[handleGenerateCompositeSection] Unknown composite key: ${compositeSectionKey}`);
        return;
      }

      const isActivities = compositeSectionKey === 'activities';

      // ── Check existing content ──
            const checkableSections = isActivities
        ? ['projectManagement', 'partners', 'activities', 'risks']
        : allSections;

        const hasContentInSections = checkableSections.some((s) => {
        if (isActivities && s === 'projectManagement') {
          const hasWPs = Array.isArray(projectData.activities) && projectData.activities.some((wp: any) => wp.title?.trim() && wp.tasks?.length > 0 && wp.tasks.some((t: any) => t.title?.trim()));
          const hasPart = Array.isArray(projectData.partners) && projectData.partners.some((p: any) => p.name?.trim());
          if (!hasWPs && !hasPart) return false;
        }
        return robustCheckSectionHasContent(s);
      });

      const otherLang = language === 'en' ? 'SI' : 'EN';

      // ★ FIX: For activities composite, check if other language has REAL content
      // (not just empty templates with id:"WP1" and empty fields)
      const hasRealContent = (data: any, sectionKey: string): boolean => {
        if (!data) return false;
        const section = data[sectionKey];
        if (!section) return false;
        if (Array.isArray(section)) {
          return section.length > 0 && section.some((item: any) => {
            if (!item || typeof item !== 'object') return false;
            return Object.entries(item).some(([key, val]) => {
              if (key === 'id' || key === 'startDate' || key === 'endDate' || key === 'startMonth' || key === 'endMonth' || key === 'dependencies' || key === 'leader' || key === 'participants') return false;
              if (typeof val === 'string') return val.trim().length > 0;
              if (Array.isArray(val)) return val.length > 0 && val.some((v: any) => {
                if (!v || typeof v !== 'object') return false;
                return Object.entries(v).some(([k2, v2]) => {
                  if (k2 === 'id' || k2 === 'dependencies') return false;
                  return typeof v2 === 'string' && v2.trim().length > 0;
                });
              });
              return false;
            });
          });
        }
        if (typeof section === 'object') {
          const desc = (section as any).description;
          if (typeof desc === 'string' && desc.trim().length > 0) return true;
          return false;
        }
        return false;
      };

      let otherLangData: any = null;
      for (const s of checkableSections) {
        const candidate = await checkOtherLanguageHasContent(s);
          if (candidate) {
          otherLangData = candidate;
          break;
        }
      }

      // ── Main composite runner ──
      const runComposite = async (mode: string) => {
        if (!preGenerationGuard(`composite-${compositeSectionKey}`)) return;

        isGeneratingRef.current = true;
        sessionCallCountRef.current++;

        // ★ v7.5: Create AbortController
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        const signal = abortController.signal;

        closeModal();
        setIsLoading(true);
        setError(null);

        try {
                    if (isActivities) {
            // ═══════════════════════════════════════════════
            // ACTIVITIES COMPOSITE — sequential with dependencies
            // Order: projectManagement → partners → activities (WP) → partnerAllocations → risks
            // ★ FIX: Track success/failure, show error modal if ALL fail
            // ═══════════════════════════════════════════════

            let newData = { ...projectData };
            const totalSteps = 5;
            let currentStep = 0;
            let successCount = 0;
            let firstFatalError: any = null;

            const stepLabel = (stepNum: number, siText: string, enText: string) => {
              return language === 'si'
                ? `${siText} (${stepNum}/${totalSteps})...`
                : `${enText} (${stepNum}/${totalSteps})...`;
            };

            // ★ Helper: detect RATE_LIMIT from error
            const isRateLimitError = (e: any): boolean => {
              const msg = e?.message || e?.toString() || '';
              return msg.includes('RATE_LIMIT') || msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
            };

            // ── Step 1: Project Management ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
            setIsLoading(stepLabel(currentStep, 'Generiram implementacijo', 'Generating implementation'));

            try {
              const pmContent = await generateSectionContent(
                'projectManagement', newData, language, mode, null, signal
              );
              newData.projectManagement = {
                ...newData.projectManagement,
                ...pmContent,
                structure: {
                  ...(newData.projectManagement?.structure || {}),
                  ...(pmContent?.structure || {}),
                },
              };
              successCount++;
              console.log('[Composite/activities] Step 1/5: projectManagement ✅');
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] projectManagement failed:', e);
              if (!firstFatalError) firstFatalError = e;
              // ★ FIX: If RATE_LIMIT on very first step, abort early — no point continuing
              if (isRateLimitError(e)) {
                console.error('[Composite/activities] ★ RATE_LIMIT on step 1 — aborting composite');
                handleAIError(e, 'compositeActivities');
                setIsLoading(false);
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
                return;
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 2: Partners (Consortium) ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
            setIsLoading(stepLabel(currentStep, 'Generiram konzorcij', 'Generating consortium'));

            try {
              let partnersResult = await generateSectionContent(
                'partners', newData, language, mode, null, signal
              );
              if (Array.isArray(partnersResult)) {
                partnersResult = partnersResult.map((p: any, idx: number) => ({
                  ...p,
                  id: p.id || `partner-${idx + 1}`,
                  code: p.code || (idx === 0 ? (language === 'si' ? 'KO' : 'CO') : `P${idx + 1}`),
                  partnerType: (p.partnerType && isValidPartnerType(p.partnerType))
                    ? p.partnerType
                    : 'other',
                }));
                newData.partners = partnersResult;
                successCount++;
                console.log(`[Composite/activities] Step 2/5: partners ✅ (${partnersResult.length} partners)`);
              }
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] partners failed:', e);
              if (!firstFatalError) firstFatalError = e;
              // ★ FIX: If RATE_LIMIT and no success so far, abort
              if (isRateLimitError(e) && successCount === 0) {
                console.error('[Composite/activities] ★ RATE_LIMIT, 0 successes — aborting composite');
                handleAIError(e, 'compositeActivities');
                setIsLoading(false);
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
                return;
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 3: Activities (WP per-WP generation) ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');

            try {
              const existingWPs = Array.isArray(newData.activities) ? newData.activities : [];

              let activitiesResult;
              if (mode === 'regenerate' || existingWPs.length === 0) {
                activitiesResult = await generateActivitiesPerWP(
                  newData, language, mode,
                  (wpIndex: number, wpTotal: number, wpTitle: string) => {
                    if (wpIndex === -1) {
                      setIsLoading(stepLabel(currentStep, 'Generiram strukturo DS', 'Generating WP structure'));
                    } else {
                      setIsLoading(
                        language === 'si'
                          ? `Generiram DS ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                          : `Generating WP ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                      );
                    }
                  },
                  undefined, undefined, signal
                );
              } else if (mode === 'enhance') {
                activitiesResult = await generateSectionContent(
                  'activities', newData, language, 'enhance', null, signal
                );
              } else {
                // fill mode
                const emptyWPIndices: number[] = [];
                existingWPs.forEach((wp: any, idx: number) => {
                  const hasTasks = wp.tasks?.length > 0 && wp.tasks.some((t: any) => t.title?.trim());
                  const hasMilestones = wp.milestones?.length > 0;
                  const hasDeliverables = wp.deliverables?.length > 0 && wp.deliverables.some((d: any) => d.title?.trim());
                  if (!hasTasks || !hasMilestones || !hasDeliverables) emptyWPIndices.push(idx);
                });

                if (emptyWPIndices.length > 0) {
                  activitiesResult = await generateActivitiesPerWP(
                    newData, language, 'fill',
                    (wpIndex: number, wpTotal: number, wpTitle: string) => {
                      if (wpIndex === -1) {
                        setIsLoading(stepLabel(currentStep, `Dopolnjujem ${emptyWPIndices.length} DS`, `Filling ${emptyWPIndices.length} WPs`));
                      } else {
                        setIsLoading(
                          language === 'si'
                            ? `Dopolnjujem DS ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                            : `Filling WP ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                        );
                      }
                    },
                    existingWPs, emptyWPIndices, signal
                  );
                } else {
                  activitiesResult = existingWPs;
                }
              }

              // Insert activities
              if (Array.isArray(activitiesResult)) {
                newData.activities = activitiesResult;
              } else if (activitiesResult && Array.isArray(activitiesResult.activities)) {
                newData.activities = activitiesResult.activities;
              }

              // Recalculate schedule
              const schedResult = recalculateProjectSchedule(newData);
              newData = schedResult.projectData;

              successCount++;
              console.log(`[Composite/activities] Step 3/5: activities ✅ (${(newData.activities || []).length} WPs)`);
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] activities failed:', e);
              if (!firstFatalError) firstFatalError = e;
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 4: Partner Allocations ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');

            const pa_partners = Array.isArray(newData.partners) ? newData.partners : [];
            const pa_activities = Array.isArray(newData.activities) ? newData.activities : [];

            if (pa_partners.length > 0 && pa_activities.length > 0) {
              setIsLoading(stepLabel(currentStep, 'Generiram alokacije partnerjev', 'Generating partner allocations'));

              try {
                const allocResult = await generatePartnerAllocations(
                  newData, language,
                  (msg: string) => setIsLoading(`${msg} (${currentStep}/${totalSteps})`),
                  signal
                );

                const updatedActivities = pa_activities.map((wp: any) => ({
                  ...wp,
                  tasks: (wp.tasks || []).map((task: any) => {
                    const taskAlloc = allocResult.find((a: any) => a.taskId === task.id);
                    if (taskAlloc?.allocations?.length > 0) {
                      return { ...task, partnerAllocations: taskAlloc.allocations };
                    }
                    return task;
                  }),
                }));
                newData.activities = updatedActivities;

                const totalAllocations = allocResult.reduce((s: number, t: any) => s + (t.allocations?.length || 0), 0);
                successCount++;
                console.log(`[Composite/activities] Step 4/5: partnerAllocations ✅ (${totalAllocations} allocations)`);
              } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                console.error('[Composite/activities] partnerAllocations failed:', e);
                if (!firstFatalError) firstFatalError = e;
              }
            } else {
              console.log(`[Composite/activities] Step 4/5: partnerAllocations ⏭ SKIPPED (partners: ${pa_partners.length}, activities: ${pa_activities.length})`);
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 5: Risks ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
            setIsLoading(stepLabel(currentStep, 'Generiram tveganja', 'Generating risks'));

            try {
              const risksContent = await generateSectionContent(
                'risks', newData, language, mode, null, signal
              );
              if (Array.isArray(risksContent)) {
                newData.risks = risksContent;
              } else if (risksContent && Array.isArray((risksContent as any).risks)) {
                newData.risks = (risksContent as any).risks;
              }
              successCount++;
              console.log(`[Composite/activities] Step 5/5: risks ✅`);
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] risks failed:', e);
              if (!firstFatalError) firstFatalError = e;
            }

            // ── Post-processing: check results ──
            console.log(`[Composite/activities] Result: ${successCount}/${totalSteps} steps succeeded`);

            if (successCount === 0 && firstFatalError) {
              // ★ ALL STEPS FAILED — show error modal to user
              console.error('[Composite/activities] ★ ALL STEPS FAILED — showing error modal');
              handleAIError(firstFatalError, 'compositeActivities');
              // Don't save empty data
              return;
            }

            // ── Save (only if at least 1 step succeeded) ──
            setProjectData((prev: any) => {
              const savedData = { ...prev, ...newData };
              if (currentProjectId) {
                storageService.saveProject(savedData, language, currentProjectId)
                  .then(() => console.log(`[Composite/activities] ★ Explicit save — SUCCESS`))
                  .catch((e: any) => console.error(`[Composite/activities] ★ Explicit save failed:`, e));
              }
              return savedData;
            });
            setHasUnsavedTranslationChanges(true);
            console.log(`[Composite/activities] DONE — ${successCount}/${totalSteps} steps succeeded ✅`);

            // ★ FIX: Show partial success modal if some steps failed
            if (successCount > 0 && successCount < totalSteps && firstFatalError) {
              const failedCount = totalSteps - successCount;
              const isRL = isRateLimitError(firstFatalError);
              setModalConfig({
                isOpen: true,
                title: language === 'si'
                  ? (isRL ? 'Omejitev API klicev' : 'Delna generacija aktivnosti')
                  : (isRL ? 'API Rate Limit Reached' : 'Partial Activities Generation'),
                message: language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalSteps} korakov.\n\n${failedCount} korakov ni uspelo${isRL ? ' zaradi omejitve API ponudnika.\n\nPočakajte 1–2 minuti in poskusite ponovno za manjkajoče dele, ali preklopite na drug model v Nastavitvah.' : '.\n\nPoskusite ponovno za manjkajoče dele.'}`
                  : `Successfully generated: ${successCount} of ${totalSteps} steps.\n\n${failedCount} steps failed${isRL ? ' due to API rate limits.\n\nWait 1–2 minutes and try again for missing parts, or switch models in Settings.' : '.\n\nTry again for missing parts.'}`,
                confirmText: language === 'si' ? 'V redu' : 'OK',
                secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
                cancelText: '',
                onConfirm: () => closeModal(),
                onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
                onCancel: () => closeModal(),
              });
            }

          } else {
            // ═══════════════════════════════════════════════
            // EXPECTED RESULTS COMPOSITE — original logic
            // ═══════════════════════════════════════════════

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
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
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
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
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
              if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');

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
                      s, projectData, projectData[s], language, signal
                    );
                  } else {
                    const genMode = action === 'generate' ? 'regenerate' : action;
                    generatedData = await generateSectionContent(
                      s, projectData, language, genMode, null, signal
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
                  if (e.name === 'AbortError') throw e;

                  const emsg = e.message || '';
                  const isRateLimit = emsg.includes('429') || emsg.includes('Quota') || emsg.includes('rate limit') || emsg.includes('RESOURCE_EXHAUSTED');

                  if (isRateLimit && retries < maxRetries) {
                    retries++;
                    const waitSeconds = retries * 20;
                    console.warn(`[runComposite] Rate limit on ${s}, retry ${retries}/${maxRetries} in ${waitSeconds}s...`);
                    for (let countdown = waitSeconds; countdown > 0; countdown--) {
                      if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
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
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker je bil dosežen limit AI ponudnika.\n\nPočakajte 1–2 minuti in poskusite ponovno, ali preklopite na drug model v Nastavitvah.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to AI provider rate limits.\n\nWait 1–2 minutes and try again, or switch models in Settings.`;
              } else if (isCredits) {
                modalTitle = language === 'si' ? 'Nezadostna sredstva AI' : 'Insufficient AI Credits';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker vaš AI ponudnik nima dovolj sredstev.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to insufficient AI credits.`;
              } else if (isJSON) {
                modalTitle = language === 'si' ? 'Napaka formata' : 'Format Error';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker je AI vrnil nepravilen format.\n\nPoskusite ponovno.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated because the AI returned an invalid format.\n\nPlease try again.`;
              } else if (isNetwork) {
                modalTitle = language === 'si' ? 'Omrežna napaka' : 'Network Error';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati zaradi omrežne napake.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to a network error.`;
              } else {
                modalTitle = language === 'si' ? 'Delna generacija' : 'Partial Generation';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated.`;
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
          }

        } catch (e: any) {
          if (e.name !== 'AbortError') {
            handleAIError(e, `compositeGeneration(${compositeSectionKey})`);
          }
        } finally {
          setIsLoading(false);
          isGeneratingRef.current = false;
          abortControllerRef.current = null;
        }
      };

  // ── Translation vs Generation decision ──
      const sectionLabel = isActivities
        ? (language === 'si' ? 'Aktivnosti' : 'Activities')
        : (language === 'si' ? 'Rezultati' : 'Results');

      if (isActivities) {
        // ★ FIX: For activities composite, skip "other language" check entirely.
        // Activities composite generates 5 interdependent sections — translation 
        // is not meaningful. Always offer generate options directly.
        if (hasContentInSections) {
          show3OptionModal(
            () => runComposite('enhance'),
            () => runComposite('fill'),
            () => runComposite('regenerate')
          );
        } else {
          runComposite('regenerate');
        }
        return;
      }

      // ── expectedResults: keep translation logic ──
      if (otherLangData && !hasContentInSections) {
        setModalConfig({
          isOpen: true,
          title: language === 'si'
            ? `${sectionLabel} obstajajo v ${otherLang}`
            : `${sectionLabel} exist in ${otherLang}`,
          message: language === 'si'
            ? `${sectionLabel} že obstajajo v ${otherLang} jeziku. Želite prevesti ali generirati na novo?`
            : `${sectionLabel} already exist in ${otherLang}. Would you like to translate or generate new?`,
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
            ? `${sectionLabel} obstajajo v obeh jezikih`
            : `${sectionLabel} exist in both languages`,
          message: language === 'si'
            ? `${sectionLabel} obstajajo v slovenščini in angleščini. Kaj želite storiti?`
            : `${sectionLabel} exist in both SI and EN. What would you like to do?`,
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
      preGenerationGuard,
      currentProjectId,
    ]
  );
  // ─── Single field generation ───────────────────────────────────
  // ★ v7.5: AbortController support

  const handleGenerateField = useCallback(
    async (path: (string | number)[]) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const fieldName = path[path.length - 1];
      setIsLoading(`${t.generating} ${String(fieldName)}...`);
      setError(null);

      // ★ v7.5: Create abort controller for field generation
      const fieldAbort = new AbortController();
      abortControllerRef.current = fieldAbort;

      try {
        const fieldPathStr = path.map(String).join('.');
        console.log('[handleGenerateField] ▶ fieldPathStr:', fieldPathStr);
        const content = await generateFieldContent(fieldPathStr, projectData, language, fieldAbort.signal);
        console.log('[handleGenerateField] ◀ content:', JSON.stringify(content).substring(0, 300), '| type:', typeof content, '| length:', content?.length);
        handleUpdateData(path, content);
        console.log('[handleGenerateField] ✅ handleUpdateData DONE');

        // ★ EXPLICIT SAVE — field generation must persist immediately
        try {
          if (currentProjectId) {
            const updatedData = set(projectData, path, content);
            await storageService.saveProject(updatedData, language, currentProjectId);
            console.log('[handleGenerateField] ★ Explicit save — SUCCESS');
          }
        } catch (saveErr) {
          console.error('[handleGenerateField] ★ Explicit save failed:', saveErr);
        }

      } catch (e: any) {
        if (e.name !== 'AbortError') {

          handleAIError(e, `generateField(${String(fieldName)})`);
        }

      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;  // ★ v7.5
      }
    },
    [ensureApiKey, projectData, language, t, handleUpdateData, setIsSettingsOpen, handleAIError, currentProjectId]
  );

  // ─── Summary generation ────────────────────────────────────────
  // ★ v7.5: AbortController support

  const runSummaryGeneration = useCallback(async () => {
    setIsGeneratingSummary(true);
    setSummaryText('');

    // ★ v7.5: Create abort controller for summary
    const summaryAbort = new AbortController();
    abortControllerRef.current = summaryAbort;

    try {
      const text = await generateProjectSummary(projectData, language, summaryAbort.signal);
      setSummaryText(text);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setSummaryText(
          language === 'si' ? 'Generiranje preklicano.' : 'Generation cancelled.'
        );
      } else {
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
      }
    } finally {
      setIsGeneratingSummary(false);
      abortControllerRef.current = null;  // ★ v7.5
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

  // ★ v7.5: cancelGeneration exported
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
    cancelGeneration,
  };
};
