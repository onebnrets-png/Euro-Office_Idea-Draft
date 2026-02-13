// hooks/useAuth.ts
// ═══════════════════════════════════════════════════════════════
// Authentication hook — login, logout, session restoration.
//
// NOTE: handleLogout requires a callback to reset project state,
// which is injected via the onLogoutCleanup parameter.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService.ts';
import { hasValidApiKey } from '../services/geminiService.ts';
import { BRAND_ASSETS } from '../constants.tsx';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showAiWarning, setShowAiWarning] = useState(false);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [appLogo, setAppLogo] = useState(BRAND_ASSETS.logoText);

  // ─── Load custom logo from settings cache ──────────────────────
  const loadCustomLogo = useCallback(() => {
    const custom = storageService.getCustomLogo();
    setAppLogo(custom || BRAND_ASSETS.logoText);
  }, []);

  // ─── Restore session on mount ──────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const email = await storageService.restoreSession();
      if (email) {
        setCurrentUser(email);
        // restoreSession() already calls loadSettings() internally,
        // so cachedSettings is populated — now load the logo.
        loadCustomLogo();
      }
    };
    restoreSession();
  }, [loadCustomLogo]);

  // ─── Check API key ─────────────────────────────────────────────
  const checkApiKey = useCallback(async () => {
    await storageService.loadSettings();
    if (!hasValidApiKey()) {
      setShowAiWarning(true);
    } else {
      setShowAiWarning(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      checkApiKey();
    }
  }, [currentUser, checkApiKey]);

  // ─── Login ─────────────────────────────────────────────────────
  const handleLoginSuccess = useCallback((username: string) => {
    setCurrentUser(username);
    // Settings are loaded during login (storageService.login calls loadSettings),
    // so we can load the custom logo immediately.
    // Small timeout to ensure settings cache is populated after login completes.
    setTimeout(() => {
      loadCustomLogo();
    }, 100);
  }, [loadCustomLogo]);

  // ─── Logout ────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await storageService.logout();
    setCurrentUser(null);
    setIsWarningDismissed(false);
    setAppLogo(BRAND_ASSETS.logoText);
  }, []);

  // ─── Dismiss warning ───────────────────────────────────────────
  const dismissWarning = useCallback(() => {
    setIsWarningDismissed(true);
  }, []);

  // ─── Computed ──────────────────────────────────────────────────
  const shouldShowBanner = showAiWarning && !isWarningDismissed;

  // ─── Ensure API key (returns boolean, caller opens settings) ───
  const ensureApiKey = useCallback((): boolean => {
    if (showAiWarning || !hasValidApiKey()) {
      return false;
    }
    return true;
  }, [showAiWarning]);

  return {
    currentUser,
    appLogo,
    showAiWarning,
    shouldShowBanner,
    handleLoginSuccess,
    handleLogout,
    checkApiKey,
    loadCustomLogo,
    dismissWarning,
    ensureApiKey,
  };
};
