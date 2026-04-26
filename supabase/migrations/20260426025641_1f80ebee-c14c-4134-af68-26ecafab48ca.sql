-- Remove broad "all tenant members can view" SELECT policies that bypass role-based restrictions
DROP POLICY IF EXISTS "Tenant users can view supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Tenant users can view supplier payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "supplier_payments_select_policy" ON public.supplier_payments;

DROP POLICY IF EXISTS "Tenant users can view purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Tenant users can view purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_select_policy" ON public.purchase_order_items;

DROP POLICY IF EXISTS "Tenant users can view approval_records" ON public.approval_records;
DROP POLICY IF EXISTS "Tenant users can view approval records" ON public.approval_records;
DROP POLICY IF EXISTS "approval_records_select_policy" ON public.approval_records;

DROP POLICY IF EXISTS "Tenant users can view warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_select_policy" ON public.warehouses;

DROP POLICY IF EXISTS "Tenant users can view product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Tenant users can view variants" ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_select_policy" ON public.product_variants;

-- Ensure each table still has at least one role-based SELECT policy; if not, add a safe admin-fallback
-- (these are no-ops if the policy already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND cmd = 'SELECT') THEN
    EXECUTE 'CREATE POLICY warehouses_select ON public.warehouses FOR SELECT TO authenticated
      USING (tenant_id = public.get_current_tenant() AND (
        public.has_role(auth.uid(), ''admin''::app_role)
        OR public.has_role(auth.uid(), ''warehouse''::app_role)
      ))';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND cmd = 'SELECT') THEN
    EXECUTE 'CREATE POLICY product_variants_select ON public.product_variants FOR SELECT TO authenticated
      USING (tenant_id = public.get_current_tenant() AND (
        public.has_role(auth.uid(), ''admin''::app_role)
        OR public.has_role(auth.uid(), ''warehouse''::app_role)
        OR public.has_role(auth.uid(), ''sales''::app_role)
      ))';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND cmd = 'SELECT') THEN
    EXECUTE 'CREATE POLICY purchase_order_items_select ON public.purchase_order_items FOR SELECT TO authenticated
      USING (tenant_id = public.get_current_tenant() AND (
        public.has_role(auth.uid(), ''admin''::app_role)
        OR public.has_role(auth.uid(), ''warehouse''::app_role)
        OR public.has_role(auth.uid(), ''accountant''::app_role)
      ))';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_payments' AND cmd = 'SELECT') THEN
    EXECUTE 'CREATE POLICY supplier_payments_select ON public.supplier_payments FOR SELECT TO authenticated
      USING (tenant_id = public.get_current_tenant() AND (
        public.has_role(auth.uid(), ''admin''::app_role)
        OR public.has_role(auth.uid(), ''accountant''::app_role)
      ))';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_records' AND cmd = 'SELECT') THEN
    EXECUTE 'CREATE POLICY approval_records_select ON public.approval_records FOR SELECT TO authenticated
      USING (tenant_id = public.get_current_tenant() AND (
        public.has_role(auth.uid(), ''admin''::app_role)
        OR public.has_role(auth.uid(), ''accountant''::app_role)
      ))';
  END IF;
END $$;