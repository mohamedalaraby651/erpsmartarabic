-- 1) Fix tasks RLS policies — enforce tenant scoping
DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_policy ON public.tasks;

CREATE POLICY tasks_select_policy ON public.tasks
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY tasks_update_policy ON public.tasks
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  tenant_id = public.get_current_tenant()
);

CREATE POLICY tasks_delete_policy ON public.tasks
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2) Fix report_templates — enforce tenant scoping
DROP POLICY IF EXISTS "Users can manage own templates" ON public.report_templates;

CREATE POLICY "Users can manage own templates" ON public.report_templates
FOR ALL TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND created_by = auth.uid()
)
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND created_by = auth.uid()
);

-- 3) Remove dead false policy on user_2fa_settings
DROP POLICY IF EXISTS "Users select own 2fa rows" ON public.user_2fa_settings;