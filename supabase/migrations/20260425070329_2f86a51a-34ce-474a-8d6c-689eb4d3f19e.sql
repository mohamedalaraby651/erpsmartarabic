-- 1. employees_select_policy: scope user_id branch to tenant
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
CREATE POLICY "employees_select_policy"
ON public.employees FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR user_id = auth.uid()
  )
);

-- 2. activity_logs SELECT scope
DROP POLICY IF EXISTS "Admin or user can view relevant logs" ON public.activity_logs;
CREATE POLICY "Tenant users view own or admin views all logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid())
);

-- 3. drop public logos read
DROP POLICY IF EXISTS "Public can read logos" ON storage.objects;