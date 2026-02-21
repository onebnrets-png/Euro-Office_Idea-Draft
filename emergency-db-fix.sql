-- ═══════════════════════════════════════════════════════════
-- 🚑 EURO-OFFICE: Emergency DB Fix Script v2.0
-- Poženi kadar dobiš "Database error granting user"
-- ali kakršnokoli DB napako pri loginu
-- ═══════════════════════════════════════════════════════════

-- KORAK 1: Diagnostika
SELECT '═══ DIAGNOSTIKA ═══' as info;

SELECT 'Triggerji na auth:' as check_type, trigger_name, event_object_table
FROM information_schema.triggers WHERE event_object_schema = 'auth';

SELECT 'RLS politike na profiles:' as check_type, count(*) as count
FROM pg_policies WHERE tablename = 'profiles';

SELECT 'RLS politike na user_settings:' as check_type, count(*) as count
FROM pg_policies WHERE tablename = 'user_settings';

SELECT 'RLS politike na organizations:' as check_type, count(*) as count
FROM pg_policies WHERE tablename = 'organizations';

SELECT 'RLS politike na organization_members:' as check_type, count(*) as count
FROM pg_policies WHERE tablename = 'organization_members';

SELECT 'SECURITY DEFINER funkcije:' as check_type, proname, prosecdef
FROM pg_proc WHERE proname IN ('is_admin', 'is_superadmin', 'handle_new_user', 'update_last_sign_in', 'create_org_for_new_user');

-- KORAK 2: Onemogoči problematične triggerje
DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;

-- KORAK 3: Popravi vse funkcije z SECURITY DEFINER + EXCEPTION handling
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','superadmin')); $$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'); $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, first_name, last_name, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles SET last_sign_in = now() WHERE id = NEW.user_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'update_last_sign_in failed: %', SQLERRM;
  RETURN NEW;
END; $$;

-- KORAK 4: Zagotovi triggerje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;
CREATE TRIGGER on_auth_session_created AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_last_sign_in();

-- KORAK 5: Zagotovi RLS politike na profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_insert_trigger ON profiles;
CREATE POLICY profiles_insert_trigger ON profiles FOR INSERT WITH CHECK (true);

-- KORAK 6: Zagotovi openai_key stolpec
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='openai_key') THEN
    ALTER TABLE user_settings ADD COLUMN openai_key TEXT;
  END IF;
END $$;

-- KORAK 7: Zagotovi org tabele obstajajo
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
  logo_url TEXT, created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_role TEXT DEFAULT 'member' CHECK (org_role IN ('member', 'admin', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
CREATE TABLE IF NOT EXISTS organization_instructions (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE PRIMARY KEY,
  instructions JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- KORAK 8: Verifikacija
SELECT '═══ REZULTAT ═══' as info;
SELECT 'Triggerji:' as check, count(*) as count FROM information_schema.triggers WHERE event_object_schema = 'auth';
SELECT 'Profiles RLS:' as check, count(*) as count FROM pg_policies WHERE tablename = 'profiles';
SELECT 'Organizations:' as check, count(*) as count FROM pg_policies WHERE tablename = 'organizations';
SELECT 'SECDEF funkcije:' as check, proname, prosecdef FROM pg_proc
  WHERE proname IN ('is_admin','is_superadmin','handle_new_user','update_last_sign_in','create_org_for_new_user');
SELECT '✅ Emergency fix v2.0 complete — poskusi login!' as status;
