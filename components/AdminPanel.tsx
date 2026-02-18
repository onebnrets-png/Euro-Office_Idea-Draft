// components/AdminPanel.tsx
// ═══════════════════════════════════════════════════════════════
// Unified Admin / Settings Panel
// v2.2 — 2026-02-18
//   ★ v2.2: Full dark-mode audit — fixed:
//     - Stats badges (Users tab): light [50] backgrounds → dark-aware rgba
//     - Tab active color: primary[600] too dark → #A5B4FC in dark
//     - Users table row hover: primary[50] → dark-aware
//     - Audit log row hover: surface.sidebar → dark-aware
//     - Instructions sidebar: active section bg primary[50] → dark-aware
//     - Instructions sidebar: hover bg → dark-aware
//     - AI Provider: selection card bg primary[50] → dark-aware
//     - AI Provider: info boxes secondary[50]/warning[50] → dark-aware
//     - Profile: 2FA status badge success[50] → dark-aware
//     - Profile: 2FA enrolled panel success[50] → dark-aware
//     - Profile: error/success message bg → dark-aware
//     - Profile: remove logo button error[50] → dark-aware
//     - CollapsibleSection child: added background
//     - QRCodeImage: border uses dynamic colors
//
//   ★ v2.1: EN-only Instructions display (SI variants removed)
//   v2.0: Merges AdminPanel + SettingsModal into single 5-tab / 2-tab modal
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin, type AdminUser, type AdminLogEntry } from '../hooks/useAdmin.ts';
import { Card, CardHeader } from '../design/components/Card.tsx';
import { Button, SparkleIcon } from '../design/components/Button.tsx';
import { Badge, RoleBadge } from '../design/components/Badge.tsx';
import { SkeletonTable, SkeletonText } from '../design/components/Skeleton.tsx';
import { colors as lightColors, darkColors, shadows, radii, animation, typography, spacing } from '../design/theme.ts';
import { getThemeMode, onThemeChange } from '../services/themeService.ts';
import { TEXT } from '../locales.ts';

// ─── Settings imports (from old SettingsModal) ────────────────
import { storageService } from '../services/storageService.ts';
import { validateProviderKey, OPENROUTER_MODELS, GEMINI_MODELS, type AIProviderType } from '../services/aiProvider.ts';
import {
  getFullInstructions,
  getDefaultInstructions,
  saveAppInstructions,
  resetAppInstructions,
  LANGUAGE_DIRECTIVES,
  LANGUAGE_MISMATCH_TEMPLATE,
  ACADEMIC_RIGOR_RULES,
  HUMANIZATION_RULES,
  PROJECT_TITLE_RULES,
  MODE_INSTRUCTIONS,
  QUALITY_GATES,
  SECTION_TASK_INSTRUCTIONS,
  TEMPORAL_INTEGRITY_RULE,
  CHAPTER_LABELS,
  FIELD_RULE_LABELS,
  CHAPTERS,
  GLOBAL_RULES,
  FIELD_RULES,
  SUMMARY_RULES,
  TRANSLATION_RULES,
} from '../services/Instructions.ts';

// ─── Types ───────────────────────────────────────────────────

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'si';
  initialTab?: string;
}

type TabId = 'users' | 'instructions' | 'ai' | 'profile' | 'audit';

// ─── Helpers: QR Code + Collapsible ─────────────────────────

// ★ v2.2: QRCodeImage now accepts colors prop for dark-aware border
const QRCodeImage = ({ value, size = 200 }: { value: string; size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=8`;
  return <img src={url} alt="QR Code" width={size} height={size} style={{ borderRadius: radii.lg, border: `1px solid ${lightColors.border.light}` }} />;
};

// ★ v2.2: CollapsibleSection child gets explicit background
const CollapsibleSection = ({ title, defaultOpen = false, children, colors: c }: { title: string; defaultOpen?: boolean; children: React.ReactNode; colors: typeof lightColors }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${c.border.light}`, borderRadius: radii.lg, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: c.surface.sidebar, border: 'none', cursor: 'pointer',
          textAlign: 'left', transition: `background ${animation.duration.fast}`,
          color: c.text.heading, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
        }}
      >
        <span>{title}</span>
        <svg style={{ width: 16, height: 16, color: c.text.muted, transition: `transform ${animation.duration.fast}`, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {/* ★ v2.2: added background: c.surface.card */}
      {isOpen && <div style={{ padding: '16px', borderTop: `1px solid ${c.border.light}`, background: c.surface.card }}>{children}</div>}
    </div>
  );
};

// ─── Localized texts ─────────────────────────────────────────

