// hooks/useAuth.ts
// ═══════════════════════════════════════════════════════════════
// Authentication hook — login, logout, session restoration, MFA check.
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

  // ─── MFA State ─────────────────────────────────────────────────
  const [needsMFAVerify, setNeedsMFAVerify] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // ─── Load custom logo from settings cache ──────────────────────
  const loadCustomLogo = useCallback(() => {
    const custom = storageService.getCustomLogo();
    setAppLogo(custom || BRAND_ASSETS.logoText);
  }, []);

  // ─── Check AAL level (MFA required?) ──────────────────────────
  const checkMFA = useCallback(async (): Promise<boolean> => {
    try {
      const { currentLevel, nextLevel } = await storageService.getAAL();
      if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
        const { totp } = await storageService.getMFAFactors();
        const verifiedFactor = totp.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');
        if (verifiedFactor) {
          setMfaFactorId(verifiedFactor.id);
          setNeedsMFAVerify(true);
          return true;
        }
      }
    } catch (err) {
      console.warn('checkMFA error:', err);
    }
    setNeedsMFAVerify(false);
    setMfaFactorId(null);
    return false;
  }, []);

  // ─── Restore session on mount ──────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const email = await storageService.restoreSession();
      if (email) {
        const mfaNeeded = await checkMFA();
        if (!mfaNeeded) {
          setCurrentUser(email);
          loadCustomLogo();
        }
      }
    };
    restoreSession();
  }, [loadCustomLogo, checkMFA]);

  // ─── Check API key (uses ensureSettingsLoaded instead of loadSettings) ─
  // ★ FIX: Use ensureSettingsLoaded() instead of loadSettings()
  // This prevents overwriting the cache that register() just populated.
  const checkApiKey = useCallback(async () => {
    await storageService.ensureSettingsLoaded();
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
  const handleLoginSuccess = useCallback(async (username: string) => {
    const mfaNeeded = await checkMFA();
    if (mfaNeeded) {
      return;
    }
    setCurrentUser(username);
    setTimeout(() => {
      loadCustomLogo();
    }, 100);
  }, [loadCustomLogo, checkMFA]);

  // ─── MFA Verified ──────────────────────────────────────────────
  const handleMFAVerified = useCallback(() => {
    setNeedsMFAVerify(false);
    setMfaFactorId(null);
    const email = storageService.getCurrentUser();
    if (email) {
      setCurrentUser(email);
      loadCustomLogo();
    }
  }, [loadCustomLogo]);

  // ─── Logout ────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await storageService.logout();
    setCurrentUser(null);
    setIsWarningDismissed(false);
    setAppLogo(BRAND_ASSETS.logoText);
    setNeedsMFAVerify(false);
    setMfaFactorId(null);
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
    // MFA
    needsMFAVerify,
    mfaFactorId,
    handleMFAVerified,
  };
};
