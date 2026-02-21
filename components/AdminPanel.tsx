// components/AdminPanel.tsx
// ═══════════════════════════════════════════════════════════════
// Unified Admin / Settings Panel
// v4.0 — 2026-02-21
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
import { storageService } from '../services/storageService.ts';
import { validateProviderKey, OPENROUTER_MODELS, GEMINI_MODELS, OPENAI_MODELS, type AIProviderType } from '../services/aiProvider.ts';
import {
  getFullInstructions, getDefaultInstructions, saveAppInstructions, resetAppInstructions,
  LANGUAGE_DIRECTIVES, LANGUAGE_MISMATCH_TEMPLATE, ACADEMIC_RIGOR_RULES, HUMANIZATION_RULES,
  PROJECT_TITLE_RULES, MODE_INSTRUCTIONS, QUALITY_GATES, SECTION_TASK_INSTRUCTIONS,
  TEMPORAL_INTEGRITY_RULE, CHAPTER_LABELS, FIELD_RULE_LABELS, CHAPTERS,
  GLOBAL_RULES, FIELD_RULES, SUMMARY_RULES, TRANSLATION_RULES,
} from '../services/Instructions.ts';
import { errorLogService, type ErrorLogEntry } from '../services/errorLogService.ts';
import { organizationService } from '../services/organizationService.ts';
import { knowledgeBaseService, type KBDocument } from '../services/knowledgeBaseService.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'si';
  initialTab?: string;
}

type TabId = 'users' | 'instructions' | 'ai' | 'profile' | 'audit' | 'errors' | 'knowledge';

const QRCodeImage = ({ value, size = 200, colors: c }: { value: string; size?: number; colors?: typeof lightColors }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=8`;
  const borderColor = c ? c.border.light : lightColors.border.light;
  return <img src={url} alt="QR Code" width={size} height={size} style={{ borderRadius: radii.lg, border: `1px solid ${borderColor}` }} />;
};

const CollapsibleSection = ({ title, defaultOpen = false, children, colors: c }: { title: string; defaultOpen?: boolean; children: React.ReactNode; colors: typeof lightColors }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${c.border.light}`, borderRadius: radii.lg, overflow: 'hidden' }}>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: c.surface.sidebar, border: 'none', cursor: 'pointer',
          textAlign: 'left', transition: `background ${animation.duration.fast}`,
          color: c.text.heading, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
        }}>
        <span>{title}</span>
        <svg style={{ width: 16, height: 16, color: c.text.muted, transition: `transform ${animation.duration.fast}`, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div style={{ padding: '16px', borderTop: `1px solid ${c.border.light}`, background: c.surface.card }}>{children}</div>}
    </div>
  );
};

