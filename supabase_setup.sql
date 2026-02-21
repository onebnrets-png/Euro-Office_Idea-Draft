-- ═══════════════════════════════════════════════════════════════
-- EURO-OFFICE: Full Database Setup
-- v4.0 — 2026-02-21
-- 
-- FIXES (v4.0):
--   - NEW: Organizations tables (organizations, organization_members,
--     organization_instructions) + RLS policies
--   - NEW: profiles.active_organization_id, first_name, last_name
--   - NEW: projects.organization_id
--   - NEW: user_settings.openai_key
--   - FIX: profiles role CHECK now includes 'superadmin'
--   - FIX: is_admin() now checks for 'admin' OR 'superadmin'
--   - NEW: is_superadmin() helper function
--   - NEW: create_org_for_new_user() RPC for first-login org creation
--   - NEW: knowledge_base_documents table + RLS
--
-- Previous (v3.0):
--   - FIX DB-1..DB-5 (trigger, RLS, recursion, last_sign_in)
--
-- Run in Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════


-- ─── 0. HELPERS ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );

$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );

$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ═══════════════════════════════════════════════════════════════
-- 1. PROFILES TABLE + TRIGGER
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  active_organization_id UUID,
  last_sign_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if they don't exist (safe re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='first_name') THEN
    ALTER TABLE profiles ADD COLUMN first_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_name') THEN
    ALTER TABLE profiles ADD COLUMN last_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='active_organization_id') THEN
    ALTER TABLE profiles ADD COLUMN active_organization_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_sign_in') THEN
    ALTER TABLE profiles ADD COLUMN last_sign_in TIMESTAMPTZ;
  END IF;
END $$;

-- Update CHECK constraint to include superadmin (if old constraint exists)
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'superadmin'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ★ Auto-create profile + user_settings on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ═══════════════════════════════════════════════════════════════
-- 2. USER_SETTINGS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  ai_provider TEXT DEFAULT 'gemini',
  gemini_key TEXT,
  openrouter_key TEXT,
  openai_key TEXT,
  model TEXT,
  custom_logo TEXT,
  custom_instructions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add openai_key if missing (safe re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='openai_key') THEN
    ALTER TABLE user_settings ADD COLUMN openai_key TEXT;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 3. ORGANIZATIONS TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_role TEXT DEFAULT 'member' CHECK (org_role IN ('member', 'admin', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

CREATE TABLE IF NOT EXISTS organization_instructions (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE PRIMARY KEY,
  instructions JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add FK from profiles to organizations (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_active_organization_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_active_organization_id_fkey
      FOREIGN KEY (active_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 4. PROJECTS + PROJECT_DATA TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'New Project',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);

-- Add organization_id if missing (safe re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='organization_id') THEN
    ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS project_data (
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'si')),
  data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, language)
);


-- ═══════════════════════════════════════════════════════════════
-- 5. TRANSLATION HASHES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS translation_hashes (
  project_id TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  field_path TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, source_lang, target_lang, field_path)
);


-- ═══════════════════════════════════════════════════════════════
-- 6. KNOWLEDGE BASE DOCUMENTS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  extracted_text TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_docs_org ON knowledge_base_documents(organization_id);


-- ═══════════════════════════════════════════════════════════════
-- 7. ADMIN LOG + GLOBAL SETTINGS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_log_created_at ON admin_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin_id ON admin_log(admin_id);

CREATE TABLE IF NOT EXISTS global_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  custom_instructions JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO global_settings (id) VALUES ('global')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 8. ENABLE RLS ON ALL TABLES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════
-- 9. RLS POLICIES — PROFILES
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "profiles_insert_trigger"
  ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_admin_select"
  ON profiles FOR SELECT USING (is_admin());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE USING (is_admin());


-- ═══════════════════════════════════════════════════════════════
-- 10. RLS POLICIES — USER_SETTINGS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "user_settings_select_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert_trigger" ON user_settings;

