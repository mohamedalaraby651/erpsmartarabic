-- 1. user_2fa_settings: replace blanket-deny with explicit user-scoped policies
DROP POLICY IF EXISTS "Service role only access" ON public.user_2fa_settings;

CREATE POLICY "Users select own 2fa rows"
ON public.user_2fa_settings FOR SELECT TO authenticated
USING (false);  -- still hidden from client; reads go through view/edge fn

CREATE POLICY "Users insert own 2fa rows"
ON public.user_2fa_settings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own 2fa rows"
ON public.user_2fa_settings FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own 2fa rows"
ON public.user_2fa_settings FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 2. permission_matrix_cache: tenant-scope admin policies
DROP POLICY IF EXISTS "Admins update cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Admins delete cache" ON public.permission_matrix_cache;

CREATE POLICY "Admins update tenant cache"
ON public.permission_matrix_cache FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
);

CREATE POLICY "Admins delete tenant cache"
ON public.permission_matrix_cache FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
);

-- 3. attachments: add tenant scoping to existing role-based policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname='public' AND tablename='attachments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attachments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Tenant role-based attachment view"
ON public.attachments FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (entity_type = 'employee'  AND public.has_role(auth.uid(), 'hr'::app_role))
    OR (entity_type = 'customer'  AND public.has_role(auth.uid(), 'sales'::app_role))
    OR (entity_type = 'supplier'  AND public.has_role(auth.uid(), 'warehouse'::app_role))
    OR (entity_type IN ('invoice','quotation','sales_order','expense','payment','journal')
        AND public.has_role(auth.uid(), 'accountant'::app_role))
    OR uploaded_by = auth.uid()
  )
);

CREATE POLICY "Tenant role-based attachment insert"
ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Tenant role-based attachment update"
ON public.attachments FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant role-based attachment delete"
ON public.attachments FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
);