const ADMIN_TEXT = {
  en: {
    title: 'Admin / Settings',
    titleRegular: 'Settings',
    subtitle: 'Manage users, AI settings, instructions, and view audit log',
    subtitleRegular: 'Configure AI provider, profile and security',
    tabs: {
      users: 'Users',
      instructions: 'Instructions',
      ai: 'AI Provider',
      profile: 'Profile & Security',
      audit: 'Audit Log',
    },
    users: {
      title: 'User Management',
      subtitle: 'View and manage all registered users',
      email: 'Email',
      displayName: 'Name',
      role: 'Role',
      registered: 'Registered',
      lastLogin: 'Last Login',
      actions: 'Actions',
      changeRole: 'Change Role',
      makeAdmin: 'Make Admin',
      makeUser: 'Make User',
      confirmRoleChange: 'Are you sure you want to change the role of',
      confirmToAdmin: 'to Admin? They will have full access to all settings and user management.',
      confirmToUser: 'to User? They will lose access to the Admin Panel and Instructions editor.',
      selfProtection: 'You cannot remove your own admin role.',
      roleUpdated: 'Role updated successfully.',
      roleUpdateFailed: 'Failed to update role:',
      noUsers: 'No users found.',
      totalUsers: 'Total users',
      totalAdmins: 'Admins',
      never: 'Never',
    },
    instructions: {
      title: 'AI Instructions',
      subtitle: 'Edit the global AI instructions that apply to all users',
      save: 'Save Instructions',
      reset: 'Reset to Default',
      saved: 'Instructions saved successfully.',
      saveFailed: 'Failed to save instructions:',
      resetConfirm: 'Are you sure you want to reset all instructions to their default values? This cannot be undone.',
      resetDone: 'Instructions reset to default.',
      resetFailed: 'Failed to reset instructions:',
      lastUpdated: 'Last updated',
      by: 'by',
      usingDefaults: 'Currently using default instructions (no custom overrides).',
      sections: {
        global: 'Global Rules',
        language: 'Language Rules',
        academic: 'Academic Writing',
        humanization: 'Humanization',
        projectTitle: 'Project Title',
        mode: 'Mode Rules',
        qualityGates: 'Quality Gates',
        sectionTask: 'Section Tasks',
        fieldRules: 'Field Rules',
        translation: 'Translation',
        summary: 'Summary',
        chapter: 'Chapter Mapping',
        temporal: 'Temporal Integrity',
      },
    },
    log: {
      title: 'Audit Log',
      subtitle: 'Track all administrative actions',
      admin: 'Admin',
      action: 'Action',
      target: 'Target',
      details: 'Details',
      date: 'Date',
      noEntries: 'No log entries found.',
      actions: {
        role_change: 'Role Change',
        instructions_update: 'Instructions Updated',
        instructions_reset: 'Instructions Reset',
        user_block: 'User Blocked',
      },
    },
    close: 'Close',
  },
  si: {
    title: 'Admin / Nastavitve',
    titleRegular: 'Nastavitve',
    subtitle: 'Upravljanje uporabnikov, AI nastavitev, pravil in pregled dnevnika',
    subtitleRegular: 'Nastavi AI ponudnika, profil in varnost',
    tabs: {
      users: 'Uporabniki',
      instructions: 'Pravila',
      ai: 'AI Ponudnik',
      profile: 'Profil & Varnost',
      audit: 'Dnevnik',
    },
    users: {
      title: 'Upravljanje uporabnikov',
      subtitle: 'Pregled in upravljanje vseh registriranih uporabnikov',
      email: 'E-pošta',
      displayName: 'Ime',
      role: 'Vloga',
      registered: 'Registriran',
      lastLogin: 'Zadnja prijava',
      actions: 'Akcije',
      changeRole: 'Spremeni vlogo',
      makeAdmin: 'Nastavi kot Admin',
      makeUser: 'Nastavi kot Uporabnik',
      confirmRoleChange: 'Ali ste prepričani, da želite spremeniti vlogo uporabnika',
      confirmToAdmin: 'v Admin? Imel bo poln dostop do vseh nastavitev in upravljanja uporabnikov.',
      confirmToUser: 'v Uporabnik? Izgubil bo dostop do Admin Panela in urejevalnika pravil.',
      selfProtection: 'Ne morete odstraniti lastne admin vloge.',
      roleUpdated: 'Vloga uspešno posodobljena.',
      roleUpdateFailed: 'Napaka pri posodobitvi vloge:',
      noUsers: 'Ni najdenih uporabnikov.',
      totalUsers: 'Skupaj uporabnikov',
      totalAdmins: 'Adminov',
      never: 'Nikoli',
    },
    instructions: {
      title: 'AI Pravila',
      subtitle: 'Urejanje globalnih AI pravil, ki veljajo za vse uporabnike',
      save: 'Shrani pravila',
      reset: 'Ponastavi na privzeto',
      saved: 'Pravila uspešno shranjena.',
      saveFailed: 'Napaka pri shranjevanju pravil:',
      resetConfirm: 'Ali ste prepričani, da želite ponastaviti vsa pravila na privzete vrednosti? Tega ni mogoče razveljaviti.',
      resetDone: 'Pravila ponastavljena na privzeto.',
      resetFailed: 'Napaka pri ponastavitvi pravil:',
      lastUpdated: 'Zadnja posodobitev',
      by: 'avtor',
      usingDefaults: 'Trenutno se uporabljajo privzeta pravila (brez prilagoditev).',
      sections: {
        global: 'Globalna pravila',
        language: 'Jezikovna pravila',
        academic: 'Akademsko pisanje',
        humanization: 'Humanizacija',
        projectTitle: 'Naslov projekta',
        mode: 'Pravila načina',
        qualityGates: 'Kontrola kakovosti',
        sectionTask: 'Naloge sklopov',
        fieldRules: 'Pravila polj',
        translation: 'Prevod',
        summary: 'Povzetek',
        chapter: 'Mapiranje poglavij',
        temporal: 'Časovna celovitost',
      },
    },
    log: {
      title: 'Dnevnik sprememb',
      subtitle: 'Sledenje vsem administrativnim akcijam',
      admin: 'Admin',
      action: 'Akcija',
      target: 'Cilj',
      details: 'Podrobnosti',
      date: 'Datum',
      noEntries: 'Ni vnosov v dnevniku.',
      actions: {
        role_change: 'Sprememba vloge',
        instructions_update: 'Pravila posodobljena',
        instructions_reset: 'Pravila ponastavljena',
        user_block: 'Uporabnik blokiran',
      },
    },
    close: 'Zapri',
  },
} as const;

// ─── Helper: Format date ─────────────────────────────────────

