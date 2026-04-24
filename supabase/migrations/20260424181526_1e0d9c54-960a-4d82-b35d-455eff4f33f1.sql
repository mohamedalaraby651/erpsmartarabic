-- ============================================
-- STEP 0.1: Critical RLS Cleanup
-- Replaces permissive USING(true) policies with tenant-scoped checks
-- ============================================

-- 1) company_settings — read-only for tenant members
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.company_settings;
CREATE POLICY "Tenant members view company settings"
ON public.company_settings FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

-- 2) customer_communications — full CRUD scoped to tenant
DROP POLICY IF EXISTS "Authenticated users can view communications" ON public.customer_communications;
DROP POLICY IF EXISTS "Authenticated users can read communications" ON public.customer_communications;
DROP POLICY IF EXISTS "Authenticated users can insert communications" ON public.customer_communications;

CREATE POLICY "Tenant members read communications"
ON public.customer_communications FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant members insert communications"
ON public.customer_communications FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND created_by = auth.uid()
);

CREATE POLICY "Tenant members update own communications"
ON public.customer_communications FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant())
WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant members delete own communications"
ON public.customer_communications FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

-- 3) customer_reminders — tenant-scoped
DROP POLICY IF EXISTS "Users can view reminders" ON public.customer_reminders;
CREATE POLICY "Tenant members view reminders"
ON public.customer_reminders FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

-- 4) expense_categories — tenant-scoped read
DROP POLICY IF EXISTS "expense_categories_select_policy" ON public.expense_categories;
CREATE POLICY "Tenant members view expense categories"
ON public.expense_categories FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

-- 5) product_variants — tenant-scoped via parent product
DROP POLICY IF EXISTS "Authenticated can view variants" ON public.product_variants;
CREATE POLICY "Tenant members view product variants"
ON public.product_variants FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

-- 6) purchase_order_items — tenant-scoped
DROP POLICY IF EXISTS "Authenticated can view purchase order items" ON public.purchase_order_items;
CREATE POLICY "Tenant members view purchase order items"
ON public.purchase_order_items FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

-- 7) supplier_payments — tenant-scoped (was exposed to PUBLIC)
DROP POLICY IF EXISTS "Authenticated can view supplier payments" ON public.supplier_payments;
CREATE POLICY "Tenant members view supplier payments"
ON public.supplier_payments FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

-- 8) warehouses — tenant-scoped
DROP POLICY IF EXISTS "Authenticated can view warehouses" ON public.warehouses;
CREATE POLICY "Tenant members view warehouses"
ON public.warehouses FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());