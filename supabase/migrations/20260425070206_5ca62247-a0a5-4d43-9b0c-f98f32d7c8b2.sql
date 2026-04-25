-- ===== 1. user_2fa_settings: hide secrets =====
DROP POLICY IF EXISTS "user_2fa_own" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can view own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can manage own 2FA" ON public.user_2fa_settings;

CREATE OR REPLACE VIEW public.user_2fa_status
WITH (security_invoker = true)
AS
SELECT
  user_id,
  CASE WHEN secret_key IS NOT NULL AND length(secret_key) > 0 THEN true ELSE false END AS is_enabled,
  created_at
FROM public.user_2fa_settings;

GRANT SELECT ON public.user_2fa_status TO authenticated;

CREATE POLICY "Service role only access"
ON public.user_2fa_settings FOR ALL TO authenticated
USING (false) WITH CHECK (false);

-- ===== 2. user_roles tenant scope =====
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own_tenant"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND (tenant_id = public.get_current_tenant() OR tenant_id IS NULL)
);

-- ===== 3. activity_logs anti-spoof =====
DROP POLICY IF EXISTS "System can create activity logs for tenant" ON public.activity_logs;
CREATE POLICY "Users insert own activity logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND (user_id = auth.uid() OR user_id IS NULL)
);

-- ===== 4. logos tenant scope =====
DROP POLICY IF EXISTS "Authenticated users can view logos" ON storage.objects;
CREATE POLICY "Tenant users can view their logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'logos'
  AND (
    public.storage_tenant_from_path(name) = public.get_current_tenant()
    OR (storage.foldername(name))[1] IS NULL
  )
);

-- ===== 5. permission_matrix_cache lock =====
DROP POLICY IF EXISTS "Users read own cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Users insert own cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Users update own cache" ON public.permission_matrix_cache;
CREATE POLICY "Cache service-role only"
ON public.permission_matrix_cache FOR ALL TO authenticated
USING (false) WITH CHECK (false);

-- ===== 6. section_customizations open SELECT for tenant =====
DROP POLICY IF EXISTS "Admin only view section customizations" ON public.section_customizations;
CREATE POLICY "Tenant members view section customizations"
ON public.section_customizations FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());