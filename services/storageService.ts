// services/storageService.ts
// ═══════════════════════════════════════════════════════════════
// Supabase-backed storage service — replaces localStorage completely
// v5.3 — 2026-03-02
// ★ v5.3: getAdminTabOrder() + setAdminTabOrder() for drag & drop tab reordering
//
// CHANGES:
//   ★ v5.3: FULL ERROR LOGGING — every console.error/warn now also
//           calls logErrorQuick() to persist errors in error_log DB table.
//           — login, register, restoreSession, loadSettings, updateSettings,
//             getUserProjects, createProject, deleteProject, saveProject,
//             loadProject, ensureUserHasOrg, ensureApiKeySaved, MFA methods
//           — ALL errors are now captured for admin Error Log panel export.
//   ★ v5.2: register() accepts firstName + lastName
//           → Stores first_name, last_name in user_metadata
//           → display_name = "FirstName LastName"
//           → handle_new_user() trigger reads these into profiles
//   ★ v5.1: Robust first-login setup after email confirmation
//     → ensureUserHasOrg() creates org via SECURITY DEFINER RPC if missing
//     → ensureApiKeySaved() saves API key from user_metadata if not yet in DB
//     → login() and restoreSession() call both + reload settings
//     → register() stores org_name, api_key, api_provider in user_metadata
//     → Works with email confirmation ON or OFF
//   ★ v5.0: Registration + Email Confirmation fix
//   ★ v4.0: register() accepts orgName parameter
//   ★ v3.0: Multi-Tenant Organization integration
//   v2.2: isSuperAdmin(), isAdminOrSuperAdmin(), getSuperAdminEmail()
//   v2.1: OpenAI key support, register() accepts apiProvider
//   v2.0: DB-1/DB-2/DB-3 fixes
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient.ts';
import { createEmptyProjectData } from '../utils.ts';
import type { AIProviderType } from './aiProvider.ts';
import { BRAND_ASSETS } from '../constants.tsx';
import { organizationService } from './organizationService.ts';
import { logErrorQuick } from './errorLogService.ts';

// ─── ID GENERATOR ────────────────────────────────────────────────
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// ─── SUPERADMIN EMAIL (genesis, hardcoded) ───────────────────────
const SUPERADMIN_EMAIL = 'beno.stern@infinita.si';

// ─── LOCAL CACHE ─────────────────────────────────────────────────
let cachedUser: { id: string; email: string; displayName: string; role: string } | null = null;
let cachedSettings: Record<string, any> | null = null;
let cachedProjectsMeta: any[] | null = null;

// ─── HELPER ──────────────────────────────────────────────────────
async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

// ─── ★ v5.1: Create org on first login via SECURITY DEFINER RPC ─
async function ensureUserHasOrg(userId: string, userMeta?: Record<string, any>): Promise<void> {
  try {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1);

    if (membership && membership.length > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('id', userId)
        .single();

      if (!profile?.active_organization_id) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ active_organization_id: membership[0].organization_id })
          .eq('id', userId);

        if (updateErr) {
          console.warn('ensureUserHasOrg: Failed to set active_organization_id:', updateErr.message);
          logErrorQuick('storageService.ensureUserHasOrg.setActiveOrg', updateErr, { userId });
        }
      }
      return;
    }

    const orgName = userMeta?.org_name || userMeta?.display_name || 'My Organization';
    console.log(`ensureUserHasOrg: No org found. Creating "${orgName}" for user ${userId}`);

    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_org_for_new_user', {
      p_user_id: userId,
      p_org_name: orgName
    });

    if (rpcError) {
      console.error('ensureUserHasOrg: RPC error:', rpcError.message);
      logErrorQuick('storageService.ensureUserHasOrg.rpc', rpcError, { userId, orgName });
      return;
    }

    if (rpcResult?.success) {
      console.log(`ensureUserHasOrg: ✅ Org created with ID ${rpcResult.orgId}`);
    } else {
      console.warn('ensureUserHasOrg: RPC returned failure:', rpcResult?.message);
      logErrorQuick('storageService.ensureUserHasOrg.rpcFailure', { message: rpcResult?.message || 'RPC returned failure' }, { userId, orgName });
    }
  } catch (err) {
    console.error('ensureUserHasOrg: Unexpected error:', err);
    logErrorQuick('storageService.ensureUserHasOrg', err, { userId });
  }
}

