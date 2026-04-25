
DROP POLICY IF EXISTS cash_transactions_select_policy ON public.cash_transactions;
CREATE POLICY cash_transactions_select_policy ON public.cash_transactions
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.check_section_permission(auth.uid(), 'cash_transactions', 'view')
  )
);

DROP POLICY IF EXISTS invoice_items_select_policy ON public.invoice_items;
CREATE POLICY invoice_items_select_policy ON public.invoice_items
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.check_section_permission(auth.uid(), 'invoices', 'view')
  )
);

DROP POLICY IF EXISTS sales_orders_select_policy ON public.sales_orders;
CREATE POLICY sales_orders_select_policy ON public.sales_orders
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'sales_orders', 'view')
  )
);

DROP POLICY IF EXISTS sales_order_items_select_policy ON public.sales_order_items;
CREATE POLICY sales_order_items_select_policy ON public.sales_order_items
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'sales_orders', 'view')
  )
);

DROP POLICY IF EXISTS quotations_select_policy ON public.quotations;
CREATE POLICY quotations_select_policy ON public.quotations
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'quotations', 'view')
  )
);

DROP POLICY IF EXISTS quotation_items_select_policy ON public.quotation_items;
CREATE POLICY quotation_items_select_policy ON public.quotation_items
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'quotations', 'view')
  )
);

DROP POLICY IF EXISTS purchase_orders_select_policy ON public.purchase_orders;
CREATE POLICY purchase_orders_select_policy ON public.purchase_orders
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.check_section_permission(auth.uid(), 'purchase_orders', 'view')
  )
);

DROP POLICY IF EXISTS products_select_policy ON public.products;
CREATE POLICY products_select_policy ON public.products
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.has_role(auth.uid(), 'warehouse'::app_role)
    OR public.check_section_permission(auth.uid(), 'products', 'view')
  )
);

DROP POLICY IF EXISTS product_stock_select_policy ON public.product_stock;
CREATE POLICY product_stock_select_policy ON public.product_stock
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'inventory', 'view')
  )
);

DROP POLICY IF EXISTS stock_movements_select_policy ON public.stock_movements;
CREATE POLICY stock_movements_select_policy ON public.stock_movements
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse'::app_role)
    OR public.check_section_permission(auth.uid(), 'inventory', 'view')
  )
);

DROP POLICY IF EXISTS payments_select_policy ON public.payments;
CREATE POLICY payments_select_policy ON public.payments
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.check_section_permission(auth.uid(), 'payments', 'view')
  )
);

DROP POLICY IF EXISTS suppliers_select_policy ON public.suppliers;
CREATE POLICY suppliers_select_policy ON public.suppliers
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.check_section_permission(auth.uid(), 'suppliers', 'view')
  )
);

DROP POLICY IF EXISTS customer_addresses_select_policy ON public.customer_addresses;
CREATE POLICY customer_addresses_select_policy ON public.customer_addresses
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'customers', 'view')
  )
);

DROP POLICY IF EXISTS employees_select_policy ON public.employees;
CREATE POLICY employees_select_policy ON public.employees
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.check_section_permission(auth.uid(), 'employees', 'view')
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
