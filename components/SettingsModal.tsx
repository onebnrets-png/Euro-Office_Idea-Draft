// components/SettingsModal.tsx
// Settings modal with model selection for both Gemini and OpenRouter + 2FA.

import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService.ts';
import { validateProviderKey, OPENROUTER_MODELS, GEMINI_MODELS, type AIProviderType } from '../services/aiProvider.ts';
import { getFullInstructions, saveAppInstructions, resetAppInstructions } from '../services/Instructions.ts';
import { TEXT } from '../locales.ts';

// ─── Lightweight TOTP helpers (no external dependency) ───────────
const base32Decode = (encoded: string): Uint8Array => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of encoded.toUpperCase()) {
        const val = alphabet.indexOf(char);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    return bytes;
};

const hmacSha1 = async (keyBytes: Uint8Array, message: Uint8Array): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, message);
    return new Uint8Array(sig);
};

const verifyTOTP = async (secret: string, userCode: string): Promise<boolean> => {
    const period = 30;
    const keyBytes = base32Decode(secret);
    const now = Math.floor(Date.now() / 1000 / period);
    for (let window = -1; window <= 1; window++) {
        const time = now + window;
        const timeBytes = new Uint8Array(8);
        let t = time;
        for (let i = 7; i >= 0; i--) { timeBytes[i] = t & 0xff; t >>= 8; }
        const hmac = await hmacSha1(keyBytes, timeBytes);
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;
        if (code.toString().padStart(6, '0') === userCode) return true;
    }
    return false;
};

const buildOtpAuthUri = (secret: string, email: string, issuer = 'INTERVENCIJSKA-LOGIKA'): string =>
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

