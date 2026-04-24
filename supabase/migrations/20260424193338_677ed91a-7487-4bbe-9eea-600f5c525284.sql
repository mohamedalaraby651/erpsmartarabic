
-- 2.1 expenses
DROP POLICY IF EXISTS expenses_insert_policy ON public.expenses;
CREATE POLICY expenses_insert_policy ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant());

-- 2.2 tasks
DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant());

-- 3) 2FA policy
DROP POLICY IF EXISTS user_2fa_own ON public.user_2fa_settings;
CREATE POLICY user_2fa_own ON public.user_2fa_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) supplier_notes UPDATE policy (no tenant_id col, use parent supplier tenant)
DROP POLICY IF EXISTS supplier_notes_update_policy ON public.supplier_notes;
CREATE POLICY supplier_notes_update_policy ON public.supplier_notes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s 
      WHERE s.id = supplier_notes.supplier_id 
        AND s.tenant_id = public.get_current_tenant()
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.check_section_permission(auth.uid(), 'suppliers', 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s 
      WHERE s.id = supplier_notes.supplier_id 
        AND s.tenant_id = public.get_current_tenant()
    )
  );

-- 5) approval_chains
UPDATE public.approval_chains 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.approval_chains 
  ALTER COLUMN tenant_id SET NOT NULL;

DROP POLICY IF EXISTS approval_chains_select_policy ON public.approval_chains;
CREATE POLICY approval_chains_select_policy ON public.approval_chains
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant());