const ADMIN_TEXT = {
  en: {
    title: 'Admin / Settings',
    titleRegular: 'Settings',
    titleSuperAdmin: 'Super Admin / Settings',
    subtitle: 'Manage users, AI settings, instructions, and view audit log',
    subtitleRegular: 'Configure AI provider, profile and security',
    subtitleSuperAdmin: 'Full system control — users, AI, instructions, branding & audit',
    tabs: {
      users: 'Users', instructions: 'Instructions', ai: 'AI Provider',
      profile: 'Profile & Security', audit: 'Audit Log', errors: 'Error Log', knowledge: 'Knowledge Base',
    },
    users: {
      title: 'User Management', subtitle: 'View and manage all registered users',
      email: 'Email', displayName: 'Name', role: 'Role', registered: 'Registered',
      lastLogin: 'Last Login', actions: 'Actions', changeRole: 'Change Role',
      makeAdmin: 'Make Admin', makeUser: 'Make User',
      confirmRoleChange: 'Are you sure you want to change the role of',
      confirmToAdmin: 'to Admin? They will have full access to all settings and user management.',
      confirmToUser: 'to User? They will lose access to the Admin Panel and Instructions editor.',
      selfProtection: 'You cannot remove your own admin role.',
      roleUpdated: 'Role updated successfully.', roleUpdateFailed: 'Failed to update role:',
      noUsers: 'No users found.', totalUsers: 'Total users', totalAdmins: 'Admins',
      totalSuperAdmins: 'Super Admins', protected: 'Protected', never: 'Never',
      deleteUser: 'Delete User',
      deleteConfirm: 'Are you sure you want to PERMANENTLY delete user',
      deleteConfirmSuffix: '? All their projects and data will be removed. This cannot be undone.',
      deleteSuccess: 'User deleted successfully.', deleteFailed: 'Failed to delete user:',
      removeFromOrg: 'Remove from Org',
      removeFromOrgConfirm: 'Remove user from this organization? Their projects in this org will be deleted.',
    },
    instructions: {
      title: 'AI Instructions', subtitle: 'Edit the global AI instructions that apply to all users',
      save: 'Save Instructions', reset: 'Reset to Default',
      saved: 'Instructions saved successfully.', saveFailed: 'Failed to save instructions:',
      resetConfirm: 'Are you sure you want to reset all instructions to their default values? This cannot be undone.',
      resetDone: 'Instructions reset to default.', resetFailed: 'Failed to reset instructions:',
      lastUpdated: 'Last updated', by: 'by',
      usingDefaults: 'Currently using default instructions (no custom overrides).',
      sections: {
        global: 'Global Rules', language: 'Language Rules', academic: 'Academic Writing',
        humanization: 'Humanization', projectTitle: 'Project Title', mode: 'Mode Rules',
        qualityGates: 'Quality Gates', sectionTask: 'Section Tasks', fieldRules: 'Field Rules',
        translation: 'Translation', summary: 'Summary', chapter: 'Chapter Mapping', temporal: 'Temporal Integrity',
      },
    },
    log: {
      title: 'Audit Log', subtitle: 'Track all administrative actions',
      admin: 'Admin', action: 'Action', target: 'Target', details: 'Details', date: 'Date',
      noEntries: 'No log entries found.',
      actions: {
        role_change: 'Role Change', instructions_update: 'Instructions Updated',
        instructions_reset: 'Instructions Reset', user_block: 'User Blocked',
        user_delete: 'User Deleted', org_user_remove: 'User Removed from Org',
        org_delete: 'Organization Deleted',
      },
    },
    errors: {
      title: 'Error Log', subtitle: 'System errors captured from all users',
      date: 'Date', user: 'User', component: 'Component', error: 'Error', code: 'Code',
      noErrors: 'No errors in system!', copyForDev: 'Copy for developer',
      clearAll: 'Clear all', clearConfirm: 'Clear all error logs?',
      copied: 'Logs copied to clipboard!', cleared: 'Logs cleared.',
    },
    selfDelete: {
      title: 'Delete My Account',
      warning: 'This will permanently delete your account, all your projects, and remove you from all organizations. This action cannot be undone.',
      button: 'Delete My Account', confirmTitle: 'Confirm Account Deletion',
      confirmMessage: 'Type DELETE to confirm permanent deletion of your account and all data:',
      success: 'Account deleted. You will be logged out.', failed: 'Failed to delete account:',
    },
    knowledge: {
      title: 'Knowledge Base',
      subtitle: 'Upload documents that the AI must always consider when generating content',
      upload: 'Upload Document', uploading: 'Uploading...', delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this document? This cannot be undone.',
      deleteSuccess: 'Document deleted.', deleteFailed: 'Failed to delete document:',
      uploadSuccess: 'document(s) uploaded successfully.', uploadFailed: 'Upload failed:',
      noDocuments: 'No documents uploaded yet.', docCount: 'documents',
      maxDocs: 'Maximum', maxSize: 'Max file size', maxPages: 'Max pages per document',
      dragDrop: 'Drag & drop files here or click to browse',
      allowedTypes: 'Allowed: PDF, DOCX, XLSX, PPTX, JPG, PNG',
      fileName: 'File Name', fileType: 'Type', fileSize: 'Size',
      uploadedAt: 'Uploaded', uploadedBy: 'By', actions: 'Actions',
      info: 'Documents uploaded here serve as a knowledge base. The AI will ALWAYS use them as context when generating project content \u2014 just like the rules in Instructions.',
    },
    whiteLabel: {
      logoTitle: 'Custom Logo',
      logoNotice: 'Logo customization is available only in the White-Label version. Contact us for more information.',
    },
    close: 'Close',
  },
  si: {
    title: 'Admin / Nastavitve',
    titleRegular: 'Nastavitve',
    titleSuperAdmin: 'Super Admin / Nastavitve',
    subtitle: 'Upravljanje uporabnikov, AI nastavitev, pravil in pregled dnevnika',
    subtitleRegular: 'Nastavi AI ponudnika, profil in varnost',
    subtitleSuperAdmin: 'Polni nadzor sistema \u2014 uporabniki, AI, pravila, blagovna znamka & dnevnik',
    tabs: {
      users: 'Uporabniki', instructions: 'Pravila', ai: 'AI Ponudnik',
      profile: 'Profil & Varnost', audit: 'Dnevnik', errors: 'Dnevnik napak', knowledge: 'Baza znanja',
    },
    users: {
      title: 'Upravljanje uporabnikov', subtitle: 'Pregled in upravljanje vseh registriranih uporabnikov',
      email: 'E-po\u0161ta', displayName: 'Ime', role: 'Vloga', registered: 'Registriran',
      lastLogin: 'Zadnja prijava', actions: 'Akcije', changeRole: 'Spremeni vlogo',
      makeAdmin: 'Nastavi kot Admin', makeUser: 'Nastavi kot Uporabnik',
      confirmRoleChange: 'Ali ste prepri\u010Dani, da \u017Eelite spremeniti vlogo uporabnika',
      confirmToAdmin: 'v Admin? Imel bo poln dostop do vseh nastavitev in upravljanja uporabnikov.',
      confirmToUser: 'v Uporabnik? Izgubil bo dostop do Admin Panela in urejevalnika pravil.',
      selfProtection: 'Ne morete odstraniti lastne admin vloge.',
      roleUpdated: 'Vloga uspe\u0161no posodobljena.', roleUpdateFailed: 'Napaka pri posodobitvi vloge:',
      noUsers: 'Ni najdenih uporabnikov.', totalUsers: 'Skupaj uporabnikov', totalAdmins: 'Adminov',
      totalSuperAdmins: 'Super Adminov', protected: 'Za\u0161\u010Diteno', never: 'Nikoli',
      deleteUser: 'Izbri\u0161i uporabnika',
      deleteConfirm: 'Ali ste prepri\u010Dani, da \u017Eelite TRAJNO izbrisati uporabnika',
      deleteConfirmSuffix: '? Vsi njihovi projekti in podatki bodo odstranjeni. Tega ni mogo\u010De razveljaviti.',
      deleteSuccess: 'Uporabnik uspe\u0161no izbrisan.', deleteFailed: 'Napaka pri brisanju uporabnika:',
      removeFromOrg: 'Odstrani iz org.',
      removeFromOrgConfirm: 'Odstrani uporabnika iz te organizacije? Njegovi projekti v tej org bodo izbrisani.',
    },
    instructions: {
      title: 'AI Pravila', subtitle: 'Urejanje globalnih AI pravil, ki veljajo za vse uporabnike',
      save: 'Shrani pravila', reset: 'Ponastavi na privzeto',
      saved: 'Pravila uspe\u0161no shranjena.', saveFailed: 'Napaka pri shranjevanju pravil:',
      resetConfirm: 'Ali ste prepri\u010Dani, da \u017Eelite ponastaviti vsa pravila na privzete vrednosti? Tega ni mogo\u010De razveljaviti.',
      resetDone: 'Pravila ponastavljena na privzeto.', resetFailed: 'Napaka pri ponastavitvi pravil:',
      lastUpdated: 'Zadnja posodobitev', by: 'avtor',
      usingDefaults: 'Trenutno se uporabljajo privzeta pravila (brez prilagoditev).',
      sections: {
        global: 'Globalna pravila', language: 'Jezikovna pravila', academic: 'Akademsko pisanje',
        humanization: 'Humanizacija', projectTitle: 'Naslov projekta', mode: 'Pravila na\u010Dina',
        qualityGates: 'Kontrola kakovosti', sectionTask: 'Naloge sklopov', fieldRules: 'Pravila polj',
        translation: 'Prevod', summary: 'Povzetek', chapter: 'Mapiranje poglavij', temporal: '\u010Casovna celovitost',
      },
    },
    log: {
      title: 'Dnevnik sprememb', subtitle: 'Sledenje vsem administrativnim akcijam',
      admin: 'Admin', action: 'Akcija', target: 'Cilj', details: 'Podrobnosti', date: 'Datum',
      noEntries: 'Ni vnosov v dnevniku.',
      actions: {
        role_change: 'Sprememba vloge', instructions_update: 'Pravila posodobljena',
        instructions_reset: 'Pravila ponastavljena', user_block: 'Uporabnik blokiran',
        user_delete: 'Uporabnik izbrisan', org_user_remove: 'Uporabnik odstranjen iz org',
        org_delete: 'Organizacija izbrisana',
      },
    },
    errors: {
      title: 'Dnevnik napak', subtitle: 'Sistemske napake vseh uporabnikov',
      date: 'Datum', user: 'Uporabnik', component: 'Komponenta', error: 'Napaka', code: 'Koda',
      noErrors: 'Ni napak v sistemu!', copyForDev: 'Kopiraj za razvijalca',
      clearAll: 'Po\u010Disti vse', clearConfirm: 'Izbri\u0161i vse error loge?',
      copied: 'Logi kopirani v odlo\u017Ei\u0161\u010De!', cleared: 'Logi izbrisani.',
    },
    selfDelete: {
      title: 'Izbri\u0161i moj ra\u010Dun',
      warning: 'To bo trajno izbrisalo va\u0161 ra\u010Dun, vse va\u0161e projekte in vas odstranilo iz vseh organizacij. Tega dejanja ni mogo\u010De razveljaviti.',
      button: 'Izbri\u0161i moj ra\u010Dun', confirmTitle: 'Potrdite izbris ra\u010Duna',
      confirmMessage: 'Vnesite DELETE za potrditev trajnega izbrisa va\u0161ega ra\u010Duna in vseh podatkov:',
      success: 'Ra\u010Dun izbrisan. Odjavljeni boste.', failed: 'Napaka pri brisanju ra\u010Duna:',
    },
    knowledge: {
      title: 'Baza znanja',
      subtitle: 'Nalo\u017Eite dokumente, ki jih mora AI vedno upo\u0161tevati pri generiranju vsebin',
      upload: 'Nalo\u017Ei dokument', uploading: 'Nalaganje...', delete: 'Izbri\u0161i',
      deleteConfirm: 'Ali ste prepri\u010Dani, da \u017Eelite izbrisati ta dokument? Tega ni mogo\u010De razveljaviti.',
      deleteSuccess: 'Dokument izbrisan.', deleteFailed: 'Napaka pri brisanju dokumenta:',
      uploadSuccess: 'dokument(ov) uspe\u0161no nalo\u017Eenih.', uploadFailed: 'Nalaganje ni uspelo:',
      noDocuments: '\u0160e ni nalo\u017Eenih dokumentov.', docCount: 'dokumentov',
      maxDocs: 'Najve\u010D', maxSize: 'Najve\u010Dja velikost', maxPages: 'Najve\u010D strani',
      dragDrop: 'Povlecite datoteke sem ali kliknite za brskanje',
      allowedTypes: 'Dovoljeno: PDF, DOCX, XLSX, PPTX, JPG, PNG',
      fileName: 'Ime datoteke', fileType: 'Tip', fileSize: 'Velikost',
      uploadedAt: 'Nalo\u017Eeno', uploadedBy: 'Avtor', actions: 'Akcije',
      info: 'Dokumenti nalo\u017Eeni tukaj slu\u017Eijo kot baza znanja. AI jih bo VEDNO uporabil kot kontekst pri generiranju projektnih vsebin \u2014 enako kot pravila v Navodilih.',
    },
    whiteLabel: {
      logoTitle: 'Logotip',
      logoNotice: 'Prilagoditev logotipa je na voljo samo v White-Label verziji. Kontaktirajte nas za ve\u010D informacij.',
    },
    close: 'Zapri',
  },
} as const;

