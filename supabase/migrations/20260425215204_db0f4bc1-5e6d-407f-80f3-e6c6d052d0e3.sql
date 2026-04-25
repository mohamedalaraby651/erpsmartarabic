
DROP POLICY IF EXISTS cash_transactions_insert_policy ON public.cash_transactions;
CREATE POLICY cash_transactions_insert_policy ON public.cash_transactions
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role)));

DROP POLICY IF EXISTS product_stock_insert_policy ON public.product_stock;
CREATE POLICY product_stock_insert_policy ON public.product_stock
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role)));

DROP POLICY IF EXISTS payments_insert_policy ON public.payments;
CREATE POLICY payments_insert_policy ON public.payments
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

DROP POLICY IF EXISTS purchase_orders_delete_policy ON public.purchase_orders;
CREATE POLICY purchase_orders_delete_policy ON public.purchase_orders
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS customers_update_policy ON public.customers;
CREATE POLICY customers_update_policy ON public.customers
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role) OR public.check_section_permission(auth.uid(),'customers','update')))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS customers_delete_policy ON public.customers;
CREATE POLICY customers_delete_policy ON public.customers
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.check_section_permission(auth.uid(),'customers','delete')));

DROP POLICY IF EXISTS "Users can delete own templates" ON public.export_templates;
CREATE POLICY "Users can delete own templates" ON public.export_templates
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant() AND (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role)));

DROP POLICY IF EXISTS "Users can update own templates" ON public.export_templates;
CREATE POLICY "Users can update own templates" ON public.export_templates
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL AND tenant_id = public.get_current_tenant() AND (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS user_roles_select_admin_tenant ON public.user_roles;
CREATE POLICY user_roles_select_admin_tenant ON public.user_roles
FOR SELECT TO authenticated
USING (
  (user_id = auth.uid() AND tenant_id = public.get_current_tenant())
  OR (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role))
);
