-- ===== 1. profiles: tenant-scope admin SELECT =====
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view tenant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND id IN (
    SELECT user_id FROM public.user_tenants
    WHERE tenant_id = public.get_current_tenant()
  )
);

-- ===== 2. customer_reminders INSERT: enforce tenant =====
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='customer_reminders' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.customer_reminders', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users create their own tenant reminders"
ON public.customer_reminders FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND tenant_id = public.get_current_tenant()
);

-- ===== 3. export_templates: tenant-scope default templates =====
DROP POLICY IF EXISTS "Users can view templates" ON public.export_templates;

CREATE POLICY "Users can view tenant templates"
ON public.export_templates FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR (is_default = true AND tenant_id = public.get_current_tenant())
  OR (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'::app_role))
);

-- ===== 4. approval_chains: tighten tenant scope =====
DROP POLICY IF EXISTS "Tenant users can view approval chains" ON public.approval_chains;

CREATE POLICY "Tenant users can view approval chains"
ON public.approval_chains FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());