CREATE POLICY "user_settings_insert_trigger"
  ON user_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "user_settings_select_own"
  ON user_settings FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_settings_update_own"
  ON user_settings FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════
-- 11. RLS POLICIES — ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "org_select_member" ON organizations;
DROP POLICY IF EXISTS "org_insert_authenticated" ON organizations;
DROP POLICY IF EXISTS "org_update_admin" ON organizations;
DROP POLICY IF EXISTS "org_delete_owner" ON organizations;
DROP POLICY IF EXISTS "org_select_all_admin" ON organizations;

-- Members can see their orgs
CREATE POLICY "org_select_member"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Authenticated users can create orgs
CREATE POLICY "org_insert_authenticated"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Org admins/owners can update
CREATE POLICY "org_update_admin"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.org_role IN ('admin', 'owner')
    )
    OR is_admin()
  );

-- Only owners or superadmin can delete
CREATE POLICY "org_delete_owner"
  ON organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.org_role = 'owner'
    )
    OR is_superadmin()
  );


-- ═══════════════════════════════════════════════════════════════
-- 12. RLS POLICIES — ORGANIZATION_MEMBERS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "org_members_select" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert" ON organization_members;
DROP POLICY IF EXISTS "org_members_update" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete" ON organization_members;

CREATE POLICY "org_members_select"
  ON organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "org_members_insert"
  ON organization_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_members_update"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.org_role IN ('admin', 'owner')
    )
    OR is_admin()
  );

CREATE POLICY "org_members_delete"
  ON organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.org_role IN ('admin', 'owner')
    )
    OR is_admin()
  );


-- ═══════════════════════════════════════════════════════════════
-- 13. RLS POLICIES — ORGANIZATION_INSTRUCTIONS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "org_instructions_select" ON organization_instructions;
DROP POLICY IF EXISTS "org_instructions_insert" ON organization_instructions;
DROP POLICY IF EXISTS "org_instructions_update" ON organization_instructions;

CREATE POLICY "org_instructions_select"
  ON organization_instructions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_instructions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "org_instructions_insert"
  ON organization_instructions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_instructions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.org_role IN ('admin', 'owner')
    )
  );

CREATE POLICY "org_instructions_update"
  ON organization_instructions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_instructions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.org_role IN ('admin', 'owner')
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- 14. RLS POLICIES — PROJECTS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "projects_select_own" ON projects;
DROP POLICY IF EXISTS "projects_insert_own" ON projects;
DROP POLICY IF EXISTS "projects_update_own" ON projects;
DROP POLICY IF EXISTS "projects_delete_own" ON projects;

CREATE POLICY "projects_select_own"
  ON projects FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "projects_insert_own"
  ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "projects_delete_own"
  ON projects FOR DELETE USING (owner_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════
-- 15. RLS POLICIES — PROJECT_DATA
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "project_data_select_own" ON project_data;
DROP POLICY IF EXISTS "project_data_insert_own" ON project_data;
DROP POLICY IF EXISTS "project_data_update_own" ON project_data;
DROP POLICY IF EXISTS "project_data_delete_own" ON project_data;

CREATE POLICY "project_data_select_own"
  ON project_data FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_data.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "project_data_insert_own"
  ON project_data FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_data.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "project_data_update_own"
  ON project_data FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_data.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "project_data_delete_own"
  ON project_data FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_data.project_id AND projects.owner_id = auth.uid()));


-- ═══════════════════════════════════════════════════════════════
-- 16. RLS POLICIES — TRANSLATION_HASHES
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "translation_hashes_select_own" ON translation_hashes;
DROP POLICY IF EXISTS "translation_hashes_insert_own" ON translation_hashes;
DROP POLICY IF EXISTS "translation_hashes_update_own" ON translation_hashes;
DROP POLICY IF EXISTS "translation_hashes_delete_own" ON translation_hashes;

