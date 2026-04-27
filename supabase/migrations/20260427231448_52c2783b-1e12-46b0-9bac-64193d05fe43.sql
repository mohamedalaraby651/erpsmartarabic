
-- ============================================================
-- 1) user_2fa_settings: revoke client read on sensitive columns
-- ============================================================
REVOKE SELECT (secret_key, backup_codes) ON public.user_2fa_settings FROM authenticated;
REVOKE SELECT (secret_key, backup_codes) ON public.user_2fa_settings FROM anon;

GRANT SELECT (id, user_id, is_enabled, enabled_at, last_used_at, created_at)
  ON public.user_2fa_settings TO authenticated;

-- ============================================================
-- 2) profiles: explicit INSERT policy (auth.uid() = id)
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3) user_roles: prevent tenant-admin role accumulation
-- ============================================================
DROP POLICY IF EXISTS user_roles_insert_admin_tenant ON public.user_roles;
CREATE POLICY user_roles_insert_admin_tenant
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_tenant_member(user_id, tenant_id)
  AND role <> 'admin'::app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = user_roles.user_id
      AND ur.tenant_id = user_roles.tenant_id
  )
);
