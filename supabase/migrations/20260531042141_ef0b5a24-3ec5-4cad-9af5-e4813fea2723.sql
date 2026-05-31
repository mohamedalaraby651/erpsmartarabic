
REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM PUBLIC;
REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM anon;
REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM authenticated;

GRANT SELECT (id, user_id, is_enabled, enabled_at, last_used_at, created_at) ON public.user_2fa_settings TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.user_2fa_settings FROM anon, authenticated;
GRANT ALL ON public.user_2fa_settings TO service_role;

DROP POLICY IF EXISTS "user_2fa_settings_select" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "user_2fa_own" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can view own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can manage own 2FA" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "user_2fa_settings_insert" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "user_2fa_settings_update" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "user_2fa_settings_delete" ON public.user_2fa_settings;

CREATE POLICY "user_2fa_self_status_select"
  ON public.user_2fa_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