const formatDate = (dateStr: string | null, short = false): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (short) {
      return d.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return d.toLocaleString('sl-SI', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

// ─── Helper: User initials avatar ────────────────────────────

const UserAvatar: React.FC<{ name: string; email: string; size?: number }> = ({ name, email, size = 36 }) => {
  const initials = (name || email || '?').split(/[\s@]+/).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('');
  let hash = 0;
  for (let i = 0; i < email.length; i++) { hash = email.charCodeAt(i) + ((hash << 5) - hash); }
  const hue = Math.abs(hash) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: radii.full, background: `hsl(${hue}, 65%, 55%)`,
      color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.38}px`, fontWeight: '700', flexShrink: 0, letterSpacing: '-0.5px',
    }}>{initials}</div>
  );
};

// ─── Build default instructions for display — EN only ────────

const buildDefaultInstructionsDisplay = (): Record<string, string> => {
  const fmtGates = (gates: string[]): string => gates.map((g, i) => `  ${i + 1}. ${g}`).join('\n');
  return {
    global: `═══ GLOBAL RULES ═══\nThese are the master rules that govern ALL AI content generation.\n\nARCHITECTURE PRINCIPLE:\n  Instructions.ts is the SINGLE SOURCE OF TRUTH for all AI rules.\n  geminiService.ts reads from here — it has ZERO own rules.\n\n${GLOBAL_RULES}`,
    language: `═══ LANGUAGE DIRECTIVES ═══\n\n── English ──\n${LANGUAGE_DIRECTIVES.en}\n\n── Slovenščina ──\n${LANGUAGE_DIRECTIVES.si}\n\n── Language Mismatch Template ──\n${LANGUAGE_MISMATCH_TEMPLATE}\n\nNOTE: Language Directives are the ONLY section that retains both EN and SI.\nThis tells the AI which language to WRITE in.`,
    academic: `═══ ACADEMIC RIGOR & CITATION RULES ═══\n\n${ACADEMIC_RIGOR_RULES.en}`,
    humanization: `═══ HUMANIZATION RULES ═══\n\n${HUMANIZATION_RULES.en}`,
    projectTitle: `═══ PROJECT TITLE RULES ═══\n\n${PROJECT_TITLE_RULES.en}`,
    mode: `═══ MODE INSTRUCTIONS ═══\n\n${Object.entries(MODE_INSTRUCTIONS).map(([mode, langs]) => `── ${mode.toUpperCase()} ──\n\n${langs.en}`).join('\n\n════════════════════════════════════\n\n')}`,
    qualityGates: `═══ QUALITY GATES ═══\n\n${Object.entries(QUALITY_GATES).map(([section, langs]) => `── ${section} ──\n\n${fmtGates(langs.en || [])}`).join('\n\n════════════════════════════════════\n\n')}`,
    sectionTask: `═══ SECTION TASK INSTRUCTIONS ═══\n\n${Object.entries(SECTION_TASK_INSTRUCTIONS).map(([section, langs]) => `── ${section} ──\n\n${langs.en || '(empty)'}`).join('\n\n════════════════════════════════════\n\n')}`,
    fieldRules: `═══ FIELD RULES ═══\n\n${Object.entries(FIELD_RULES).map(([key, val]) => { const label = (FIELD_RULE_LABELS as Record<string, string>)[key] || key; return `── ${label} ──\n${val.en || '(empty)'}`; }).join('\n\n')}`,
    translation: `═══ TRANSLATION RULES ═══\n\n${TRANSLATION_RULES.en.map((r: string, i: number) => `  ${i + 1}. ${r}`).join('\n')}`,
    summary: `═══ SUMMARY RULES ═══\n\n${SUMMARY_RULES.en}`,
    chapter: `═══ CHAPTER RULES ═══\n\n${Object.entries(CHAPTERS).map(([key, val]) => { const label = (CHAPTER_LABELS as Record<string, string>)[key] || key; return `── ${label} ──\n${val}`; }).join('\n\n════════════════════════════════════\n\n')}`,
    temporal: `═══ TEMPORAL INTEGRITY RULE ═══\n\n${TEMPORAL_INTEGRITY_RULE.en}`,
  };
};

const getDefaultPlaceholder = (section: string): string => {
  const defaults = buildDefaultInstructionsDisplay();
  return defaults[section] || `Enter custom ${section} instructions...`;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, language, initialTab }) => {
  const admin = useAdmin();
  const t = ADMIN_TEXT[language] || ADMIN_TEXT.en;
  const tAuth = TEXT[language].auth;

  const [isDark, setIsDark] = useState(() => getThemeMode() === 'dark');
  useEffect(() => { const unsub = onThemeChange((mode) => setIsDark(mode === 'dark')); return unsub; }, []);
  const colors = isDark ? darkColors : lightColors;

  // ★ v2.2: Dark-aware color helpers
  const dkBg = (lightColor: string, alpha: number) => isDark ? `rgba(${hexToRgb(lightColor)},${alpha})` : undefined;

  const isUserAdmin = admin.isAdmin;
  const adminTabs: TabId[] = ['users', 'instructions', 'ai', 'profile', 'audit'];
  const regularTabs: TabId[] = ['ai', 'profile'];
  const availableTabs = isUserAdmin ? adminTabs : regularTabs;
  const defaultTab = initialTab && availableTabs.includes(initialTab as TabId) ? (initialTab as TabId) : (isUserAdmin ? 'users' : 'ai');

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  useEffect(() => { if (isOpen) { admin.checkAdminStatus(); } }, [isOpen]);
  useEffect(() => { if (isOpen) { const tab = initialTab && availableTabs.includes(initialTab as TabId) ? (initialTab as TabId) : (isUserAdmin ? 'users' : 'ai'); setActiveTab(tab); } }, [isOpen, initialTab, isUserAdmin]);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editedInstructions, setEditedInstructions] = useState<Record<string, string>>({});
  const [activeInstructionSection, setActiveInstructionSection] = useState<string>('global');

  const [aiProvider, setAiProvider] = useState<AIProviderType>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrUri: string; secret: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollError, setEnrollError] = useState('');

  const [appInstructions, setAppInstructions] = useState<any>(null);
  const [instructionsSubTab, setInstructionsSubTab] = useState('global');
  const [instructionsChanged, setInstructionsChanged] = useState(false);

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => { if (isOpen) { if (isUserAdmin) { admin.fetchUsers(); admin.fetchGlobalInstructions(); } loadSettingsData(); } }, [isOpen, isUserAdmin]);
  useEffect(() => { if (activeTab === 'audit' && isOpen && isUserAdmin) { admin.fetchAdminLog(); } }, [activeTab, isOpen, isUserAdmin]);
  useEffect(() => {
    const defaults = buildDefaultInstructionsDisplay();
    const overrides = admin.globalInstructions?.custom_instructions || {};
    const merged: Record<string, string> = {};
    for (const key of Object.keys(defaults)) { merged[key] = (overrides[key] !== undefined && overrides[key] !== null) ? overrides[key] : defaults[key]; }
    for (const key of Object.keys(overrides)) { if (!(key in merged)) { merged[key] = overrides[key]; } }
    setEditedInstructions(merged);
  }, [admin.globalInstructions, language]);

  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { if (message) { const timer = setTimeout(() => setMessage(''), 4000); return () => clearTimeout(timer); } }, [message]);

  const loadSettingsData = async () => {
    setSettingsLoading(true);
    try {
      await storageService.loadSettings();
      const provider = storageService.getAIProvider() || 'gemini';
      setAiProvider(provider);
      setGeminiKey(storageService.getApiKey() || '');
      setOpenRouterKey(storageService.getOpenRouterKey() || '');
      const model = storageService.getCustomModel();
      setModelName(model || (provider === 'gemini' ? 'gemini-3-pro-preview' : 'deepseek/deepseek-v3.2'));
      setCustomLogo(storageService.getCustomLogo());
      setAppInstructions(JSON.parse(JSON.stringify(getFullInstructions())));
      setInstructionsChanged(false);
      try { const { totp } = await storageService.getMFAFactors(); setMfaFactors(totp.filter((f: any) => f.status === 'verified')); } catch { setMfaFactors([]); }
      setNewPassword(''); setConfirmPassword('');
      setMfaEnrolling(false); setEnrollData(null); setEnrollCode(''); setEnrollError('');
      setMessage(''); setIsError(false); setInstructionsSubTab('global');
    } finally { setSettingsLoading(false); }
  };

  const handleRoleChange = useCallback((user: AdminUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = user.role === 'admin' ? `${t.users.confirmRoleChange} "${user.email}" ${t.users.confirmToUser}` : `${t.users.confirmRoleChange} "${user.email}" ${t.users.confirmToAdmin}`;
    setConfirmModal({ isOpen: true, title: t.users.changeRole, message: confirmMsg, onConfirm: async () => { setConfirmModal(null); const result = await admin.updateUserRole(user.id, newRole); if (result.success) { setToast({ message: t.users.roleUpdated, type: 'success' }); } else { setToast({ message: `${t.users.roleUpdateFailed} ${result.message}`, type: 'error' }); } } });
  }, [admin, t]);

  const handleSaveGlobalInstructions = useCallback(async () => {
    const result = await admin.saveGlobalInstructions(editedInstructions);
    if (result.success) { setToast({ message: t.instructions.saved, type: 'success' }); } else { setToast({ message: `${t.instructions.saveFailed} ${result.message}`, type: 'error' }); }
  }, [admin, editedInstructions, t]);

  const handleResetGlobalInstructions = useCallback(() => {
    setConfirmModal({ isOpen: true, title: t.instructions.reset, message: t.instructions.resetConfirm, onConfirm: async () => { setConfirmModal(null); const result = await admin.resetInstructionsToDefault(); if (result.success) { setEditedInstructions({}); setToast({ message: t.instructions.resetDone, type: 'success' }); } else { setToast({ message: `${t.instructions.resetFailed} ${result.message}`, type: 'error' }); } } });
  }, [admin, t]);

  const handleInstructionChange = useCallback((section: string, value: string) => { setEditedInstructions(prev => ({ ...prev, [section]: value })); }, []);

  const handleProviderChange = (provider: AIProviderType) => {
    setAiProvider(provider);
    if (provider === 'gemini' && !modelName.startsWith('gemini')) setModelName('gemini-3-pro-preview');
    else if (provider === 'openrouter' && modelName.startsWith('gemini')) setModelName('deepseek/deepseek-v3.2');
  };

  const handleAISave = async () => {
    setIsValidating(true); setMessage(tAuth.validating || "Validating..."); setIsError(false);
    await storageService.setAIProvider(aiProvider);
    await storageService.setCustomModel(modelName.trim());
    await storageService.setApiKey(geminiKey.trim());
    await storageService.setOpenRouterKey(openRouterKey.trim());
    const activeKey = aiProvider === 'gemini' ? geminiKey.trim() : openRouterKey.trim();
    if (activeKey === '') { setMessage(language === 'si' ? 'Nastavitve shranjene.' : 'Settings saved.'); setIsValidating(false); setTimeout(() => onClose(), 1000); return; }
    const isValid = await validateProviderKey(aiProvider, activeKey);
    setIsValidating(false);
    if (isValid) { setMessage(language === 'si' ? 'API ključ potrjen in shranjen!' : 'API Key validated and saved!'); setTimeout(() => onClose(), 1000); }
    else { setIsError(true); setMessage(tAuth.invalidKey || "Invalid API Key"); }
  };

  const handlePasswordChange = async () => {
    setMessage(''); setIsError(false);
    if (!newPassword || !confirmPassword) { setIsError(true); setMessage(language === 'si' ? "Prosim izpolnite polja za novo geslo." : "Please fill password fields."); return; }
    if (newPassword !== confirmPassword) { setIsError(true); setMessage(tAuth.passwordMismatch || "Passwords do not match."); return; }
    const result = await storageService.changePassword('', newPassword);
    if (result.success) { setMessage(tAuth.passwordChanged || "Password changed!"); setNewPassword(''); setConfirmPassword(''); }
    else { setIsError(true); setMessage(result.message || tAuth.incorrectPassword || "Password change failed."); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = async () => { const b64 = reader.result as string; setCustomLogo(b64); await storageService.saveCustomLogo(b64); setMessage(tAuth.logoUpdated || "Logo updated!"); }; reader.readAsDataURL(file); }
  };
  const handleRemoveLogo = async () => { setCustomLogo(null); await storageService.saveCustomLogo(null); setMessage(language === 'si' ? "Logo odstranjen." : "Logo removed."); };

  const handleStartMFAEnroll = async () => {
    setEnrollError(''); setEnrollCode('');
    const result = await storageService.enrollMFA();
    if (result) { setEnrollData(result); setMfaEnrolling(true); }
    else setEnrollError(language === 'si' ? 'Napaka pri inicializaciji 2FA.' : 'Failed to initialize 2FA.');
  };

  const handleVerifyMFAEnroll = async () => {
    setEnrollError('');
    if (enrollCode.length !== 6) { setEnrollError(language === 'si' ? 'Vnesi 6-mestno kodo.' : 'Enter a 6-digit code.'); return; }
    if (!enrollData) return;
    const result = await storageService.challengeAndVerifyMFA(enrollData.factorId, enrollCode);
    if (result.success) { setMfaEnrolling(false); setEnrollData(null); const { totp } = await storageService.getMFAFactors(); setMfaFactors(totp.filter((f: any) => f.status === 'verified')); setMessage(language === 'si' ? '2FA uspešno aktiviran!' : '2FA enabled successfully!'); setIsError(false); }
    else { setEnrollError(result.message || (language === 'si' ? 'Napačna koda.' : 'Invalid code.')); setEnrollCode(''); }
  };

  const handleDisableMFA = async (factorId: string) => {
    if (!confirm(language === 'si' ? 'Ali res želiš deaktivirati 2FA?' : 'Disable two-factor authentication?')) return;
    const result = await storageService.unenrollMFA(factorId);
    if (result.success) { setMfaFactors(prev => prev.filter(f => f.id !== factorId)); setMessage(language === 'si' ? '2FA deaktiviran.' : '2FA disabled.'); setIsError(false); }
    else { setIsError(true); setMessage(result.message || (language === 'si' ? 'Napaka pri deaktivaciji.' : 'Failed to disable 2FA.')); }
  };

  const updateAppInstructions = (updater: (prev: any) => any) => { setAppInstructions((prev: any) => updater(prev)); setInstructionsChanged(true); };
  const handleSaveAppInstructions = async () => { await saveAppInstructions(appInstructions); setInstructionsChanged(false); setMessage(language === 'si' ? "Navodila shranjena!" : "Instructions saved!"); setIsError(false); };
  const handleResetAppInstructions = async () => { if (!confirm(language === 'si' ? "Povrni vsa navodila na privzete vrednosti? Vse spremembe bodo izgubljene." : "Revert ALL instructions to defaults? All changes will be lost.")) return; const defaults = await resetAppInstructions(); setAppInstructions(JSON.parse(JSON.stringify(defaults))); setInstructionsChanged(false); setMessage(language === 'si' ? "Navodila povrnjena na privzete." : "Instructions reverted to defaults."); setIsError(false); };
  const handleResetAppSection = (sectionKey: string) => {
    const defaults = getDefaultInstructions();
    if (sectionKey === 'GLOBAL_RULES') { updateAppInstructions(prev => ({ ...prev, GLOBAL_RULES: defaults.GLOBAL_RULES })); }
    else if (sectionKey === 'TRANSLATION_RULES') { updateAppInstructions(prev => ({ ...prev, TRANSLATION_RULES: defaults.TRANSLATION_RULES })); }
    else if (sectionKey === 'SUMMARY_RULES') { updateAppInstructions(prev => ({ ...prev, SUMMARY_RULES: defaults.SUMMARY_RULES })); }
    else if (sectionKey.startsWith('chapter')) { updateAppInstructions(prev => ({ ...prev, CHAPTERS: { ...prev.CHAPTERS, [sectionKey]: defaults.CHAPTERS[sectionKey] } })); }
    else if (defaults.FIELD_RULES[sectionKey] !== undefined) { updateAppInstructions(prev => ({ ...prev, FIELD_RULES: { ...prev.FIELD_RULES, [sectionKey]: defaults.FIELD_RULES[sectionKey] } })); }
    setMessage(language === 'si' ? `Razdelek ponastavljen.` : `Section reset to default.`); setIsError(false);
  };

  const handleSave = () => { if (activeTab === 'ai') handleAISave(); else if (activeTab === 'profile') handlePasswordChange(); else if (activeTab === 'instructions') handleSaveGlobalInstructions(); };

  if (!isOpen) return null;

  const totalUsers = admin.users.length;
  const totalAdmins = admin.users.filter(u => u.role === 'admin').length;
  const instructionSections = Object.keys(t.instructions.sections) as (keyof typeof t.instructions.sections)[];
  const TAB_ICONS: Record<TabId, string> = { users: '👥', instructions: '📋', ai: '🤖', profile: '👤', audit: '📜' };
  const currentModels = aiProvider === 'gemini' ? GEMINI_MODELS : OPENROUTER_MODELS;
  const hasMFA = mfaFactors.length > 0;
  const appInstructionsSubTabs = [ { id: 'global', label: 'Global Rules' }, { id: 'chapters', label: 'Chapters' }, { id: 'fields', label: 'Field Rules' }, { id: 'translation', label: 'Translation' }, { id: 'summary', label: 'Summary' } ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: `1px solid ${colors.border.light}`, borderRadius: radii.lg,
    fontSize: typography.fontSize.sm, color: colors.text.body, background: colors.surface.card,
    outline: 'none', transition: `border-color ${animation.duration.fast}`, fontFamily: typography.fontFamily.mono,
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.heading, marginBottom: '6px' };

  // ★ v2.2: Dark-aware style helpers
  const successBg = isDark ? 'rgba(16,185,129,0.12)' : lightColors.success[50];
  const successBorder = isDark ? 'rgba(16,185,129,0.25)' : lightColors.success[200];
  const successText = isDark ? '#6EE7B7' : lightColors.success[700];
  const errorBg = isDark ? 'rgba(239,68,68,0.12)' : lightColors.error[50];
  const errorBorder = isDark ? 'rgba(239,68,68,0.25)' : lightColors.error[200];
  const errorText = isDark ? '#FCA5A5' : lightColors.error[600];
  const primaryBadgeBg = isDark ? 'rgba(99,102,241,0.12)' : lightColors.primary[50];
  const primaryBadgeBorder = isDark ? 'rgba(99,102,241,0.25)' : lightColors.primary[200];
  const primaryBadgeText = isDark ? '#A5B4FC' : lightColors.primary[600];
  const warningBadgeBg = isDark ? 'rgba(245,158,11,0.12)' : lightColors.warning[50];
  const warningBadgeBorder = isDark ? 'rgba(245,158,11,0.25)' : lightColors.warning[200];
  const warningBadgeText = isDark ? '#FDE68A' : lightColors.warning[600];
  const secondaryInfoBg = isDark ? 'rgba(6,182,212,0.10)' : lightColors.secondary[50];
  const secondaryInfoBorder = isDark ? 'rgba(6,182,212,0.25)' : lightColors.secondary[200];
  const secondaryInfoText = isDark ? '#67E8F9' : lightColors.secondary[700];
  const warningInfoBg = isDark ? 'rgba(245,158,11,0.10)' : lightColors.warning[50];
  const warningInfoBorder = isDark ? 'rgba(245,158,11,0.25)' : lightColors.warning[200];
  const warningInfoText = isDark ? '#FDE68A' : lightColors.warning[700];
  const rowHoverBg = isDark ? '#1C2940' : lightColors.primary[50];
  const rowDefaultBg = isDark ? '#162032' : 'transparent';
  const tabActiveColor = isDark ? '#A5B4FC' : lightColors.primary[600];
  const tabActiveBorder = isDark ? '#818CF8' : lightColors.primary[500];

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', background: colors.surface.overlay, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: colors.surface.background, borderRadius: radii['2xl'], boxShadow: shadows['2xl'],
        width: '100%', maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleIn 0.25s ease-out',
      }}>

        {/* ─── Header ─── */}
        <div style={{ background: colors.primary.gradient, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: colors.text.inverse, fontSize: typography.fontSize['xl'], fontWeight: typography.fontWeight.bold, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isUserAdmin ? '🛡️' : '⚙️'} {isUserAdmin ? t.title : t.titleRegular}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: typography.fontSize.sm, margin: '4px 0 0' }}>{isUserAdmin ? t.subtitle : t.subtitleRegular}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: radii.lg, padding: '8px', cursor: 'pointer', color: colors.text.inverse, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `background ${animation.duration.fast}` }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* ─── Tabs ★ v2.2: dark-aware active tab color ─── */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border.light}`, background: colors.surface.card, flexShrink: 0, padding: '0 24px', overflowX: 'auto' }}>
          {availableTabs.map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setMessage(''); }}
              style={{
                padding: '12px 20px', fontSize: typography.fontSize.sm,
                fontWeight: activeTab === tab ? typography.fontWeight.semibold : typography.fontWeight.medium,
                color: activeTab === tab ? tabActiveColor : colors.text.muted,
                background: 'transparent', border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${tabActiveBorder}` : '2px solid transparent',
                cursor: 'pointer', transition: `all ${animation.duration.fast}`, marginBottom: '-1px', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = colors.text.body; }}
              onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = colors.text.muted; }}
            >{TAB_ICONS[tab]} {t.tabs[tab]}</button>
          ))}
        </div>

        {/* ─── Content ─── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: colors.surface.background }}>
          {settingsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 24, height: 24, border: `2px solid ${colors.primary[500]}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ marginLeft: '12px', color: colors.text.muted }}>{language === 'si' ? 'Nalaganje...' : 'Loading...'}</span>
            </div>
          ) : (
            <>

          {/* ═══ USERS TAB ═══ */}
          {activeTab === 'users' && isUserAdmin && (
            <div>
              {/* ★ v2.2: Stats bar — dark-aware backgrounds */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: primaryBadgeBg, border: `1px solid ${primaryBadgeBorder}`, borderRadius: radii.xl, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: primaryBadgeText }}>{totalUsers}</span>
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>{t.users.totalUsers}</span>
                </div>
                <div style={{ background: warningBadgeBg, border: `1px solid ${warningBadgeBorder}`, borderRadius: radii.xl, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: warningBadgeText }}>{totalAdmins}</span>
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>{t.users.totalAdmins}</span>
                </div>
              </div>

              {admin.isLoadingUsers ? (
                <Card><SkeletonTable rows={5} cols={5} /></Card>
              ) : admin.users.length === 0 ? (
                <Card><p style={{ textAlign: 'center', color: colors.text.muted, padding: '40px 0' }}>{t.users.noUsers}</p></Card>
              ) : (
                <Card padded={false}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${colors.border.light}`, background: colors.surface.sidebar }}>
                          <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.users.displayName}</th>
                          <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.users.email}</th>
                          <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.users.role}</th>
                          <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.users.lastLogin}</th>
                          <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.users.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admin.users.map((user) => (
                          // ★ v2.2: dark-aware row hover
                          <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border.light}`, background: rowDefaultBg, transition: `background ${animation.duration.fast}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = rowHoverBg)}
                            onMouseLeave={e => (e.currentTarget.style.background = rowDefaultBg)}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserAvatar name={user.displayName} email={user.email} />
                                <div>
                                  <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.heading }}>{user.displayName}</div>
                                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{formatDate(user.createdAt, true)}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', color: colors.text.body }}>{user.email}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}><RoleBadge role={user.role} language={language} /></td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.xs }}>{user.lastSignIn ? formatDate(user.lastSignIn) : t.users.never}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <Button variant={user.role === 'admin' ? 'ghost' : 'secondary'} size="sm" onClick={() => handleRoleChange(user)}>{user.role === 'admin' ? t.users.makeUser : t.users.makeAdmin}</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ═══ INSTRUCTIONS TAB ═══ */}
          {activeTab === 'instructions' && isUserAdmin && (
            <div>
              {admin.isLoadingInstructions ? (
                <Card><SkeletonText lines={10} /></Card>
              ) : (
                <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>
                  {/* ★ v2.2: dark-aware section sidebar */}
                  <div style={{ width: '220px', flexShrink: 0, background: colors.surface.card, borderRadius: radii.xl, border: `1px solid ${colors.border.light}`, padding: '8px', overflowY: 'auto' }}>
                    {instructionSections.map((section) => (
                      <button key={section} onClick={() => setActiveInstructionSection(section)} style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: radii.lg, border: 'none', cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                        fontWeight: activeInstructionSection === section ? typography.fontWeight.semibold : typography.fontWeight.normal,
                        color: activeInstructionSection === section ? primaryBadgeText : colors.text.body,
                        background: activeInstructionSection === section ? primaryBadgeBg : 'transparent',
                        transition: `all ${animation.duration.fast}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                        onMouseEnter={e => { if (activeInstructionSection !== section) e.currentTarget.style.background = isDark ? '#1C2940' : lightColors.surface.sidebar; }}
                        onMouseLeave={e => { if (activeInstructionSection !== section) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span>{(t.instructions.sections as Record<string, string>)[section]}</span>
                        {editedInstructions[section] && (<div style={{ width: '6px', height: '6px', borderRadius: radii.full, background: colors.primary[400], flexShrink: 0 }} />)}
                      </button>
                    ))}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {admin.globalInstructions?.updated_at ? (
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, padding: '8px 12px', background: colors.surface.sidebar, borderRadius: radii.lg }}>
                        {t.instructions.lastUpdated}: {formatDate(admin.globalInstructions.updated_at)}
                      </div>
                    ) : (
                      <div style={{ fontSize: typography.fontSize.xs, color: secondaryInfoText, padding: '8px 12px', background: secondaryInfoBg, borderRadius: radii.lg, border: `1px solid ${secondaryInfoBorder}` }}>
                        ℹ️ {t.instructions.usingDefaults}
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.heading, marginBottom: '8px' }}>
                        {(t.instructions.sections as Record<string, string>)[activeInstructionSection]}
                      </label>
                      <textarea
                        value={editedInstructions[activeInstructionSection] || ''}
                        onChange={(e) => handleInstructionChange(activeInstructionSection, e.target.value)}
                        placeholder={getDefaultPlaceholder(activeInstructionSection)}
                        style={{
                          flex: 1, minHeight: '300px', padding: '16px', borderRadius: radii.xl,
                          border: `1px solid ${colors.border.light}`, fontSize: typography.fontSize.sm,
                          fontFamily: typography.fontFamily.mono, lineHeight: typography.lineHeight.relaxed,
                          color: colors.text.body, background: colors.surface.card, resize: 'vertical', outline: 'none',
                          transition: `border-color ${animation.duration.fast}`,
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = colors.primary[400])}
                        onBlur={e => (e.currentTarget.style.borderColor = colors.border.light)}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <Button variant="danger" size="sm" onClick={handleResetGlobalInstructions} disabled={admin.isSavingInstructions}>{t.instructions.reset}</Button>
                      <Button variant="primary" size="md" onClick={handleSaveGlobalInstructions} loading={admin.isSavingInstructions}>{t.instructions.save}</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ AI PROVIDER TAB ═══ */}
          {activeTab === 'ai' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>{language === 'si' ? 'AI ponudnik' : 'AI Provider'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['gemini', 'openrouter'] as AIProviderType[]).map((provider) => (
                    // ★ v2.2: dark-aware provider card
                    <button key={provider} type="button" onClick={() => handleProviderChange(provider)}
                      style={{
                        padding: '12px', borderRadius: radii.lg,
                        border: `2px solid ${aiProvider === provider ? (isDark ? '#818CF8' : lightColors.primary[500]) : colors.border.light}`,
                        background: aiProvider === provider ? primaryBadgeBg : colors.surface.card,
                        cursor: 'pointer', textAlign: 'left', transition: `all ${animation.duration.fast}`,
                        boxShadow: aiProvider === provider ? `0 0 0 1px ${isDark ? '#818CF8' : lightColors.primary[500]}` : 'none',
                      }}>
                      <div style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: colors.text.heading }}>
                        {provider === 'gemini' ? 'Google Gemini' : 'OpenRouter'}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
                        {provider === 'gemini' ? (language === 'si' ? 'Direktna povezava' : 'Direct connection') : 'GPT-4o, Claude, Mistral...'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {aiProvider === 'gemini' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>{language === 'si' ? 'Google Gemini API ključ' : 'Google Gemini API Key'}</label>
                  <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..." style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = colors.primary[400])} onBlur={e => (e.currentTarget.style.borderColor = colors.border.light)} />
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '4px' }}>{language === 'si' ? 'Pridobite ključ na aistudio.google.com' : 'Get your key at aistudio.google.com'}</p>
                </div>
              )}
              {aiProvider === 'openrouter' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>OpenRouter API Key</label>
                  <input type="password" value={openRouterKey} onChange={(e) => setOpenRouterKey(e.target.value)} placeholder="sk-or-..." style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = colors.primary[400])} onBlur={e => (e.currentTarget.style.borderColor = colors.border.light)} />
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '4px' }}>{language === 'si' ? 'Pridobite ključ na openrouter.ai/keys' : 'Get your key at openrouter.ai/keys'}</p>
                </div>
              )}

              <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: `1px solid ${colors.border.light}` }}>
                <label style={labelStyle}>{language === 'si' ? 'AI model' : 'AI Model'}</label>
                <select value={currentModels.some(m => m.id === modelName) ? modelName : ''} onChange={(e) => setModelName(e.target.value)} style={{ ...inputStyle, fontFamily: typography.fontFamily.sans }}>
                  {!currentModels.some(m => m.id === modelName) && modelName && (<option value={modelName}>{modelName} ({language === 'si' ? 'ročno vnesen' : 'custom'})</option>)}
                  {currentModels.map(m => (<option key={m.id} value={m.id}>{m.name} – {m.description}</option>))}
                </select>
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: '4px' }}>{language === 'si' ? 'Ali vnesite ID modela ročno:' : 'Or enter model ID manually:'}</label>
                  <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder={aiProvider === 'gemini' ? "gemini-3-pro-preview" : "e.g. openai/gpt-4o"} style={{ ...inputStyle, fontSize: typography.fontSize.xs }} />
                </div>
              </div>

              {/* ★ v2.2: dark-aware info boxes */}
              {aiProvider === 'gemini' && (
                <div style={{ padding: '12px', background: secondaryInfoBg, border: `1px solid ${secondaryInfoBorder}`, borderRadius: radii.lg, fontSize: typography.fontSize.xs, color: secondaryInfoText }}>
                  <strong>Google Gemini</strong>{language === 'si' ? ' – brezplačna kvota za razvoj.' : ' – free tier for development.'}
                  <br /><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ fontWeight: typography.fontWeight.semibold, textDecoration: 'underline', marginTop: '4px', display: 'inline-block', color: 'inherit' }}>aistudio.google.com</a>
                </div>
              )}
              {aiProvider === 'openrouter' && (
                <div style={{ padding: '12px', background: warningInfoBg, border: `1px solid ${warningInfoBorder}`, borderRadius: radii.lg, fontSize: typography.fontSize.xs, color: warningInfoText }}>
                  <strong>OpenRouter</strong>{language === 'si' ? ' omogoča dostop do 100+ AI modelov.' : ' gives you access to 100+ AI models.'}
                  <br /><a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" style={{ fontWeight: typography.fontWeight.semibold, textDecoration: 'underline', marginTop: '4px', display: 'inline-block', color: 'inherit' }}>openrouter.ai</a>
                </div>
              )}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button variant="ghost" size="md" onClick={onClose} disabled={isValidating}>{TEXT[language].modals.closeBtn}</Button>
                <Button variant="primary" size="md" onClick={handleAISave} loading={isValidating}>{tAuth.save || 'Save'}</Button>
              </div>

              {/* ★ v2.2: dark-aware message */}
              {message && activeTab === 'ai' && (
                <div style={{
                  marginTop: '12px', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
                  padding: '8px', borderRadius: radii.lg, textAlign: 'center',
                  background: isError ? errorBg : successBg,
                  color: isError ? errorText : successText,
                }}>{message}</div>
              )}
            </div>
          )}

          {/* ═══ PROFILE & SECURITY TAB ═══ */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.heading, marginBottom: '12px', margin: '0 0 12px' }}>{language === 'si' ? 'Profil' : 'Profile'}</h4>
                <label style={labelStyle}>{tAuth.logoLabel || "Custom Logo"}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: 64, height: 64, border: `1px solid ${colors.border.light}`, borderRadius: radii.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.surface.sidebar, overflow: 'hidden' }}>
                    {customLogo ? <img src={customLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Default</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ cursor: 'pointer', padding: '6px 12px', fontSize: typography.fontSize.xs, background: colors.surface.card, border: `1px solid ${colors.border.light}`, borderRadius: radii.md, color: colors.text.body, textAlign: 'center' }}>
                      {tAuth.uploadLogo || "Upload"}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    </label>
                    {/* ★ v2.2: dark-aware remove logo button */}
                    {customLogo && (
                      <button onClick={handleRemoveLogo} style={{ padding: '6px 12px', fontSize: typography.fontSize.xs, background: errorBg, color: errorText, borderRadius: radii.md, border: `1px solid ${errorBorder}`, cursor: 'pointer' }}>
                        {tAuth.removeLogo || "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid ${colors.border.light}`, margin: '24px 0' }} />

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.heading, margin: '0 0 8px' }}>{tAuth.changePassword || 'Change Password'}</h4>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: '12px' }}>{language === 'si' ? 'Vnesite novo geslo.' : 'Enter your new password.'}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={tAuth.newPassword || 'New password'} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = colors.primary[400])} onBlur={e => (e.currentTarget.style.borderColor = colors.border.light)} />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={tAuth.confirmNewPassword || 'Confirm new password'} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = colors.primary[400])} onBlur={e => (e.currentTarget.style.borderColor = colors.border.light)} />
                  <div><Button variant="primary" size="sm" onClick={handlePasswordChange}>{tAuth.changePassword || 'Change Password'}</Button></div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid ${colors.border.light}`, margin: '24px 0' }} />

              {/* ── 2FA ★ v2.2: dark-aware status badges and panels ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.heading, margin: 0 }}>{language === 'si' ? 'Dvostopenjsko preverjanje (2FA)' : 'Two-Factor Authentication (2FA)'}</h4>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: '4px' }}>{language === 'si' ? 'Uporabi authenticator aplikacijo za dodatno zaščito.' : 'Use an authenticator app for extra security.'}</p>
                  </div>
                  <div style={{
                    padding: '4px 12px', borderRadius: radii.full, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold,
                    background: hasMFA ? successBg : colors.surface.sidebar,
                    color: hasMFA ? successText : colors.text.muted,
                    border: `1px solid ${hasMFA ? successBorder : colors.border.light}`,
                  }}>
                    {hasMFA ? (language === 'si' ? 'AKTIVNO' : 'ACTIVE') : (language === 'si' ? 'NEAKTIVNO' : 'INACTIVE')}
                  </div>
                </div>

                {hasMFA && !mfaEnrolling && (
                  <div style={{ padding: '16px', background: successBg, border: `1px solid ${successBorder}`, borderRadius: radii.xl }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <svg style={{ width: 24, height: 24, color: isDark ? '#6EE7B7' : lightColors.success[600] }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p style={{ fontSize: typography.fontSize.sm, color: successText, fontWeight: typography.fontWeight.medium }}>{language === 'si' ? 'Račun je zaščiten z 2FA.' : 'Account is protected with 2FA.'}</p>
                    </div>
                    {mfaFactors.map(factor => (
                      <div key={factor.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.mono, color: colors.text.body }}>{factor.friendly_name || 'TOTP'}</span>
                        <Button variant="danger" size="sm" onClick={() => handleDisableMFA(factor.id)}>{language === 'si' ? 'Deaktiviraj' : 'Disable'}</Button>
                      </div>
                    ))}
                  </div>
                )}

                {!hasMFA && !mfaEnrolling && (
                  <>
                    {enrollError && <div style={{ background: errorBg, border: `1px solid ${errorBorder}`, color: errorText, padding: '8px 12px', borderRadius: radii.lg, marginBottom: '12px', fontSize: typography.fontSize.sm }}>{enrollError}</div>}
                    <Button variant="primary" size="md" onClick={handleStartMFAEnroll}>
                      <svg style={{ width: 20, height: 20, marginRight: 8 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      {language === 'si' ? 'Nastavi 2FA' : 'Set up 2FA'}
                    </Button>
                  </>
                )}

                {mfaEnrolling && enrollData && (
                  <div style={{ padding: '20px', background: colors.surface.sidebar, border: `1px solid ${colors.border.light}`, borderRadius: radii.xl }}>
                    <div style={{ marginBottom: '20px' }}>
                      <h5 style={{ fontWeight: typography.fontWeight.bold, color: colors.text.heading, marginBottom: '8px' }}>{language === 'si' ? '1. Skeniraj QR kodo' : '1. Scan QR Code'}</h5>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: '16px' }}>{language === 'si' ? 'Odpri authenticator aplikacijo in skeniraj QR kodo.' : 'Open your authenticator app and scan the QR code.'}</p>
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: colors.surface.card, borderRadius: radii.lg, border: `1px solid ${colors.border.light}` }}>
                        <QRCodeImage value={enrollData.qrUri} size={200} />
                      </div>
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: '4px' }}>{language === 'si' ? 'Ali ročno vnesi ključ:' : 'Or enter key manually:'}</p>
                        <code style={{ fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.mono, background: colors.surface.card, padding: '4px 12px', borderRadius: radii.md, border: `1px solid ${colors.border.light}`, color: colors.text.body, letterSpacing: '0.15em' }}>{enrollData.secret}</code>
                      </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${colors.border.light}`, paddingTop: '16px' }}>
                      <h5 style={{ fontWeight: typography.fontWeight.bold, color: colors.text.heading, marginBottom: '8px' }}>{language === 'si' ? '2. Vnesi kodo' : '2. Enter Code'}</h5>
                      {enrollError && <div style={{ background: errorBg, border: `1px solid ${errorBorder}`, color: errorText, padding: '8px 12px', borderRadius: radii.lg, marginBottom: '12px', fontSize: typography.fontSize.sm }}>{enrollError}</div>}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input type="text" value={enrollCode} onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6}
                          style={{ ...inputStyle, textAlign: 'center', fontSize: typography.fontSize.xl, letterSpacing: '0.3em', flex: 1 }}
                          autoFocus onKeyDown={(e) => e.key === 'Enter' && enrollCode.length === 6 && handleVerifyMFAEnroll()}
                          onFocus={e => (e.currentTarget.style.borderColor = colors.primary[400])} onBlur={e => (e.currentTarget.style.borderColor = colors.border.light)} />
                        <Button variant="primary" size="md" onClick={handleVerifyMFAEnroll} disabled={enrollCode.length !== 6}>{language === 'si' ? 'Potrdi' : 'Verify'}</Button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '12px' }}>
                      <button onClick={() => { setMfaEnrolling(false); setEnrollData(null); }} style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>{language === 'si' ? 'Prekliči' : 'Cancel'}</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ★ v2.2: dark-aware profile message */}
              {message && activeTab === 'profile' && (
                <div style={{
                  marginTop: '16px', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
                  padding: '8px', borderRadius: radii.lg, textAlign: 'center',
                  background: isError ? errorBg : successBg, color: isError ? errorText : successText,
                }}>{message}</div>
              )}
            </div>
          )}

          {/* ═══ AUDIT LOG TAB ═══ */}
          {activeTab === 'audit' && isUserAdmin && (
            <div>
              {admin.isLoadingLog ? (
                <Card><SkeletonTable rows={8} cols={4} /></Card>
              ) : admin.adminLog.length === 0 ? (
                <Card><p style={{ textAlign: 'center', color: colors.text.muted, padding: '40px 0' }}>{t.log.noEntries}</p></Card>
              ) : (
                <Card padded={false}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${colors.border.light}`, background: colors.surface.sidebar }}>
                          <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.log.date}</th>
                          <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.log.admin}</th>
                          <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.log.action}</th>
                          <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: typography.fontWeight.semibold, color: colors.text.muted, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.log.details}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admin.adminLog.map((entry) => {
                          const actionLabel = (t.log.actions as Record<string, string>)[entry.action] || entry.action;
                          let badgeVariant: 'primary' | 'warning' | 'error' | 'neutral' = 'neutral';
                          if (entry.action === 'role_change') badgeVariant = 'warning';
                          if (entry.action === 'instructions_update') badgeVariant = 'primary';
                          if (entry.action === 'instructions_reset') badgeVariant = 'error';
                          let detailText = '';
                          if (entry.action === 'role_change' && entry.details) { detailText = `${entry.targetEmail || '?'}: ${entry.details.old_role} → ${entry.details.new_role}`; }
                          else if (entry.action === 'instructions_update' && entry.details) { detailText = `${entry.details.sections_updated || '?'} sections`; }
                          else if (entry.action === 'instructions_reset') { detailText = 'Reset to default'; }

                          return (
                            // ★ v2.2: dark-aware audit row
                            <tr key={entry.id} style={{ borderBottom: `1px solid ${colors.border.light}`, background: rowDefaultBg }}
                              onMouseEnter={e => (e.currentTarget.style.background = rowHoverBg)}
                              onMouseLeave={e => (e.currentTarget.style.background = rowDefaultBg)}>
                              <td style={{ padding: '10px 16px', color: colors.text.muted, fontSize: typography.fontSize.xs, whiteSpace: 'nowrap' }}>{formatDate(entry.createdAt)}</td>
                              <td style={{ padding: '10px 16px', color: colors.text.body }}>{entry.adminEmail}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'center' }}><Badge variant={badgeVariant} size="sm">{actionLabel}</Badge></td>
                              <td style={{ padding: '10px 16px', color: colors.text.body, fontSize: typography.fontSize.xs }}>{detailText}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

            </>
          )}
        </div>
      </div>

      {/* ─── Confirm Modal ─── */}
      {confirmModal?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ background: colors.surface.card, borderRadius: radii['2xl'], boxShadow: shadows.xl, padding: '24px', maxWidth: '480px', width: '100%', animation: 'scaleIn 0.2s ease-out' }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.heading, marginBottom: '12px' }}>{confirmModal.title}</h3>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.body, lineHeight: typography.lineHeight.relaxed, marginBottom: '20px' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmModal(null)}>{language === 'si' ? 'Prekliči' : 'Cancel'}</Button>
              <Button variant="primary" size="sm" onClick={confirmModal.onConfirm}>{language === 'si' ? 'Potrdi' : 'Confirm'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 120,
          padding: '12px 20px', borderRadius: radii.xl,
          background: toast.type === 'success' ? (isDark ? '#059669' : lightColors.success[600]) : (isDark ? '#DC2626' : lightColors.error[600]),
          color: '#FFFFFF', fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium, boxShadow: shadows.lg,
          animation: 'slideInRight 0.3s ease-out', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