// ─── ★ v5.1: Save API key from user_metadata on first login ─────
async function ensureApiKeySaved(userId: string, userMeta?: Record<string, any>): Promise<void> {
  try {
    const metaApiKey = userMeta?.api_key;
    const metaApiProvider = (userMeta?.api_provider || 'gemini') as AIProviderType;

    if (!metaApiKey || metaApiKey.trim() === '') return;

    const keyColumn = metaApiProvider === 'openai' ? 'openai_key'
                    : metaApiProvider === 'openrouter' ? 'openrouter_key'
                    : 'gemini_key';

    const { data: settings } = await supabase
      .from('user_settings')
      .select(keyColumn)
      .eq('user_id', userId)
      .single();

    if (settings && settings[keyColumn]) return;

    console.log(`ensureApiKeySaved: Saving ${keyColumn} from user_metadata for user ${userId}`);

    const { error } = await supabase
      .from('user_settings')
      .update({ [keyColumn]: metaApiKey.trim(), ai_provider: metaApiProvider })
      .eq('user_id', userId);

    if (error) {
      console.warn('ensureApiKeySaved: update failed, trying upsert...', error.message);
      logErrorQuick('storageService.ensureApiKeySaved.update', error, { userId, keyColumn });

      const { error: upsertErr } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: userId, [keyColumn]: metaApiKey.trim(), ai_provider: metaApiProvider },
          { onConflict: 'user_id' }
        );

      if (upsertErr) {
        console.error('ensureApiKeySaved: upsert also failed:', upsertErr.message);
        logErrorQuick('storageService.ensureApiKeySaved.upsert', upsertErr, { userId, keyColumn });
        return;
      }
    }

    if (cachedSettings) {
      cachedSettings[keyColumn] = metaApiKey.trim();
      cachedSettings.ai_provider = metaApiProvider;
    }

    console.log('ensureApiKeySaved: ✅ API key saved successfully');
  } catch (err) {
    console.error('ensureApiKeySaved: Unexpected error:', err);
    logErrorQuick('storageService.ensureApiKeySaved', err, { userId });
  }
}