CREATE POLICY "translation_hashes_select_own"
  ON translation_hashes FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = translation_hashes.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "translation_hashes_insert_own"
  ON translation_hashes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = translation_hashes.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "translation_hashes_update_own"
  ON translation_hashes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = translation_hashes.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "translation_hashes_delete_own"
  ON translation_hashes FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = translation_hashes.project_id AND projects.owner_id = auth.uid()));


-- ═══════════════════════════════════════════════════════════════
-- 17. RLS POLICIES — KNOWLEDGE_BASE_DOCUMENTS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "kb_docs_select" ON knowledge_base_documents;
DROP POLICY IF EXISTS "kb_docs_insert" ON knowledge_base_documents;
DROP POLICY IF EXISTS "kb_docs_delete" ON knowledge_base_documents;

CREATE POLICY "kb_docs_select"
  ON knowledge_base_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = knowledge_base_documents.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "kb_docs_insert"
  ON knowledge_base_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = knowledge_base_documents.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.org_role IN ('admin', 'owner')
    )
  );

CREATE POLICY "kb_docs_delete"
  ON knowledge_base_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = knowledge_base_documents.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.org_role IN ('admin', 'owner')
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- 18. RLS POLICIES — ADMIN_LOG + GLOBAL_SETTINGS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "admin_log_select_admin" ON admin_log;
DROP POLICY IF EXISTS "admin_log_insert_admin" ON admin_log;

CREATE POLICY "admin_log_select_admin"
  ON admin_log FOR SELECT USING (is_admin());

CREATE POLICY "admin_log_insert_admin"
  ON admin_log FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Anyone reads global settings" ON global_settings;
DROP POLICY IF EXISTS "Admins update global settings" ON global_settings;
DROP POLICY IF EXISTS "Admins insert global settings" ON global_settings;

CREATE POLICY "Anyone reads global settings"
  ON global_settings FOR SELECT USING (true);

CREATE POLICY "Admins update global settings"
  ON global_settings FOR UPDATE USING (is_admin());

CREATE POLICY "Admins insert global settings"
  ON global_settings FOR INSERT WITH CHECK (is_admin());


-- ═══════════════════════════════════════════════════════════════
-- 19. RPC: create_org_for_new_user (SECURITY DEFINER)
-- Used by storageService on first login after email confirmation
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_org_for_new_user(
  p_user_id UUID,
  p_org_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate slug
  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || to_char(now(), 'YYMMDD') || substr(gen_random_uuid()::text, 1, 4);

  -- Create org
  INSERT INTO organizations (name, slug, created_by)
  VALUES (p_org_name, v_slug, p_user_id)
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, org_role)
  VALUES (v_org_id, p_user_id, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Create empty org instructions
  INSERT INTO organization_instructions (organization_id, updated_by)
  VALUES (v_org_id, p_user_id)
  ON CONFLICT (organization_id) DO NOTHING;

  -- Set as active org
  UPDATE profiles
  SET active_organization_id = v_org_id
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'orgId', v_org_id);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_org_for_new_user failed: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;

$$;


-- ═══════════════════════════════════════════════════════════════
-- 20. SET BENO AS SUPERADMIN
-- ═══════════════════════════════════════════════════════════════

UPDATE profiles
SET role = 'superadmin'
WHERE email = 'beno.stern@infinita.si';


-- ═══════════════════════════════════════════════════════════════
-- 21. LAST SIGN-IN TRACKING
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_sign_in = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'update_last_sign_in failed: %', SQLERRM;
  RETURN NEW;
END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;
CREATE TRIGGER on_auth_session_created
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_sign_in();


-- ═══════════════════════════════════════════════════════════════
-- 22. BACKFILL EXISTING USERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO profiles (id, email, display_name, role)
SELECT
  id, email,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
  'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- DONE! Verify:
--   SELECT * FROM profiles;
--   SELECT * FROM organizations;
--   SELECT * FROM organization_members;
--   SELECT is_admin();
--   SELECT is_superadmin();
-- ═══════════════════════════════════════════════════════════════
