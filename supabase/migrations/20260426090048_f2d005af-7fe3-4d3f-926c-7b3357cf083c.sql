-- Tighten the tenant-admin UPDATE policy on user_roles so a tenant admin
-- cannot modify rows that belong to another admin. Only platform admins
-- may modify existing admin role assignments.

DROP POLICY IF EXISTS user_roles_update_admin_tenant ON public.user_roles;

CREATE POLICY user_roles_update_admin_tenant
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin'::app_role)
  -- Critical: tenant admins cannot touch role rows of other admins.
  AND NOT public.has_role(user_id, 'admin'::app_role)
)
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND role <> 'admin'::app_role
  AND NOT public.has_role(user_id, 'admin'::app_role)
);

-- Apply the same protection to DELETE: a tenant admin must not be able
-- to delete another admin's role row as a workaround for the above.
DROP POLICY IF EXISTS user_roles_delete_admin_tenant ON public.user_roles;

CREATE POLICY user_roles_delete_admin_tenant
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND NOT public.has_role(user_id, 'admin'::app_role)
);

-- Platform admins keep full control over admin role assignments.
DROP POLICY IF EXISTS user_roles_delete_platform_admin ON public.user_roles;

CREATE POLICY user_roles_delete_platform_admin
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));