export const storageService = {

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logErrorQuick('storageService.login', error, { email });
      return { success: false, message: error.message };
    }

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.warn('login: profiles query failed:', profileError.message);
        logErrorQuick('storageService.login.profileFetch', profileError, { email, userId: data.user.id });
      }

      cachedUser = {
        id: data.user.id,
        email: profile?.email || data.user.email || email,
        displayName: profile?.display_name
          || data.user.user_metadata?.display_name
          || email.split('@')[0],
        role: profile?.role || 'user'
      };

      await this.loadSettings();

      // ★ v5.1: Ensure org exists + API key is saved (first login after email confirmation)
      const meta = data.user.user_metadata || {};
      await ensureUserHasOrg(data.user.id, meta);
      await ensureApiKeySaved(data.user.id, meta);
      await organizationService.loadActiveOrg();

      // ★ v5.1: Reload settings after potential API key save
      await this.loadSettings();

      return {
        success: true,
        email: cachedUser.email,
        displayName: cachedUser.displayName,
        role: cachedUser.role
      };
    }

    return { success: false, message: 'Login failed' };
  },

  // ★ v5.2: register() now accepts firstName + lastName
  async register(
    email: string,
    displayName: string,
    password: string,
    apiKey: string = '',
    apiProvider: AIProviderType = 'gemini',
    orgName: string = '',
    firstName: string = '',
    lastName: string = ''
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          org_name: orgName && orgName.trim() !== '' ? orgName.trim() : (displayName || email.split('@')[0]) + "'s Organization",
          api_key: apiKey && apiKey.trim() !== '' ? apiKey.trim() : '',
          api_provider: apiProvider || 'gemini'
        }
      }
    });

    if (error) {
      logErrorQuick('storageService.register', error, { email });
      if (error.message.includes('already registered')) {
        return { success: false, message: 'Email already registered' };
      }
      return { success: false, message: error.message };
    }

    if (data.user) {
      // ★ v5.1: Check if email confirmation is required
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // Email confirmation is ON — user must verify email first
        return {
          success: true,
          email,
          displayName: displayName || email.split('@')[0],
          role: 'admin',
          needsEmailConfirmation: true
        };
      }

      // Email confirmation is OFF — user has immediate session, proceed normally
      await new Promise(r => setTimeout(r, 1500));

      // Save API key directly
      if (apiKey && apiKey.trim() !== '') {
        const keyColumn = apiProvider === 'openai' ? 'openai_key'
                        : apiProvider === 'openrouter' ? 'openrouter_key'
                        : 'gemini_key';

        const { error: keyError } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: data.user.id,
              [keyColumn]: apiKey.trim(),
              ai_provider: apiProvider
            },
            { onConflict: 'user_id' }
          );

        if (keyError) {
          console.warn('register: Failed to save API key via upsert, trying update...', keyError.message);
          logErrorQuick('storageService.register.apiKeyUpsert', keyError, { email, keyColumn });

          const { error: updateErr } = await supabase
            .from('user_settings')
            .update({ [keyColumn]: apiKey.trim(), ai_provider: apiProvider })
            .eq('user_id', data.user.id);

          if (updateErr) {
            logErrorQuick('storageService.register.apiKeyUpdate', updateErr, { email, keyColumn });
          }
        }
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        logErrorQuick('storageService.register.profileFetch', profileError, { email, userId: data.user.id });
      }

      cachedUser = {
        id: data.user.id,
        email: email,
        displayName: profile?.display_name || displayName || email.split('@')[0],
        role: profile?.role || 'admin'
      };

      await this.loadSettings();

      const meta = data.user.user_metadata || {};
      await ensureUserHasOrg(data.user.id, meta);
      await ensureApiKeySaved(data.user.id, meta);
      await organizationService.loadActiveOrg();
      await this.loadSettings();

      // Force key into cache
      if (apiKey && apiKey.trim() !== '' && cachedSettings) {
        const keyColumn = apiProvider === 'openai' ? 'openai_key'
                        : apiProvider === 'openrouter' ? 'openrouter_key'
                        : 'gemini_key';
        if (!cachedSettings[keyColumn]) {
          cachedSettings[keyColumn] = apiKey.trim();
          cachedSettings.ai_provider = apiProvider;
        }
      } else if (apiKey && apiKey.trim() !== '' && !cachedSettings) {
        const keyColumn = apiProvider === 'openai' ? 'openai_key'
                        : apiProvider === 'openrouter' ? 'openrouter_key'
                        : 'gemini_key';
        cachedSettings = { [keyColumn]: apiKey.trim(), ai_provider: apiProvider };
      }

      return {
        success: true,
        email,
        displayName: cachedUser.displayName,
        role: cachedUser.role
      };
    }

    return { success: false, message: 'Registration failed' };
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      logErrorQuick('storageService.changePassword', error);
      return { success: false, message: error.message };
    }
    return { success: true };
  },

  // ═══════════════════════════════════════════════════════════════
  // SESSION
  // ═══════════════════════════════════════════════════════════════

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logErrorQuick('storageService.logout', err);
    }
    cachedUser = null;
    cachedSettings = null;
    cachedProjectsMeta = null;
    organizationService.clearCache();
  },

  getCurrentUser(): string | null {
    return cachedUser?.email || null;
  },

  getCurrentUserDisplayName(): string | null {
    return cachedUser?.displayName || null;
  },

  getUserRole(): string {
    return cachedUser?.role || 'user';
  },

  isSuperAdmin(): boolean {
    return cachedUser?.role === 'superadmin';
  },

  isAdminOrSuperAdmin(): boolean {
    return cachedUser?.role === 'admin' || cachedUser?.role === 'superadmin';
  },

  getSuperAdminEmail(): string {
    return SUPERADMIN_EMAIL;
  },

  getActiveOrgId(): string | null {
    return organizationService.getActiveOrgId();
  },

  getActiveOrgName(): string {
    return organizationService.getActiveOrgName();
  },

  async getCurrentUserId(): Promise<string | null> {
    if (cachedUser?.id) return cachedUser.id;
    return await getAuthUserId();
  },

  async restoreSession() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const userId = data.session.user.id;
        const authUser = data.session.user;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.warn('restoreSession: profiles query failed:', profileError.message);
          logErrorQuick('storageService.restoreSession.profileFetch', profileError, { userId });
        }

        cachedUser = {
          id: userId,
          email: profile?.email || authUser.email || '',
          displayName: profile?.display_name
            || authUser.user_metadata?.display_name
            || authUser.email?.split('@')[0]
            || 'User',
          role: profile?.role || 'user'
        };

        await this.loadSettings();

        // ★ v5.1: Ensure org exists + API key saved on session restore
        const meta = authUser.user_metadata || {};
        await ensureUserHasOrg(userId, meta);
        await ensureApiKeySaved(userId, meta);
        await organizationService.loadActiveOrg();

        // ★ v5.1: Reload settings after potential API key save
        await this.loadSettings();

        return cachedUser.email;
      }
      return null;
    } catch (err) {
      console.error('restoreSession: Unexpected error:', err);
      logErrorQuick('storageService.restoreSession', err);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // USER SETTINGS
  // ═══════════════════════════════════════════════════════════════

  async loadSettings() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      if (!cachedSettings) cachedSettings = {};
      return null;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.warn('loadSettings error:', error.message);
      logErrorQuick('storageService.loadSettings', error, { userId });
      if (!cachedSettings) cachedSettings = {};
      return null;
    }

    cachedSettings = data || {};
    return data;
  },

  async ensureSettingsLoaded() {
    if (cachedSettings === null) {
      await this.loadSettings();
    }
  },

  async updateSettings(updates: Record<string, any>) {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('updateSettings error:', error.message);
      logErrorQuick('storageService.updateSettings', error, { userId, keys: Object.keys(updates) });
      return;
    }

    if (cachedSettings === null) {
      cachedSettings = { ...updates };
    } else {
      cachedSettings = { ...cachedSettings, ...updates };
    }
  },

  getAIProvider(): AIProviderType {
    return (cachedSettings?.ai_provider as AIProviderType) || 'gemini';
  },

  async setAIProvider(provider: AIProviderType) {
    await this.updateSettings({ ai_provider: provider });
  },

  getApiKey(): string | null {
    return cachedSettings?.gemini_key || null;
  },

  async setApiKey(key: string) {
    await this.updateSettings({ gemini_key: key.trim() || null });
  },

  async clearApiKey() {
    await this.updateSettings({ gemini_key: null });
  },

  getOpenRouterKey(): string | null {
    return cachedSettings?.openrouter_key || null;
  },

  async setOpenRouterKey(key: string) {
    await this.updateSettings({ openrouter_key: key.trim() || null });
  },

  getOpenAIKey(): string | null {
    return cachedSettings?.openai_key || null;
  },

  async setOpenAIKey(key: string) {
    await this.updateSettings({ openai_key: key.trim() || null });
  },

  getCustomModel(): string | null {
    return cachedSettings?.model || null;
  },

  async setCustomModel(model: string) {
    await this.updateSettings({ model: model.trim() || null });
  },

  getSecondaryModel(): string | null {
    return cachedSettings?.secondary_model || null;
  },

  async setSecondaryModel(model: string) {
    await this.updateSettings({ secondary_model: model.trim() || null });
  },

  getCustomLogo(): string | null {
    if (this.isSuperAdmin()) {
      return cachedSettings?.custom_logo || null;
    }
    return null;
  },

  getEffectiveLogo(): string {
    if (this.isSuperAdmin()) {
      const customLogo = cachedSettings?.custom_logo;
      if (customLogo) return customLogo;
    }
    return BRAND_ASSETS.logoText;
  },

  async saveCustomLogo(base64Data: string | null) {
    if (!this.isSuperAdmin()) {
      console.warn('saveCustomLogo: Only superadmin can change the logo.');
      return;
    }
    await this.updateSettings({ custom_logo: base64Data });
  },

  getCustomInstructions(): any {
    return cachedSettings?.custom_instructions || null;
  },

  async saveCustomInstructions(instructions: any) {
    await this.updateSettings({ custom_instructions: instructions });
  },

  // ═══════════════════════════════════════════════════════════════
  // PROJECT MANAGEMENT — Organization-scoped
  // ═══════════════════════════════════════════════════════════════

  async getUserProjects(): Promise<any[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, created_at, updated_at, organization_id')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      logErrorQuick('storageService.getUserProjects', error, { userId });
      return [];
    }

    const projects = (data || []).map(p => ({
      id: p.id,
      title: p.title,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      organizationId: p.organization_id,
    }));

    cachedProjectsMeta = projects;
    return projects;
  },

  async createProject(initialData: any = null): Promise<any> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.error('createProject: No user ID');
      logErrorQuick('storageService.createProject', { message: 'No user ID — not authenticated' });
      return null;
    }

    const newId = generateId();
    const dataToSave = initialData || createEmptyProjectData();
    const activeOrgId = organizationService.getActiveOrgId();

    const { error: projError } = await supabase
      .from('projects')
      .insert({
        id: newId,
        owner_id: userId,
        title: 'New Project',
        organization_id: activeOrgId,
      });

    if (projError) {
      console.error('Error creating project:', projError);
      logErrorQuick('storageService.createProject.insert', projError, { userId, newId });
      return null;
    }

    const { error: dataError } = await supabase
      .from('project_data')
      .insert([
        { project_id: newId, language: 'en', data: dataToSave },
        { project_id: newId, language: 'si', data: dataToSave }
      ]);

    if (dataError) {
      console.error('Error creating project data:', dataError);
      logErrorQuick('storageService.createProject.data', dataError, { newId });
    }

    const meta = {
      id: newId,
      title: 'New Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: activeOrgId,
    };

    cachedProjectsMeta = null;
    return meta;
  },

  async deleteProject(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      logErrorQuick('storageService.deleteProject', error, { projectId });
    }

    cachedProjectsMeta = null;
  },

  setCurrentProjectId(projectId: string) {
    sessionStorage.setItem('current_project_id', projectId);
  },

  getCurrentProjectId(): string | null {
    return sessionStorage.getItem('current_project_id');
  },

  async loadProject(language: string = 'en', projectId: string | null = null): Promise<any> {
    const userId = await this.getCurrentUserId();
    if (!userId) return createEmptyProjectData();

    let targetId = projectId || this.getCurrentProjectId();

    if (!targetId) {
      const projects = await this.getUserProjects();
      if (projects.length > 0) {
        targetId = projects[0].id;
        this.setCurrentProjectId(targetId);
      } else {
        const newProj = await this.createProject();
        if (newProj) {
          targetId = newProj.id;
          this.setCurrentProjectId(targetId);
        } else {
          return createEmptyProjectData();
        }
      }
    }

    const { data, error } = await supabase
      .from('project_data')
      .select('data')
      .eq('project_id', targetId)
      .eq('language', language)
      .single();

    if (error || !data) {
      console.log(`[storageService.loadProject] ⚠️ No data found for lang=${language}, projectId=${targetId}`);
      if (error) {
        logErrorQuick('storageService.loadProject', error, { language, projectId: targetId });
      }
      return createEmptyProjectData();
    }

    const goCheck = data.data?.generalObjectives;
    const goHasContent = Array.isArray(goCheck) && goCheck.length > 0 && goCheck.some((item: any) => item?.title?.trim());
    console.log(`[storageService.loadProject] lang=${language}, projectId=${targetId}, generalObjectives: ${goHasContent ? '✅ HAS (' + goCheck.length + ' items)' : '⚠️ EMPTY'}`);

    return data.data;
  },

  async saveProject(projectData: any, language: string = 'en', projectId: string | null = null) {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    let targetId = projectId || this.getCurrentProjectId();

    if (!targetId) {
      const newProj = await this.createProject(projectData);
      if (newProj) {
        targetId = newProj.id;
        this.setCurrentProjectId(targetId);
      } else {
        return;
      }
    }

    const goCheck = projectData?.generalObjectives;
    const goHasContent = Array.isArray(goCheck) && goCheck.length > 0 && goCheck.some((item: any) => item?.title?.trim());
    console.log(`[storageService.saveProject] lang=${language}, projectId=${targetId}, generalObjectives: ${goHasContent ? '✅ HAS (' + goCheck.length + ' items, first="' + (goCheck[0]?.title || '').substring(0, 40) + '")' : '⚠️ EMPTY'}`);

    const { error: dataError } = await supabase
      .from('project_data')
      .upsert(
        {
          project_id: targetId,
          language: language,
          data: projectData
        },
        { onConflict: 'project_id,language' }
      );

    if (dataError) {
      console.error('Error saving project data:', dataError);
      logErrorQuick('storageService.saveProject', dataError, { projectId: targetId, language });
    }

    const newTitle = projectData.projectIdea?.projectTitle;
    if (newTitle && newTitle.trim() !== '') {
      const { error: titleError } = await supabase
        .from('projects')
        .update({ title: newTitle.trim() })
        .eq('id', targetId);

      if (titleError) {
        logErrorQuick('storageService.saveProject.title', titleError, { projectId: targetId });
      }
    }

    cachedProjectsMeta = null;
  },

  // ═══════════════════════════════════════════════════════════════
  // MFA
  // ═══════════════════════════════════════════════════════════════

  async getMFAFactors(): Promise<{ totp: any[] }> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.warn('getMFAFactors error:', error.message);
      logErrorQuick('storageService.getMFAFactors', error);
      return { totp: [] };
    }
    return { totp: data?.totp || [] };
  },

  async enrollMFA(): Promise<{ factorId: string; qrUri: string; secret: string } | null> {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'INTERVENCIJSKA-LOGIKA'
    });
    if (error) {
      console.error('enrollMFA error:', error.message);
      logErrorQuick('storageService.enrollMFA', error);
      return null;
    }
    return {
      factorId: data.id,
      qrUri: data.totp.uri,
      secret: data.totp.secret
    };
  },

  async challengeAndVerifyMFA(factorId: string, code: string): Promise<{ success: boolean; message?: string }> {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      logErrorQuick('storageService.challengeMFA', challengeError, { factorId });
      return { success: false, message: challengeError.message };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code
    });

    if (verifyError) {
      logErrorQuick('storageService.verifyMFA', verifyError, { factorId });
      return { success: false, message: verifyError.message };
    }

    return { success: true };
  },

  async unenrollMFA(factorId: string): Promise<{ success: boolean; message?: string }> {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      logErrorQuick('storageService.unenrollMFA', error, { factorId });
      return { success: false, message: error.message };
    }
    return { success: true };
  },

    async getAAL(): Promise<{ currentLevel: string; nextLevel: string }> {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) { console.warn('getAAL error:', error.message); return { currentLevel: 'aal1', nextLevel: 'aal1' }; }
    return { currentLevel: data.currentLevel || 'aal1', nextLevel: data.nextLevel || 'aal1' };
  },

  // ★ v5.3: Admin tab order — drag & drop reordering
  getAdminTabOrder(): string[] | null {
    var order = cachedSettings?.admin_tab_order;
    if (Array.isArray(order) && order.length > 0) return order;
    return null;
  },

  async setAdminTabOrder(order: string[]) {
    await this.updateSettings({ admin_tab_order: order });
  },
};