const QRCodeImage = ({ value, size = 200 }: { value: string; size?: number }) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=8`;
    return <img src={url} alt="QR Code" width={size} height={size} className="rounded-lg border border-slate-200" />;
};

const has2FASupport = (): boolean => typeof storageService.get2FASecret === 'function';

// ─── Component ───────────────────────────────────────────────────

const SettingsModal = ({ isOpen, onClose, language }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // General State
    const [aiProvider, setAiProvider] = useState<AIProviderType>('gemini');
    const [geminiKey, setGeminiKey] = useState('');
    const [openRouterKey, setOpenRouterKey] = useState('');
    const [modelName, setModelName] = useState('');

    // Profile State (Logo)
    const [customLogo, setCustomLogo] = useState<string | null>(null);

    // Security State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // 2FA State
    const [twoFASecret, setTwoFASecret] = useState('');
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFAAvailable, setTwoFAAvailable] = useState(false);
    const [showEnroll2FA, setShowEnroll2FA] = useState(false);
    const [enrollVerifyCode, setEnrollVerifyCode] = useState('');
    const [enrollError, setEnrollError] = useState('');

    // Instructions State
    const [instructions, setInstructions] = useState<any>(null);

    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const t = TEXT[language].auth;

    useEffect(() => {
        if (isOpen) {
            loadAllSettings();
        }
    }, [isOpen]);

    const loadAllSettings = async () => {
        setIsLoading(true);

        const role = storageService.getUserRole();
        setIsAdmin(role === 'admin');

        await storageService.loadSettings();

        const provider = storageService.getAIProvider() || 'gemini';
        setAiProvider(provider);

        const gKey = storageService.getApiKey();
        if (gKey) setGeminiKey(gKey);

        const orKey = storageService.getOpenRouterKey();
        if (orKey) setOpenRouterKey(orKey);

        const model = storageService.getCustomModel();
        if (model) setModelName(model);
        else setModelName(provider === 'gemini' ? 'gemini-3-pro-preview' : 'deepseek/deepseek-v3.2');

        const logo = storageService.getCustomLogo();
        setCustomLogo(logo);

        setInstructions(getFullInstructions());

        // Load 2FA status (safe — only if localStorage auth is available)
        try {
            if (has2FASupport()) {
                const email = storageService.getCurrentUser?.() || '';
                if (email) {
                    const result = await storageService.get2FASecret(email);
                    if (result?.success && result?.secret) {
                        setTwoFASecret(result.secret);
                        const users = JSON.parse(localStorage.getItem('eu_app_users') || '[]');
                        const user = users.find((u: any) => u.email === email);
                        setTwoFAEnabled(user?.isVerified === true);
                        setTwoFAAvailable(true);
                    }
                }
            } else {
                setTwoFAAvailable(false);
            }
        } catch {
            setTwoFAAvailable(false);
        }

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowEnroll2FA(false);
        setEnrollVerifyCode('');
        setEnrollError('');
        setMessage('');
        setIsError(false);
        setActiveTab('general');
        setIsLoading(false);
    };

    const handleProviderChange = (provider: AIProviderType) => {
        setAiProvider(provider);
        if (provider === 'gemini' && !modelName.startsWith('gemini')) {
            setModelName('gemini-3-pro-preview');
        } else if (provider === 'openrouter' && modelName.startsWith('gemini')) {
            setModelName('deepseek/deepseek-v3.2');
        }
    };

    const handleGeneralSave = async () => {
        setIsValidating(true);
        setMessage(t.validating || "Validating...");
        setIsError(false);

        await storageService.setAIProvider(aiProvider);
        await storageService.setCustomModel(modelName.trim());
        await storageService.setApiKey(geminiKey.trim());
        await storageService.setOpenRouterKey(openRouterKey.trim());

        const activeKey = aiProvider === 'gemini' ? geminiKey.trim() : openRouterKey.trim();

        if (activeKey === '') {
            setMessage(language === 'si' ? 'Nastavitve shranjene.' : 'Settings saved.');
            setIsValidating(false);
            setTimeout(() => { onClose(); }, 1000);
            return;
        }

        const isValid = await validateProviderKey(aiProvider, activeKey);
        setIsValidating(false);

        if (isValid) {
            setMessage(language === 'si' ? 'API ključ potrjen in shranjen!' : 'API Key validated and saved!');
            setTimeout(() => { onClose(); }, 1000);
        } else {
            setIsError(true);
            setMessage(t.invalidKey || "Invalid API Key");
        }
    };

    const handlePasswordChange = async () => {
        setMessage('');
        setIsError(false);

        if (!newPassword || !confirmPassword) {
            setIsError(true);
            setMessage(language === 'si' ? "Prosim izpolnite polja za novo geslo." : "Please fill password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setIsError(true);
            setMessage(t.passwordMismatch || "Passwords do not match.");
            return;
        }

        const result = await storageService.changePassword(currentPassword, newPassword);
        if (result.success) {
            setMessage(t.passwordChanged || "Password changed!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setIsError(true);
            setMessage(result.message || t.incorrectPassword || "Password change failed.");
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                setCustomLogo(base64String);
                await storageService.saveCustomLogo(base64String);
                setMessage(t.logoUpdated || "Logo updated!");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = async () => {
        setCustomLogo(null);
        await storageService.saveCustomLogo(null);
        setMessage(language === 'si' ? "Logo odstranjen." : "Logo removed.");
    };

    // ─── 2FA Handlers ────────────────────────────────────────────
    const handleStart2FAEnroll = () => { setShowEnroll2FA(true); setEnrollVerifyCode(''); setEnrollError(''); };

    const handleVerify2FAEnroll = async () => {
        setEnrollError('');
        if (enrollVerifyCode.length !== 6) { setEnrollError(language === 'si' ? 'Vnesi 6-mestno kodo.' : 'Enter a 6-digit code.'); return; }
        const isValid = await verifyTOTP(twoFASecret, enrollVerifyCode);
        if (isValid) {
            const email = storageService.getCurrentUser?.() || '';
            const users = JSON.parse(localStorage.getItem('eu_app_users') || '[]');
            const idx = users.findIndex((u: any) => u.email === email);
            if (idx !== -1) { users[idx].isVerified = true; localStorage.setItem('eu_app_users', JSON.stringify(users)); }
            setTwoFAEnabled(true); setShowEnroll2FA(false);
            setMessage(language === 'si' ? '2FA uspešno aktiviran!' : '2FA enabled successfully!'); setIsError(false);
        } else { setEnrollError(language === 'si' ? 'Napačna koda. Poskusi znova.' : 'Invalid code. Try again.'); }
    };

    const handleDisable2FA = () => {
        if (!confirm(language === 'si' ? 'Ali res želiš deaktivirati 2FA?' : 'Disable two-factor authentication?')) return;
        const email = storageService.getCurrentUser?.() || '';
        const users = JSON.parse(localStorage.getItem('eu_app_users') || '[]');
        const idx = users.findIndex((u: any) => u.email === email);
        if (idx !== -1) {
            users[idx].isVerified = false;
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let s = '';
            for (let i = 0; i < 16; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
            users[idx].twoFactorSecret = s; localStorage.setItem('eu_app_users', JSON.stringify(users)); setTwoFASecret(s);
        }
        setTwoFAEnabled(false); setShowEnroll2FA(false);
        setMessage(language === 'si' ? '2FA deaktiviran.' : '2FA disabled.'); setIsError(false);
    };

    // ─── Instructions Handlers ───────────────────────────────────
    const handleInstructionsChange = (chapterKey: string, value: string) => {
        const lines = value.split('\n').filter(line => line.trim() !== '');
        setInstructions((prev: any) => ({ ...prev, CHAPTERS: { ...prev.CHAPTERS, [chapterKey]: { ...prev.CHAPTERS[chapterKey], RULES: lines } } }));
    };

    const handleGlobalRulesChange = (value: string) => {
        const lines = value.split('\n').filter(line => line.trim() !== '');
        setInstructions((prev: any) => ({ ...prev, GLOBAL_RULES: lines }));
    };

    const handleSaveInstructions = async () => { await saveAppInstructions(instructions); setMessage(language === 'si' ? "Navodila posodobljena!" : "Instructions updated!"); };

    const handleResetInstructions = async () => {
        if (!confirm(language === 'si' ? "Povrni navodila na privzete?" : "Revert to defaults?")) return;
        await resetAppInstructions(); setInstructions(getFullInstructions());
        setMessage(language === 'si' ? "Navodila povrnjena." : "Instructions reverted.");
    };

    const handleSave = () => {
        if (activeTab === 'general') handleGeneralSave();
        else if (activeTab === 'security') handlePasswordChange();
        else if (activeTab === 'instructions') handleSaveInstructions();
        else if (activeTab === 'profile') onClose();
    };

    if (!isOpen) return null;

    const currentModels = aiProvider === 'gemini' ? GEMINI_MODELS : OPENROUTER_MODELS;
    const userEmail = (typeof storageService.getCurrentUser === 'function' ? storageService.getCurrentUser() : '') || '';
    const otpAuthUri = twoFASecret ? buildOtpAuthUri(twoFASecret, userEmail) : '';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">{t.settings}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                </div>

                <div className="flex border-b border-slate-200 overflow-x-auto">
                    <button className={`flex-1 py-3 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'general' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => { setActiveTab('general'); setMessage(''); }}>{t.tabGeneral || "General"}</button>
                    <button className={`flex-1 py-3 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'profile' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => { setActiveTab('profile'); setMessage(''); }}>{t.tabProfile || "Profile"}</button>
                    <button className={`flex-1 py-3 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'security' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => { setActiveTab('security'); setMessage(''); }}>{t.tabSecurity || "Security"}</button>
                    {isAdmin && (
                        <button className={`flex-1 py-3 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'instructions' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => { setActiveTab('instructions'); setMessage(''); }}>
                            {language === 'si' ? 'Navodila (Admin)' : 'Instructions (Admin)'}
                        </button>
                    )}
                </div>

                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-3 text-slate-500">{language === 'si' ? 'Nalaganje...' : 'Loading...'}</span>
                        </div>
                    ) : (
                        <>
                            {/* ═══ GENERAL TAB ═══ */}
                            {activeTab === 'general' && (
                                <>
                                    <div className="mb-5">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'si' ? 'AI ponudnik' : 'AI Provider'}</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => handleProviderChange('gemini')}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${aiProvider === 'gemini' ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                                                <div className="font-semibold text-sm text-slate-800">Google Gemini</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{language === 'si' ? 'Direktna povezava' : 'Direct connection'}</div>
                                            </button>
                                            <button type="button" onClick={() => handleProviderChange('openrouter')}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${aiProvider === 'openrouter' ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                                                <div className="font-semibold text-sm text-slate-800">OpenRouter</div>
                                                <div className="text-xs text-slate-500 mt-0.5">GPT-4o, Claude, Mistral...</div>
                                            </button>
                                        </div>
                                    </div>

                                    {aiProvider === 'gemini' && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'si' ? 'Google Gemini API ključ' : 'Google Gemini API Key'}</label>
                                            <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..." className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 font-mono text-sm" />
                                            <p className="text-xs text-slate-400 mt-1">{language === 'si' ? 'Pridobite ključ na aistudio.google.com' : 'Get your key at aistudio.google.com'}</p>
                                        </div>
                                    )}

                                    {aiProvider === 'openrouter' && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">OpenRouter API Key</label>
                                            <input type="password" value={openRouterKey} onChange={(e) => setOpenRouterKey(e.target.value)} placeholder="sk-or-..." className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 font-mono text-sm" />
                                            <p className="text-xs text-slate-400 mt-1">{language === 'si' ? 'Pridobite ključ na openrouter.ai/keys' : 'Get your key at openrouter.ai/keys'}</p>
                                        </div>
                                    )}

                                    <div className="mb-4 pt-4 border-t border-slate-100">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'si' ? 'AI model' : 'AI Model'}</label>
                                        <select value={currentModels.some(m => m.id === modelName) ? modelName : ''} onChange={(e) => setModelName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 text-sm">
                                            {!currentModels.some(m => m.id === modelName) && modelName && (<option value={modelName}>{modelName} ({language === 'si' ? 'ročno vnesen' : 'custom'})</option>)}
                                            {currentModels.map(m => (<option key={m.id} value={m.id}>{m.name} – {m.description}</option>))}
                                        </select>
                                        <div className="mt-2">
                                            <label className="block text-xs text-slate-500 mb-1">{language === 'si' ? 'Ali vnesite ID modela ročno:' : 'Or enter model ID manually:'}</label>
                                            <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder={aiProvider === 'gemini' ? "gemini-3-pro-preview" : "e.g. openai/gpt-4o"} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 font-mono text-xs" />
                                        </div>
                                    </div>

                                    {aiProvider === 'gemini' && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
                                            <strong>Google Gemini</strong>{language === 'si' ? ' – brezplačna kvota za razvoj.' : ' – free tier for development.'}
                                            <br /><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold mt-1 inline-block">aistudio.google.com</a>
                                        </div>
                                    )}
                                    {aiProvider === 'openrouter' && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                                            <strong>OpenRouter</strong>{language === 'si' ? ' omogoča dostop do 100+ AI modelov.' : ' gives you access to 100+ AI models.'}
                                            <br /><a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline font-semibold mt-1 inline-block">openrouter.ai</a>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ═══ PROFILE TAB ═══ */}
                            {activeTab === 'profile' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.logoLabel || "Custom Logo"}</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 border border-slate-200 rounded-md flex items-center justify-center bg-slate-50 overflow-hidden">
                                            {customLogo ? <img src={customLogo} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">Default</span>}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="cursor-pointer px-3 py-1.5 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 text-center">
                                                {t.uploadLogo || "Upload"}
                                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                            </label>
                                            {customLogo && <button onClick={handleRemoveLogo} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-100">{t.removeLogo || "Remove"}</button>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ═══ SECURITY TAB ═══ */}
                            {activeTab === 'security' && (
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-3">{t.changePassword}</h4>
                                        <p className="text-xs text-slate-500 mb-3">{language === 'si' ? 'Vnesite novo geslo.' : 'Enter your new password.'}</p>
                                        <div className="space-y-3">
                                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.newPassword} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.confirmNewPassword} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                                        </div>
                                    </div>

                                    {/* ─── 2FA Section (only if localStorage auth available) ─── */}
                                    {twoFAAvailable && (
                                        <div className="border-t border-slate-200 pt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-700">{language === 'si' ? 'Dvostopenjsko preverjanje (2FA)' : 'Two-Factor Authentication (2FA)'}</h4>
                                                    <p className="text-sm text-slate-500 mt-1">{language === 'si' ? 'Uporabi authenticator aplikacijo za dodatno zaščito.' : 'Use an authenticator app for extra security.'}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${twoFAEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {twoFAEnabled ? (language === 'si' ? 'AKTIVNO' : 'ACTIVE') : (language === 'si' ? 'NEAKTIVNO' : 'INACTIVE')}
                                                </div>
                                            </div>

                                            {twoFAEnabled && !showEnroll2FA && (
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                        <p className="text-sm text-green-800 font-medium">{language === 'si' ? 'Račun je zaščiten z 2FA.' : 'Account is protected with 2FA.'}</p>
                                                    </div>
                                                    <button onClick={handleDisable2FA} className="px-4 py-2 text-sm bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors">{language === 'si' ? 'Deaktiviraj 2FA' : 'Disable 2FA'}</button>
                                                </div>
                                            )}

                                            {!twoFAEnabled && !showEnroll2FA && (
                                                <button onClick={handleStart2FAEnroll} className="px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold transition-colors flex items-center gap-2 shadow-sm">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    {language === 'si' ? 'Nastavi 2FA' : 'Set up 2FA'}
                                                </button>
                                            )}

                                            {showEnroll2FA && (
                                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
                                                    <div>
                                                        <h5 className="font-bold text-slate-700 mb-2">{language === 'si' ? '1. Skeniraj QR kodo' : '1. Scan QR Code'}</h5>
                                                        <p className="text-sm text-slate-500 mb-4">{language === 'si' ? 'Odpri authenticator aplikacijo in skeniraj QR kodo.' : 'Open your authenticator app and scan the QR code.'}</p>
                                                        <div className="flex justify-center p-4 bg-white rounded-lg border border-slate-200"><QRCodeImage value={otpAuthUri} size={200} /></div>
                                                        <div className="mt-3 text-center">
                                                            <p className="text-xs text-slate-400 mb-1">{language === 'si' ? 'Ali ročno vnesi ključ:' : 'Or enter key manually:'}</p>
                                                            <code className="text-sm font-mono bg-white px-3 py-1.5 rounded border border-slate-200 text-slate-700 select-all tracking-widest">{twoFASecret}</code>
                                                        </div>
                                                    </div>
                                                    <div className="border-t border-slate-200 pt-4">
                                                        <h5 className="font-bold text-slate-700 mb-2">{language === 'si' ? '2. Vnesi kodo' : '2. Enter Code'}</h5>
                                                        {enrollError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">{enrollError}</div>}
                                                        <div className="flex gap-3">
                                                            <input type="text" value={enrollVerifyCode} onChange={(e) => setEnrollVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} className="flex-1 p-3 border border-slate-300 rounded-lg text-center text-xl tracking-widest font-mono focus:ring-2 focus:ring-sky-500" autoFocus onKeyDown={(e) => e.key === 'Enter' && enrollVerifyCode.length === 6 && handleVerify2FAEnroll()} />
                                                            <button onClick={handleVerify2FAEnroll} disabled={enrollVerifyCode.length !== 6} className="px-5 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold disabled:opacity-50 transition-colors">{language === 'si' ? 'Potrdi' : 'Verify'}</button>
                                                        </div>
                                                    </div>
                                                    <div className="text-right"><button onClick={() => setShowEnroll2FA(false)} className="text-sm text-slate-500 hover:text-slate-700 underline">{language === 'si' ? 'Prekliči' : 'Cancel'}</button></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══ INSTRUCTIONS TAB ═══ */}
                            {activeTab === 'instructions' && instructions && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-sky-50 border border-sky-200 rounded text-sm text-sky-800">
                                        <strong>{language === 'si' ? 'Administratorski način' : 'Admin Mode'}:</strong>{' '}
                                        {language === 'si' ? 'Uredite pravila za AI generiranje.' : 'Edit rules for AI generation.'}
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">{language === 'si' ? 'Globalna pravila' : 'Global Rules'}</label>
                                        <textarea className="w-full p-2 border border-slate-300 rounded text-sm font-mono h-32" value={instructions.GLOBAL_RULES?.join('\n') || ''} onChange={(e) => handleGlobalRulesChange(e.target.value)} />
                                    </div>
                                    {instructions.CHAPTERS && Object.entries(instructions.CHAPTERS).map(([key, chapter]: [string, any]) => (
                                        <div key={key} className="border-t border-slate-200 pt-4">
                                            <h5 className="font-bold text-sky-700 mb-2">{chapter.title}</h5>
                                            <textarea className="w-full p-2 border border-slate-300 rounded text-sm font-mono h-32" value={chapter.RULES?.join('\n') || ''} onChange={(e) => handleInstructionsChange(key, e.target.value)} />
                                        </div>
                                    ))}
                                    <button onClick={handleResetInstructions} className="text-red-500 text-xs hover:underline">{language === 'si' ? 'Povrni na privzete' : 'Revert to Defaults'}</button>
                                </div>
                            )}

                            {message && (
                                <div className={`mt-4 text-sm font-semibold p-2 rounded text-center ${isError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>
                            )}
                        </>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isValidating} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-md disabled:opacity-50">{TEXT[language].modals.closeBtn}</button>
                    <button onClick={handleSave} disabled={isValidating || isLoading} className="px-4 py-2 text-sm bg-sky-600 text-white hover:bg-sky-700 rounded-md disabled:opacity-50 flex items-center gap-2">
                        {isValidating && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {activeTab === 'security' ? t.changePassword : t.save}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