const formatDate = (dateStr: string | null, short = false): string => {
  if (!dateStr) return '\u2014';
  try {
    const d = new Date(dateStr);
    if (short) return d.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return d.toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
};

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

const buildDefaultInstructionsDisplay = (): Record<string, string> => {
  const fmtGates = (gates: string[]): string => gates.map((g, i) => `  ${i + 1}. ${g}`).join('\n');
  return {
    global: `\u2550\u2550\u2550 GLOBAL RULES \u2550\u2550\u2550\nThese are the master rules that govern ALL AI content generation.\n\nARCHITECTURE PRINCIPLE:\n  Instructions.ts is the SINGLE SOURCE OF TRUTH for all AI rules.\n  geminiService.ts reads from here \u2014 it has ZERO own rules.\n\n${GLOBAL_RULES}`,
    language: `\u2550\u2550\u2550 LANGUAGE DIRECTIVES \u2550\u2550\u2550\n\n\u2500\u2500 English \u2500\u2500\n${LANGUAGE_DIRECTIVES.en}\n\n\u2500\u2500 Sloven\u0161\u010Dina \u2500\u2500\n${LANGUAGE_DIRECTIVES.si}\n\n\u2500\u2500 Language Mismatch Template \u2500\u2500\n${LANGUAGE_MISMATCH_TEMPLATE}`,
    academic: `\u2550\u2550\u2550 ACADEMIC RIGOR & CITATION RULES \u2550\u2550\u2550\n\n${ACADEMIC_RIGOR_RULES.en}`,
    humanization: `\u2550\u2550\u2550 HUMANIZATION RULES \u2550\u2550\u2550\n\n${HUMANIZATION_RULES.en}`,
    projectTitle: `\u2550\u2550\u2550 PROJECT TITLE RULES \u2550\u2550\u2550\n\n${PROJECT_TITLE_RULES.en}`,
    mode: `\u2550\u2550\u2550 MODE INSTRUCTIONS \u2550\u2550\u2550\n\n${Object.entries(MODE_INSTRUCTIONS).map(([mode, langs]) => `\u2500\u2500 ${mode.toUpperCase()} \u2500\u2500\n\n${langs.en}`).join('\n\n')}`,
    qualityGates: `\u2550\u2550\u2550 QUALITY GATES \u2550\u2550\u2550\n\n${Object.entries(QUALITY_GATES).map(([section, langs]) => `\u2500\u2500 ${section} \u2500\u2500\n\n${fmtGates(langs.en || [])}`).join('\n\n')}`,
    sectionTask: `\u2550\u2550\u2550 SECTION TASK INSTRUCTIONS \u2550\u2550\u2550\n\n${Object.entries(SECTION_TASK_INSTRUCTIONS).map(([section, langs]) => `\u2500\u2500 ${section} \u2500\u2500\n\n${langs.en || '(empty)'}`).join('\n\n')}`,
    fieldRules: `\u2550\u2550\u2550 FIELD RULES \u2550\u2550\u2550\n\n${Object.entries(FIELD_RULES).map(([key, val]) => { const label = (FIELD_RULE_LABELS as Record<string, string>)[key] || key; return `\u2500\u2500 ${label} \u2500\u2500\n${val.en || '(empty)'}`; }).join('\n\n')}`,
    translation: `\u2550\u2550\u2550 TRANSLATION RULES \u2550\u2550\u2550\n\n${TRANSLATION_RULES.en.map((r: string, i: number) => `  ${i + 1}. ${r}`).join('\n')}`,
    summary: `\u2550\u2550\u2550 SUMMARY RULES \u2550\u2550\u2550\n\n${SUMMARY_RULES.en}`,
    chapter: `\u2550\u2550\u2550 CHAPTER RULES \u2550\u2550\u2550\n\n${Object.entries(CHAPTERS).map(([key, val]) => { const label = (CHAPTER_LABELS as Record<string, string>)[key] || key; return `\u2500\u2500 ${label} \u2500\u2500\n${val}`; }).join('\n\n')}`,
    temporal: `\u2550\u2550\u2550 TEMPORAL INTEGRITY RULE \u2550\u2550\u2550\n\n${TEMPORAL_INTEGRITY_RULE.en}`,
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

  const isUserAdmin = admin.isAdmin;
  const isUserSuperAdmin = admin.isSuperAdmin;
  const adminTabs: TabId[] = isUserSuperAdmin
    ? ['users', 'instructions', 'ai', 'profile', 'audit', 'errors', 'knowledge']
    : ['users', 'instructions', 'ai', 'profile', 'audit', 'knowledge'];
  const regularTabs: TabId[] = ['ai', 'profile'];
  const availableTabs = isUserAdmin ? adminTabs : regularTabs;
  const defaultTab = initialTab && availableTabs.includes(initialTab as TabId) ? (initialTab as TabId) : (isUserAdmin ? 'users' : 'ai');

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  useEffect(() => { if (isOpen) { admin.checkAdminStatus(); } }, [isOpen]);
  useEffect(() => { if (isOpen) { const tab = initialTab && availableTabs.includes(initialTab as TabId) ? (initialTab as TabId) : (isUserAdmin ? 'users' : 'ai'); setActiveTab(tab); } }, [isOpen, initialTab, isUserAdmin]);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editedInstructions, setEditedInstructions] = useState<Record<string, string>>({});
  const [activeInstructionSection, setActiveInstructionSection] = useState<string>('global');

  const [aiProvider, setAiProvider] = useState<AIProviderType>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
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

  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [errorLogsLoading, setErrorLogsLoading] = useState(false);
  const [selfDeleteInput, setSelfDeleteInput] = useState('');
  const [selfDeleteLoading, setSelfDeleteLoading] = useState(false);

  const [kbDocuments, setKbDocuments] = useState<KBDocument[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbUploading, setKbUploading] = useState(false);
  const [kbDragOver, setKbDragOver] = useState(false);

  useEffect(() => { if (isOpen) { if (isUserAdmin) { admin.fetchUsers(); admin.fetchGlobalInstructions(); } loadSettingsData(); } }, [isOpen, isUserAdmin]);
  useEffect(() => { if (activeTab === 'audit' && isOpen && isUserAdmin) { admin.fetchAdminLog(); } }, [activeTab, isOpen, isUserAdmin]);
  useEffect(() => {
    if (activeTab === 'errors' && isOpen && isUserSuperAdmin) {
      setErrorLogsLoading(true);
      errorLogService.getErrorLogs(200).then(logs => { setErrorLogs(logs); setErrorLogsLoading(false); });
    }
  }, [activeTab, isOpen, isUserSuperAdmin]);
  useEffect(() => {
    if (activeTab === 'knowledge' && isOpen && isUserAdmin) {
      const orgId = storageService.getActiveOrgId();
      if (orgId) {
        setKbLoading(true);
        knowledgeBaseService.getDocuments(orgId).then(docs => { setKbDocuments(docs); setKbLoading(false); });
      }
    }
  }, [activeTab, isOpen, isUserAdmin]);

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
      await storageService.ensureSettingsLoaded();
      const provider = storageService.getAIProvider() || 'gemini';
      setAiProvider(provider);
      setGeminiKey(storageService.getApiKey() || '');
      setOpenRouterKey(storageService.getOpenRouterKey() || '');
      setOpenaiKey(storageService.getOpenAIKey() || '');
      const model = storageService.getCustomModel();
      setModelName(model || (provider === 'gemini' ? 'gemini-3-pro-preview' : provider === 'openai' ? 'gpt-5.2' : 'deepseek/deepseek-v3.2'));
      setCustomLogo(storageService.getCustomLogo());
      setAppInstructions(JSON.parse(JSON.stringify(getFullInstructions())));
      setInstructionsChanged(false);
      try { const { totp } = await storageService.getMFAFactors(); setMfaFactors(totp.filter((f: any) => f.status === 'verified')); } catch { setMfaFactors([]); }
      setNewPassword(''); setConfirmPassword('');
      setMfaEnrolling(false); setEnrollData(null); setEnrollCode(''); setEnrollError('');
      setMessage(''); setIsError(false); setInstructionsSubTab('global');
      setSelfDeleteInput(''); setSelfDeleteLoading(false);
    } finally { setSettingsLoading(false); }
  };

  const handleRoleChange = useCallback((user: AdminUser) => {
    if (user.role === 'superadmin') return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = user.role === 'admin'
      ? `${t.users.confirmRoleChange} "${user.email}" ${t.users.confirmToUser}`
      : `${t.users.confirmRoleChange} "${user.email}" ${t.users.confirmToAdmin}`;
    setConfirmModal({ isOpen: true, title: t.users.changeRole, message: confirmMsg,
      onConfirm: async () => { setConfirmModal(null); const result = await admin.updateUserRole(user.id, newRole); if (result.success) { setToast({ message: t.users.roleUpdated, type: 'success' }); } else { setToast({ message: `${t.users.roleUpdateFailed} ${result.message}`, type: 'error' }); } }
    });
  }, [admin, t]);

  const handleDeleteUser = useCallback((user: AdminUser) => {
    setConfirmModal({ isOpen: true, title: t.users.deleteUser, message: `${t.users.deleteConfirm} "${user.email}"${t.users.deleteConfirmSuffix}`,
      onConfirm: async () => { setConfirmModal(null); const result = await admin.deleteUser(user.id); if (result.success) { setToast({ message: t.users.deleteSuccess, type: 'success' }); } else { setToast({ message: `${t.users.deleteFailed} ${result.message}`, type: 'error' }); } }
    });
  }, [admin, t]);

  const handleRemoveOrgUser = useCallback((user: AdminUser) => {
    const activeOrgId = storageService.getActiveOrgId();
    if (!activeOrgId) return;
    setConfirmModal({ isOpen: true, title: t.users.removeFromOrg, message: `${t.users.removeFromOrgConfirm}\n\n${user.email}`,
      onConfirm: async () => { setConfirmModal(null); const result = await admin.deleteOrgUser(user.id, activeOrgId); if (result.success) { setToast({ message: t.users.deleteSuccess, type: 'success' }); } else { setToast({ message: `${t.users.deleteFailed} ${result.message}`, type: 'error' }); } }
    });
  }, [admin, t]);

  const handleSelfDelete = useCallback(async () => {
    if (selfDeleteInput !== 'DELETE') return;
    setSelfDeleteLoading(true);
    const result = await admin.deleteSelf();
    setSelfDeleteLoading(false);
    if (result.success) { setToast({ message: t.selfDelete.success, type: 'success' }); setTimeout(() => { window.location.reload(); }, 2000); }
    else { setToast({ message: `${t.selfDelete.failed} ${result.message}`, type: 'error' }); }
  }, [admin, selfDeleteInput, t]);

  const handleSaveGlobalInstructions = useCallback(async () => {
    const result = await admin.saveGlobalInstructions(editedInstructions);
    if (result.success) { setToast({ message: t.instructions.saved, type: 'success' }); }
    else { setToast({ message: `${t.instructions.saveFailed} ${result.message}`, type: 'error' }); }
  }, [admin, editedInstructions, t]);

  const handleResetGlobalInstructions = useCallback(() => {
    setConfirmModal({ isOpen: true, title: t.instructions.reset, message: t.instructions.resetConfirm,
      onConfirm: async () => { setConfirmModal(null); const result = await admin.resetInstructionsToDefault(); if (result.success) { setEditedInstructions({}); setToast({ message: t.instructions.resetDone, type: 'success' }); } else { setToast({ message: `${t.instructions.resetFailed} ${result.message}`, type: 'error' }); } }
    });
  }, [admin, t]);

  const handleInstructionChange = useCallback((section: string, value: string) => { setEditedInstructions(prev => ({ ...prev, [section]: value })); }, []);

  const handleProviderChange = (provider: AIProviderType) => {
    setAiProvider(provider);
    if (provider === 'gemini') setModelName('gemini-3-pro-preview');
    else if (provider === 'openai') setModelName('gpt-5.2');
    else if (provider === 'openrouter') setModelName('deepseek/deepseek-v3.2');
  };

  const handleAISave = async () => {
    setIsValidating(true); setMessage(tAuth.validating || "Validating..."); setIsError(false);
    await storageService.setAIProvider(aiProvider);
    await storageService.setCustomModel(modelName.trim());
    await storageService.setApiKey(geminiKey.trim());
    await storageService.setOpenRouterKey(openRouterKey.trim());
    await storageService.setOpenAIKey(openaiKey.trim());
    const activeKey = aiProvider === 'gemini' ? geminiKey.trim() : aiProvider === 'openai' ? openaiKey.trim() : openRouterKey.trim();
    if (activeKey === '') { setMessage(language === 'si' ? 'Nastavitve shranjene.' : 'Settings saved.'); setIsValidating(false); setTimeout(() => onClose(), 1000); return; }
    const isValid = await validateProviderKey(aiProvider, activeKey);
    setIsValidating(false);
    if (isValid) { setMessage(language === 'si' ? 'API klju\u010D potrjen in shranjen!' : 'API Key validated and saved!'); setTimeout(() => onClose(), 1000); }
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
    if (result.success) { setMfaEnrolling(false); setEnrollData(null); const { totp } = await storageService.getMFAFactors(); setMfaFactors(totp.filter((f: any) => f.status === 'verified')); setMessage(language === 'si' ? '2FA uspe\u0161no aktiviran!' : '2FA enabled successfully!'); setIsError(false); }
    else { setEnrollError(result.message || (language === 'si' ? 'Napa\u010Dna koda.' : 'Invalid code.')); setEnrollCode(''); }
  };

  const handleDisableMFA = async (factorId: string) => {
    if (!confirm(language === 'si' ? 'Ali res \u017Eeli\u0161 deaktivirati 2FA?' : 'Disable two-factor authentication?')) return;
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
    setMessage(language === 'si' ? 'Razdelek ponastavljen.' : 'Section reset to default.'); setIsError(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleKBUpload = useCallback(async (files: FileList | File[]) => {
    const orgId = storageService.getActiveOrgId();
    if (!orgId) { setToast({ message: language === 'si' ? 'Ni aktivne organizacije.' : 'No active organization.', type: 'error' }); return; }
    setKbUploading(true);
    let successCount = 0;
    let lastError = '';
    for (const file of Array.from(files)) {
      const result = await knowledgeBaseService.uploadDocument(orgId, file, isUserSuperAdmin);
      if (result.success) { successCount++; } else { lastError = result.message; }
    }
    const docs = await knowledgeBaseService.getDocuments(orgId);
    setKbDocuments(docs);
    setKbUploading(false);
    if (successCount > 0) { setToast({ message: `${successCount} ${t.knowledge.uploadSuccess}`, type: 'success' }); }
    if (lastError) { setToast({ message: `${t.knowledge.uploadFailed} ${lastError}`, type: 'error' }); }
  }, [t, language, isUserSuperAdmin]);

  const handleKBDelete = useCallback((doc: KBDocument) => {
    setConfirmModal({ isOpen: true, title: t.knowledge.delete, message: `${t.knowledge.deleteConfirm}\n\n${doc.file_name}`,
      onConfirm: async () => {
        setConfirmModal(null);
        const result = await knowledgeBaseService.deleteDocument(doc.id, doc.storage_path);
        if (result.success) { setKbDocuments(prev => prev.filter(d => d.id !== doc.id)); setToast({ message: t.knowledge.deleteSuccess, type: 'success' }); }
        else { setToast({ message: `${t.knowledge.deleteFailed} ${result.message}`, type: 'error' }); }
      }
    });
  }, [t]);

  const handleKBDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setKbDragOver(false);
    if (e.dataTransfer.files.length > 0) { handleKBUpload(e.dataTransfer.files); }
  }, [handleKBUpload]);

  const handleSave = () => { if (activeTab === 'ai') handleAISave(); else if (activeTab === 'profile') handlePasswordChange(); else if (activeTab === 'instructions') handleSaveGlobalInstructions(); };

  if (!isOpen) return null;

  const totalUsers = admin.users.length;
  const totalAdmins = admin.users.filter(u => u.role === 'admin').length;
  const totalSuperAdmins = admin.users.filter(u => u.role === 'superadmin').length;
  const instructionSections = Object.keys(t.instructions.sections) as (keyof typeof t.instructions.sections)[];
  const TAB_ICONS: Record<TabId, string> = { users: '\uD83D\uDC65', instructions: '\uD83D\uDCCB', ai: '\uD83E\uDD16', profile: '\uD83D\uDC64', audit: '\uD83D\uDCDC', errors: '\uD83D\uDC1B', knowledge: '\uD83D\uDCDA' };
  const currentModels = aiProvider === 'gemini' ? GEMINI_MODELS : aiProvider === 'openai' ? OPENAI_MODELS : OPENROUTER_MODELS;
  const hasMFA = mfaFactors.length > 0;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: `1px solid ${colors.border.light}`, borderRadius: radii.lg, fontSize: typography.fontSize.sm, color: colors.text.body, background: colors.surface.card, outline: 'none', transition: `border-color ${animation.duration.fast}`, fontFamily: typography.fontFamily.mono };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.heading, marginBottom: '6px' };

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
  const rowHoverBg = isDark ? '#1C2940' : lightColors.primary[50];
  const rowDefaultBg = isDark ? '#162032' : 'transparent';
  const tabActiveColor = isDark ? '#A5B4FC' : lightColors.primary[600];
  const tabActiveBorder = isDark ? '#818CF8' : lightColors.primary[500];
  const superadminBadgeBg = isDark ? 'rgba(251,191,36,0.15)' : '#FEF3C7';
  const superadminBadgeBorder = isDark ? 'rgba(251,191,36,0.35)' : '#FDE68A';
  const superadminBadgeText = isDark ? '#FDE68A' : '#92400E';
  const dangerBg = isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2';
  const dangerBorder = isDark ? 'rgba(239,68,68,0.2)' : '#FECACA';
  const dangerBtnBg = isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2';
  const dangerBtnBorder = isDark ? 'rgba(239,68,68,0.3)' : '#FECACA';
  const dangerBtnText = isDark ? '#FCA5A5' : '#DC2626';
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

        {/* Header */}
        <div style={{ background: colors.primary.gradient, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: colors.text.inverse, fontSize: typography.fontSize['xl'], fontWeight: typography.fontWeight.bold, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isUserSuperAdmin ? '\uD83D\uDC51' : isUserAdmin ? '\uD83D\uDEE1\uFE0F' : '\u2699\uFE0F'}{' '}
              {isUserSuperAdmin ? t.titleSuperAdmin : isUserAdmin ? t.title : t.titleRegular}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: typography.fontSize.sm, margin: '4px 0 0' }}>
              {isUserSuperAdmin ? t.subtitleSuperAdmin : isUserAdmin ? t.subtitle : t.subtitleRegular}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: radii.lg, padding: '8px', cursor: 'pointer', color: colors.text.inverse, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border.light}`, background: colors.surface.card, flexShrink: 0, padding: '0 24px', overflowX: 'auto' }}>
          {availableTabs.map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setMessage(''); }}
              style={{
                padding: '12px 20px', fontSize: typography.fontSize.sm,
                fontWeight: activeTab === tab ? typography.fontWeight.semibold : typography.fontWeight.medium,
                color: activeTab === tab ? tabActiveColor : colors.text.muted,
                background: 'transparent', border: 'none', borderBottom: activeTab === tab ? `2px solid ${tabActiveBorder}` : '2px solid transparent',
                cursor: 'pointer', transition: `all ${animation.duration.fast}`, whiteSpace: 'nowrap',
              }}>
              {TAB_ICONS[tab]} {t.tabs[tab]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* TOAST */}
          {toast && (
            <div style={{
              padding: '12px 16px', marginBottom: '16px', borderRadius: radii.lg,
              background: toast.type === 'success' ? successBg : errorBg,
              border: `1px solid ${toast.type === 'success' ? successBorder : errorBorder}`,
              color: toast.type === 'success' ? successText : errorText,
              fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {toast.type === 'success' ? '\u2705' : '\u274C'} {toast.message}
            </div>
          )}

          {/* CONFIRM MODAL */}
          {confirmModal?.isOpen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ background: colors.surface.card, borderRadius: radii['2xl'], padding: '24px', maxWidth: '440px', width: '90%', boxShadow: shadows['2xl'] }}>
                <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, margin: '0 0 12px' }}>{confirmModal.title}</h3>
                <p style={{ color: colors.text.body, fontSize: typography.fontSize.sm, margin: '0 0 20px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{confirmModal.message}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmModal(null)} style={{ padding: '8px 20px', borderRadius: radii.lg, border: `1px solid ${colors.border.light}`, background: colors.surface.card, color: colors.text.body, cursor: 'pointer', fontSize: typography.fontSize.sm }}>
                    {language === 'si' ? 'Prekli\u010Di' : 'Cancel'}
                  </button>
                  <button onClick={confirmModal.onConfirm} style={{ padding: '8px 20px', borderRadius: radii.lg, border: 'none', background: colors.primary[600], color: '#fff', cursor: 'pointer', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                    {language === 'si' ? 'Potrdi' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ USERS TAB ═══ */}
          {activeTab === 'users' && isUserAdmin && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, margin: '0 0 4px' }}>{t.users.title}</h3>
                <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, margin: 0 }}>{t.users.subtitle}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 12px', borderRadius: radii.full, background: primaryBadgeBg, border: `1px solid ${primaryBadgeBorder}`, color: primaryBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>{t.users.totalUsers}: {totalUsers}</span>
                  <span style={{ padding: '4px 12px', borderRadius: radii.full, background: warningBadgeBg, border: `1px solid ${warningBadgeBorder}`, color: warningBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>{t.users.totalAdmins}: {totalAdmins}</span>
                  <span style={{ padding: '4px 12px', borderRadius: radii.full, background: superadminBadgeBg, border: `1px solid ${superadminBadgeBorder}`, color: superadminBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>{'\uD83D\uDC51'} {t.users.totalSuperAdmins}: {totalSuperAdmins}</span>
                </div>
              </div>
              {admin.isLoadingUsers ? <SkeletonTable rows={4} cols={6} /> : admin.users.length === 0 ? (
                <p style={{ color: colors.text.muted, textAlign: 'center', padding: '40px' }}>{t.users.noUsers}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${colors.border.light}` }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.users.email}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.users.displayName}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.users.role}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.users.registered}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.users.lastLogin}</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.users.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.users.map((user) => (
                        <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border.light}`, background: rowDefaultBg }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = rowHoverBg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = rowDefaultBg; }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <UserAvatar name={user.displayName} email={user.email} size={32} />
                              <span style={{ color: colors.text.body }}>{user.email}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', color: colors.text.body }}>{user.displayName}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {user.role === 'superadmin' ? (
                              <span style={{ padding: '2px 10px', borderRadius: radii.full, background: superadminBadgeBg, border: `1px solid ${superadminBadgeBorder}`, color: superadminBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold }}>{'\uD83D\uDC51'} Super Admin</span>
                            ) : user.role === 'admin' ? (
                              <span style={{ padding: '2px 10px', borderRadius: radii.full, background: warningBadgeBg, border: `1px solid ${warningBadgeBorder}`, color: warningBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>{'\uD83D\uDEE1\uFE0F'} Admin</span>
                            ) : (
                              <span style={{ padding: '2px 10px', borderRadius: radii.full, background: primaryBadgeBg, border: `1px solid ${primaryBadgeBorder}`, color: primaryBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>User</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: colors.text.muted }}>{formatDate(user.createdAt, true)}</td>
                          <td style={{ padding: '10px 12px', color: colors.text.muted }}>{user.lastSignIn ? formatDate(user.lastSignIn) : t.users.never}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {user.role === 'superadmin' ? (
                                <span style={{ padding: '4px 10px', borderRadius: radii.lg, background: superadminBadgeBg, border: `1px solid ${superadminBadgeBorder}`, color: superadminBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>{'\uD83D\uDD12'} {t.users.protected}</span>
                              ) : (
                                <button onClick={() => handleRoleChange(user)} style={{ background: user.role === 'admin' ? warningBadgeBg : primaryBadgeBg, border: `1px solid ${user.role === 'admin' ? warningBadgeBorder : primaryBadgeBorder}`, borderRadius: radii.lg, padding: '4px 10px', cursor: 'pointer', color: user.role === 'admin' ? warningBadgeText : primaryBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>
                                  {user.role === 'admin' ? t.users.makeUser : t.users.makeAdmin}
                                </button>
                              )}
                              {isUserSuperAdmin && user.role !== 'superadmin' && (
                                <button onClick={() => handleDeleteUser(user)} title={t.users.deleteUser} style={{ background: dangerBtnBg, border: `1px solid ${dangerBtnBorder}`, borderRadius: radii.lg, padding: '4px 10px', cursor: 'pointer', color: dangerBtnText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.25)' : '#FEE2E2'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = dangerBtnBg; }}>
                                  {'\uD83D\uDDD1\uFE0F'} {language === 'si' ? 'Izbri\u0161i' : 'Delete'}
                                </button>
                              )}
                              {!isUserSuperAdmin && isUserAdmin && user.role !== 'superadmin' && user.role !== 'admin' && (
                                <button onClick={() => handleRemoveOrgUser(user)} title={t.users.removeFromOrg} style={{ background: dangerBtnBg, border: `1px solid ${dangerBtnBorder}`, borderRadius: radii.lg, padding: '4px 10px', cursor: 'pointer', color: dangerBtnText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.25)' : '#FEE2E2'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = dangerBtnBg; }}>
                                  {'\uD83D\uDDD1\uFE0F'} {t.users.removeFromOrg}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ INSTRUCTIONS TAB ═══ */}
          {activeTab === 'instructions' && isUserAdmin && (
            <div style={{ display: 'flex', gap: '20px', minHeight: '400px' }}>
              <div style={{ width: '200px', flexShrink: 0, borderRight: `1px solid ${colors.border.light}`, paddingRight: '16px' }}>
                {instructionSections.map((section) => (
                  <button key={section} onClick={() => setActiveInstructionSection(section)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: '4px', borderRadius: radii.md, border: 'none', cursor: 'pointer', background: activeInstructionSection === section ? primaryBadgeBg : 'transparent', color: activeInstructionSection === section ? primaryBadgeText : colors.text.body, fontSize: typography.fontSize.xs, fontWeight: activeInstructionSection === section ? typography.fontWeight.semibold : typography.fontWeight.medium }}>
                    {t.instructions.sections[section]}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, margin: '0 0 8px' }}>
                  {t.instructions.sections[activeInstructionSection as keyof typeof t.instructions.sections] || activeInstructionSection}
                </h3>
                <textarea value={editedInstructions[activeInstructionSection] || ''} onChange={(e) => handleInstructionChange(activeInstructionSection, e.target.value)} placeholder={getDefaultPlaceholder(activeInstructionSection)} style={{ ...inputStyle, minHeight: '300px', resize: 'vertical', fontFamily: typography.fontFamily.mono, fontSize: '12px', lineHeight: '1.6' }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button onClick={handleSaveGlobalInstructions} style={{ padding: '8px 20px', borderRadius: radii.lg, border: 'none', background: colors.primary[600], color: '#fff', cursor: 'pointer', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{t.instructions.save}</button>
                  <button onClick={handleResetGlobalInstructions} style={{ padding: '8px 20px', borderRadius: radii.lg, border: `1px solid ${colors.border.light}`, background: colors.surface.card, color: colors.text.body, cursor: 'pointer', fontSize: typography.fontSize.sm }}>{t.instructions.reset}</button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ AI TAB ═══ */}
          {activeTab === 'ai' && (
            <div>
              <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, margin: '0 0 16px' }}>{'\uD83E\uDD16'} {language === 'si' ? 'AI Ponudnik' : 'AI Provider'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {(['gemini', 'openai', 'openrouter'] as AIProviderType[]).map((provider) => {
                  const isActive = aiProvider === provider;
                  const names: Record<string, string> = { gemini: 'Google Gemini', openai: 'OpenAI (ChatGPT)', openrouter: 'OpenRouter' };
                  const icons: Record<string, string> = { gemini: '\uD83D\uDC8E', openai: '\uD83E\uDDE0', openrouter: '\uD83C\uDF10' };
                  return (
                    <button key={provider} onClick={() => handleProviderChange(provider)} style={{ padding: '16px', borderRadius: radii.lg, cursor: 'pointer', textAlign: 'left', border: isActive ? `2px solid ${colors.primary[500]}` : `1px solid ${colors.border.light}`, background: isActive ? primaryBadgeBg : colors.surface.card }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icons[provider]}</div>
                      <div style={{ color: colors.text.heading, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>{names[provider]}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>{aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'openai' ? 'OpenAI' : 'OpenRouter'} API Key</label>
                <input type="password" value={aiProvider === 'gemini' ? geminiKey : aiProvider === 'openai' ? openaiKey : openRouterKey} onChange={(e) => { if (aiProvider === 'gemini') setGeminiKey(e.target.value); else if (aiProvider === 'openai') setOpenaiKey(e.target.value); else setOpenRouterKey(e.target.value); }} placeholder={`Enter ${aiProvider} API key...`} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Model</label>
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} style={{ ...inputStyle, fontFamily: typography.fontFamily.body }}>
                  {currentModels.map((m: any) => <option key={m.id || m} value={m.id || m}>{m.name || m.id || m}</option>)}
                </select>
              </div>
              {message && (<div style={{ padding: '10px 14px', borderRadius: radii.lg, marginBottom: '12px', background: isError ? errorBg : successBg, border: `1px solid ${isError ? errorBorder : successBorder}`, color: isError ? errorText : successText, fontSize: typography.fontSize.sm }}>{isError ? '\u274C' : '\u2705'} {message}</div>)}
              <button onClick={handleAISave} disabled={isValidating} style={{ padding: '10px 24px', borderRadius: radii.lg, border: 'none', background: colors.primary[600], color: '#fff', cursor: isValidating ? 'not-allowed' : 'pointer', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, opacity: isValidating ? 0.7 : 1 }}>
                {isValidating ? (language === 'si' ? 'Preverjam...' : 'Validating...') : (language === 'si' ? 'Shrani nastavitve' : 'Save Settings')}
              </button>
            </div>
          )}

          {/* ═══ PROFILE TAB ═══ */}
          {activeTab === 'profile' && (
            <div>
              <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, margin: '0 0 16px' }}>{'\uD83D\uDC64'} {language === 'si' ? 'Profil & Varnost' : 'Profile & Security'}</h3>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: colors.text.heading, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: '0 0 12px' }}>{'\uD83D\uDD11'} {language === 'si' ? 'Spremeni geslo' : 'Change Password'}</h4>
                <div style={{ display: 'grid', gap: '12px', maxWidth: '400px' }}>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={language === 'si' ? 'Novo geslo' : 'New password'} style={inputStyle} />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={language === 'si' ? 'Potrdi geslo' : 'Confirm password'} style={inputStyle} />
                  <button onClick={handlePasswordChange} style={{ padding: '10px 20px', borderRadius: radii.lg, border: 'none', background: colors.primary[600], color: '#fff', cursor: 'pointer', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, maxWidth: '200px' }}>{language === 'si' ? 'Spremeni geslo' : 'Change Password'}</button>
                </div>
                {message && activeTab === 'profile' && (<div style={{ padding: '10px 14px', borderRadius: radii.lg, marginTop: '12px', background: isError ? errorBg : successBg, border: `1px solid ${isError ? errorBorder : successBorder}`, color: isError ? errorText : successText, fontSize: typography.fontSize.sm, maxWidth: '400px' }}>{isError ? '\u274C' : '\u2705'} {message}</div>)}
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: colors.text.heading, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: '0 0 12px' }}>{'\uD83D\uDD10'} {language === 'si' ? 'Dvofaktorska avtentikacija (2FA)' : 'Two-Factor Authentication (2FA)'}</h4>
                {hasMFA ? (
                  <div>
                    <div style={{ padding: '12px 16px', borderRadius: radii.lg, background: successBg, border: `1px solid ${successBorder}`, color: successText, marginBottom: '12px', fontSize: typography.fontSize.sm }}>{'\u2705'} {language === 'si' ? '2FA je aktiviran' : '2FA is enabled'}</div>
                    {mfaFactors.map((f) => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: `1px solid ${colors.border.light}`, borderRadius: radii.lg, marginBottom: '8px' }}>
                        <span style={{ color: colors.text.body, fontSize: typography.fontSize.sm }}>{f.friendly_name || 'TOTP'}</span>
                        <button onClick={() => handleDisableMFA(f.id)} style={{ padding: '4px 12px', borderRadius: radii.lg, border: `1px solid ${dangerBtnBorder}`, background: dangerBtnBg, color: dangerBtnText, cursor: 'pointer', fontSize: typography.fontSize.xs }}>{language === 'si' ? 'Deaktiviraj' : 'Disable'}</button>
                      </div>
                    ))}
                  </div>
                ) : mfaEnrolling && enrollData ? (
                  <div style={{ maxWidth: '400px' }}>
                    <p style={{ color: colors.text.body, fontSize: typography.fontSize.sm, marginBottom: '12px' }}>{language === 'si' ? 'Skeniraj QR kodo z avtentikatorjem:' : 'Scan this QR code with your authenticator app:'}</p>
                    <QRCodeImage value={enrollData.qrUri} size={200} colors={colors} />
                    <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, margin: '8px 0', fontFamily: typography.fontFamily.mono, wordBreak: 'break-all' }}>{enrollData.secret}</p>
                    <input type="text" maxLength={6} value={enrollCode} onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" style={{ ...inputStyle, maxWidth: '150px', textAlign: 'center', letterSpacing: '4px', fontSize: typography.fontSize.lg, marginBottom: '8px' }} />
                    {enrollError && <p style={{ color: errorText, fontSize: typography.fontSize.xs, margin: '4px 0' }}>{'\u274C'} {enrollError}</p>}
                    <button onClick={handleVerifyMFAEnroll} style={{ padding: '8px 20px', borderRadius: radii.lg, border: 'none', background: colors.primary[600], color: '#fff', cursor: 'pointer', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, display: 'block', marginTop: '8px' }}>{language === 'si' ? 'Potrdi' : 'Verify'}</button>
                  </div>
                ) : (
                  <button onClick={handleStartMFAEnroll} style={{ padding: '10px 20px', borderRadius: radii.lg, border: `1px solid ${colors.border.light}`, background: colors.surface.card, color: colors.text.body, cursor: 'pointer', fontSize: typography.fontSize.sm }}>{language === 'si' ? 'Aktiviraj 2FA' : 'Enable 2FA'}</button>
                )}
              </div>
              {isUserSuperAdmin ? (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ color: colors.text.heading, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: '0 0 12px' }}>{'\uD83C\uDFA8'} {t.whiteLabel.logoTitle}</h4>
                  {customLogo && <img src={customLogo} alt="Custom Logo" style={{ maxWidth: 200, maxHeight: 60, marginBottom: '12px', borderRadius: radii.md }} />}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{ padding: '8px 16px', borderRadius: radii.lg, border: `1px solid ${colors.border.light}`, background: colors.surface.card, color: colors.text.body, cursor: 'pointer', fontSize: typography.fontSize.sm }}>{language === 'si' ? 'Nalo\u017Ei logo' : 'Upload Logo'}<input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} /></label>
                    {customLogo && (<button onClick={handleRemoveLogo} style={{ padding: '8px 16px', borderRadius: radii.lg, border: `1px solid ${dangerBtnBorder}`, background: dangerBtnBg, color: dangerBtnText, cursor: 'pointer', fontSize: typography.fontSize.sm }}>{language === 'si' ? 'Odstrani' : 'Remove'}</button>)}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', borderRadius: radii.lg, background: secondaryInfoBg, border: `1px solid ${secondaryInfoBorder}`, marginBottom: '24px' }}>
                  <h4 style={{ color: secondaryInfoText, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, margin: '0 0 4px' }}>{t.whiteLabel.logoTitle}</h4>
                  <p style={{ color: secondaryInfoText, fontSize: typography.fontSize.xs, margin: 0, opacity: 0.85 }}>{t.whiteLabel.logoNotice}</p>
                </div>
              )}
              <div style={{ marginTop: '32px', padding: '20px', borderRadius: radii.lg, background: dangerBg, border: `1px solid ${dangerBorder}` }}>
                <h4 style={{ color: dangerBtnText, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, margin: '0 0 8px' }}>{'\u26A0\uFE0F'} {t.selfDelete.title}</h4>
                <p style={{ color: isDark ? '#FDA4AF' : '#991B1B', fontSize: typography.fontSize.sm, margin: '0 0 16px', lineHeight: '1.5' }}>{t.selfDelete.warning}</p>
                {storageService.isSuperAdmin() ? (
                  <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, fontStyle: 'italic' }}>{language === 'si' ? 'SuperAdmin ne more izbrisati lastnega ra\u010Duna. Najprej si odvzemite SuperAdmin vlogo.' : 'SuperAdmin cannot delete own account. Demote yourself first.'}</p>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" value={selfDeleteInput} onChange={(e) => setSelfDeleteInput(e.target.value)} placeholder={language === 'si' ? 'Vnesite DELETE' : 'Type DELETE'} style={{ ...inputStyle, maxWidth: '200px', borderColor: dangerBtnBorder }} />
                    <button onClick={handleSelfDelete} disabled={selfDeleteInput !== 'DELETE' || selfDeleteLoading} style={{ padding: '10px 20px', borderRadius: radii.lg, border: 'none', background: selfDeleteInput === 'DELETE' ? '#DC2626' : (isDark ? '#4B1113' : '#FCA5A5'), color: '#fff', cursor: selfDeleteInput === 'DELETE' ? 'pointer' : 'not-allowed', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, opacity: selfDeleteInput === 'DELETE' ? 1 : 0.5 }}>
                      {selfDeleteLoading ? '...' : `\uD83D\uDDD1\uFE0F ${t.selfDelete.button}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ AUDIT LOG TAB ═══ */}
          {activeTab === 'audit' && isUserAdmin && (
            <div>
              <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, margin: '0 0 4px' }}>{t.log.title}</h3>
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, margin: '0 0 16px' }}>{t.log.subtitle}</p>
              {admin.isLoadingLog ? <SkeletonTable rows={5} cols={5} /> : admin.adminLog.length === 0 ? (
                <p style={{ color: colors.text.muted, textAlign: 'center', padding: '40px' }}>{t.log.noEntries}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${colors.border.light}` }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.log.date}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.log.admin}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.log.action}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.log.target}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.log.details}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.adminLog.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: `1px solid ${colors.border.light}`, background: rowDefaultBg }} onMouseEnter={(e) => { e.currentTarget.style.background = rowHoverBg; }} onMouseLeave={(e) => { e.currentTarget.style.background = rowDefaultBg; }}>
                          <td style={{ padding: '10px 12px', color: colors.text.muted, whiteSpace: 'nowrap' }}>{formatDate(entry.createdAt)}</td>
                          <td style={{ padding: '10px 12px', color: colors.text.body }}>{entry.adminEmail}</td>
                          <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: radii.full, background: primaryBadgeBg, border: `1px solid ${primaryBadgeBorder}`, color: primaryBadgeText, fontSize: typography.fontSize.xs }}>{(t.log.actions as Record<string, string>)[entry.action] || entry.action}</span></td>
                          <td style={{ padding: '10px 12px', color: colors.text.body }}>{entry.targetEmail || '\u2014'}</td>
                          <td style={{ padding: '10px 12px', color: colors.text.muted, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.mono, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{JSON.stringify(entry.details).substring(0, 80)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ ERROR LOG TAB ═══ */}
          {activeTab === 'errors' && isUserSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, margin: 0 }}>{'\uD83D\uDC1B'} {t.errors.title}</h3>
                  <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, margin: '4px 0 0' }}>{t.errors.subtitle} {'\u2014'} {errorLogs.length} {language === 'si' ? 'vnosov' : 'entries'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { const text = errorLogService.formatLogsForExport(errorLogs); navigator.clipboard.writeText(text); setToast({ message: t.errors.copied, type: 'success' }); }} style={{ background: colors.primary[600], color: '#fff', border: 'none', borderRadius: radii.lg, padding: '8px 16px', cursor: 'pointer', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{'\uD83D\uDCCB'} {t.errors.copyForDev}</button>
                  <button onClick={async () => { if (!confirm(t.errors.clearConfirm)) return; const result = await errorLogService.clearAllLogs(); if (result.success) { setErrorLogs([]); setToast({ message: t.errors.cleared, type: 'success' }); } }} style={{ background: dangerBtnBg, border: `1px solid ${dangerBtnBorder}`, borderRadius: radii.lg, padding: '8px 16px', cursor: 'pointer', color: dangerBtnText, fontSize: typography.fontSize.sm }}>{'\uD83D\uDDD1\uFE0F'} {t.errors.clearAll}</button>
                </div>
              </div>
              {errorLogsLoading ? <SkeletonTable rows={5} cols={5} /> : errorLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: colors.text.muted }}>{'\u2705'} {t.errors.noErrors}</div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${colors.border.light}`, position: 'sticky', top: 0, background: colors.surface.card, zIndex: 1 }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.errors.date}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.errors.user}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.errors.component}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.errors.error}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.errors.code}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border.light}`, background: rowDefaultBg }} onMouseEnter={(e) => { e.currentTarget.style.background = rowHoverBg; }} onMouseLeave={(e) => { e.currentTarget.style.background = rowDefaultBg; }}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: colors.text.muted }}>{new Date(log.created_at).toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ padding: '10px 12px', color: colors.text.body }}>{log.user_email || '\u2014'}</td>
                          <td style={{ padding: '10px 12px' }}><span style={{ background: primaryBadgeBg, border: `1px solid ${primaryBadgeBorder}`, color: primaryBadgeText, padding: '2px 8px', borderRadius: radii.full, fontSize: typography.fontSize.xs }}>{log.component || '\u2014'}</span></td>
                          <td style={{ padding: '10px 12px', color: colors.text.body, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.error_message}</td>
                          <td style={{ padding: '10px 12px', color: colors.text.muted, fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.xs }}>{log.error_code || '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ KNOWLEDGE BASE TAB ═══ */}
          {activeTab === 'knowledge' && isUserAdmin && (
            <div>
              {/* KB Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ color: colors.text.heading, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, margin: 0 }}>{'\uD83D\uDCDA'} {t.knowledge.title}</h3>
                  <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, margin: '4px 0 0' }}>{t.knowledge.subtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 12px', borderRadius: radii.full, background: primaryBadgeBg, border: `1px solid ${primaryBadgeBorder}`, color: primaryBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>
                    {kbDocuments.length}{isUserSuperAdmin ? ' (\u221E)' : ` / ${knowledgeBaseService.MAX_DOCS_PER_ORG}`} {t.knowledge.docCount}
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: radii.full, background: secondaryInfoBg, border: `1px solid ${secondaryInfoBorder}`, color: secondaryInfoText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>
                    {t.knowledge.maxSize}: {knowledgeBaseService.MAX_FILE_SIZE / 1024 / 1024} MB
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: radii.full, background: warningBadgeBg, border: `1px solid ${warningBadgeBorder}`, color: warningBadgeText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>
                    {t.knowledge.maxPages}: {knowledgeBaseService.MAX_PAGES_PER_DOC}
                  </span>
                </div>
              </div>
              {/* KB Info banner */}
              <div style={{ padding: '12px 16px', borderRadius: radii.lg, marginBottom: '16px', background: secondaryInfoBg, border: `1px solid ${secondaryInfoBorder}`, color: secondaryInfoText, fontSize: typography.fontSize.sm, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {'\uD83D\uDCA1'} {t.knowledge.info}
              </div>
              {/* KB Drag & Drop */}
              <div
                onDrop={handleKBDrop}
                onDragOver={(e) => { e.preventDefault(); setKbDragOver(true); }}
                onDragLeave={() => setKbDragOver(false)}
                onClick={() => document.getElementById('kb-file-input')?.click()}
                style={{ border: `2px dashed ${kbDragOver ? colors.primary[400] : colors.border.light}`, borderRadius: radii.xl, padding: '24px', textAlign: 'center', marginBottom: '20px', background: kbDragOver ? (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)') : 'transparent', transition: `all ${animation.duration.fast}`, cursor: 'pointer' }}
              >
                <input id="kb-file-input" type="file" multiple accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleKBUpload(e.target.files); e.target.value = ''; } }} />
                {kbUploading ? (
                  <div style={{ color: colors.primary[600], fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>{'\u23F3'} {t.knowledge.uploading}</div>
                ) : (
                  <React.Fragment>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{'\uD83D\uDCC4'}</div>
                    <div style={{ color: colors.text.body, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{t.knowledge.dragDrop}</div>
                    <div style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: '4px' }}>{t.knowledge.allowedTypes}</div>
                  </React.Fragment>
                )}
              </div>
              {/* KB Document table */}
              {kbLoading ? <SkeletonTable rows={3} cols={5} /> : kbDocuments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: colors.text.muted, fontSize: typography.fontSize.sm }}>{'\uD83D\uDCC2'} {t.knowledge.noDocuments}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${colors.border.light}` }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.knowledge.fileName}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.knowledge.fileType}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.knowledge.fileSize}</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.knowledge.uploadedAt}</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', color: colors.text.muted, fontWeight: typography.fontWeight.semibold }}>{t.knowledge.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kbDocuments.map((doc) => {
                        const typeIcons: Record<string, string> = { pdf: '\uD83D\uDCD5', docx: '\uD83D\uDCD8', xlsx: '\uD83D\uDCD7', pptx: '\uD83D\uDCD9', jpg: '\uD83D\uDDBC\uFE0F', jpeg: '\uD83D\uDDBC\uFE0F', png: '\uD83D\uDDBC\uFE0F' };
                        const icon = typeIcons[doc.file_type] || '\uD83D\uDCC4';
                        const hasText = doc.extracted_text && doc.extracted_text.length > 50 && !doc.extracted_text.startsWith('[');
                        return (
                          <tr key={doc.id} style={{ borderBottom: `1px solid ${colors.border.light}`, background: rowDefaultBg }} onMouseEnter={(e) => { e.currentTarget.style.background = rowHoverBg; }} onMouseLeave={(e) => { e.currentTarget.style.background = rowDefaultBg; }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '18px' }}>{icon}</span>
                                <div>
                                  <div style={{ color: colors.text.body, fontWeight: typography.fontWeight.medium }}>{doc.file_name}</div>
                                  <div style={{ fontSize: typography.fontSize.xs, color: hasText ? (isDark ? '#6EE7B7' : lightColors.success[600]) : (isDark ? '#FDE68A' : lightColors.warning[600]) }}>
                                    {hasText ? (language === 'si' ? '\u2713 Besedilo ekstrahirano' : '\u2713 Text extracted') : (language === 'si' ? '\u26A0 Brez besedila' : '\u26A0 No text')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: radii.full, background: primaryBadgeBg, border: `1px solid ${primaryBadgeBorder}`, color: primaryBadgeText, fontSize: typography.fontSize.xs, textTransform: 'uppercase' }}>{doc.file_type}</span></td>
                            <td style={{ padding: '10px 12px', color: colors.text.muted }}>{formatFileSize(doc.file_size)}</td>
                            <td style={{ padding: '10px 12px', color: colors.text.muted }}>{formatDate(doc.uploaded_at, true)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <button onClick={() => handleKBDelete(doc)} style={{ background: dangerBtnBg, border: `1px solid ${dangerBtnBorder}`, borderRadius: radii.lg, padding: '4px 10px', cursor: 'pointer', color: dangerBtnText, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.25)' : '#FEE2E2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = dangerBtnBg; }}>
                                {'\uD83D\uDDD1\uFE0F'} {t.knowledge.delete}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
