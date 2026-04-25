-- ===== 1. customer_communications: drop lax UPDATE/DELETE =====
DROP POLICY IF EXISTS "Authenticated users can update own communications" ON public.customer_communications;
DROP POLICY IF EXISTS "Authenticated users can delete own communications" ON public.customer_communications;

-- ===== 2. customer_reminders: tighten UPDATE/DELETE =====
DROP POLICY IF EXISTS "Users can update own reminders" ON public.customer_reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.customer_reminders;

CREATE POLICY "Users update own tenant reminders"
ON public.customer_reminders FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND tenant_id = public.get_current_tenant())
WITH CHECK (created_by = auth.uid() AND tenant_id = public.get_current_tenant());

CREATE POLICY "Users delete own tenant reminders"
ON public.customer_reminders FOR DELETE TO authenticated
USING (created_by = auth.uid() AND tenant_id = public.get_current_tenant());

-- ===== 3. export_templates: remove lax INSERT =====
DROP POLICY IF EXISTS "Users can create templates" ON public.export_templates;