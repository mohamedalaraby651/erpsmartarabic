
-- ============================================================
-- 1. invoices_select / customers_select: add tenant filter
-- ============================================================
DROP POLICY IF EXISTS invoices_select_policy ON public.invoices;
CREATE POLICY invoices_select_policy ON public.invoices
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

DROP POLICY IF EXISTS customers_select_policy ON public.customers;
CREATE POLICY customers_select_policy ON public.customers
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.check_section_permission(auth.uid(), 'customers', 'view')
  )
);

-- ============================================================
-- 2. Bulk hardening: cash_transactions, employees, invoice_items,
--    stock_movements, payments, product_stock, sales_order_items,
--    quotation_items, purchase_orders, suppliers, customer_addresses,
--    products, sales_orders, quotations
-- Pattern: every write policy gets tenant_id check
-- ============================================================

-- cash_transactions
DROP POLICY IF EXISTS cash_transactions_update_policy ON public.cash_transactions;
CREATE POLICY cash_transactions_update_policy ON public.cash_transactions
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS cash_transactions_delete_policy ON public.cash_transactions;
CREATE POLICY cash_transactions_delete_policy ON public.cash_transactions
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

-- employees delete
DROP POLICY IF EXISTS employees_delete_policy ON public.employees;
CREATE POLICY employees_delete_policy ON public.employees
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

-- invoice_items
DROP POLICY IF EXISTS invoice_items_insert_policy ON public.invoice_items;
CREATE POLICY invoice_items_insert_policy ON public.invoice_items
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

DROP POLICY IF EXISTS invoice_items_update_policy ON public.invoice_items;
CREATE POLICY invoice_items_update_policy ON public.invoice_items
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS invoice_items_delete_policy ON public.invoice_items;
CREATE POLICY invoice_items_delete_policy ON public.invoice_items
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

-- stock_movements
DROP POLICY IF EXISTS stock_movements_insert_policy ON public.stock_movements;
CREATE POLICY stock_movements_insert_policy ON public.stock_movements
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role)));

DROP POLICY IF EXISTS stock_movements_update_policy ON public.stock_movements;
CREATE POLICY stock_movements_update_policy ON public.stock_movements
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS stock_movements_delete_policy ON public.stock_movements;
CREATE POLICY stock_movements_delete_policy ON public.stock_movements
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

-- payments
DROP POLICY IF EXISTS payments_update_policy ON public.payments;
CREATE POLICY payments_update_policy ON public.payments
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS payments_delete_policy ON public.payments;
CREATE POLICY payments_delete_policy ON public.payments
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

-- product_stock
DROP POLICY IF EXISTS product_stock_update_policy ON public.product_stock;
CREATE POLICY product_stock_update_policy ON public.product_stock
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS product_stock_delete_policy ON public.product_stock;
CREATE POLICY product_stock_delete_policy ON public.product_stock
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

-- sales_order_items
DROP POLICY IF EXISTS sales_order_items_insert_policy ON public.sales_order_items;
CREATE POLICY sales_order_items_insert_policy ON public.sales_order_items
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

DROP POLICY IF EXISTS sales_order_items_update_policy ON public.sales_order_items;
CREATE POLICY sales_order_items_update_policy ON public.sales_order_items
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS sales_order_items_delete_policy ON public.sales_order_items;
CREATE POLICY sales_order_items_delete_policy ON public.sales_order_items
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

-- quotation_items
DROP POLICY IF EXISTS quotation_items_insert_policy ON public.quotation_items;
CREATE POLICY quotation_items_insert_policy ON public.quotation_items
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

DROP POLICY IF EXISTS quotation_items_update_policy ON public.quotation_items;
CREATE POLICY quotation_items_update_policy ON public.quotation_items
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS quotation_items_delete_policy ON public.quotation_items;
CREATE POLICY quotation_items_delete_policy ON public.quotation_items
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

-- purchase_orders
DROP POLICY IF EXISTS purchase_orders_insert_policy ON public.purchase_orders;
CREATE POLICY purchase_orders_insert_policy ON public.purchase_orders
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role)));

DROP POLICY IF EXISTS purchase_orders_update_policy ON public.purchase_orders;
CREATE POLICY purchase_orders_update_policy ON public.purchase_orders
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role)))
WITH CHECK (tenant_id = public.get_current_tenant());

-- suppliers
DROP POLICY IF EXISTS suppliers_insert_policy ON public.suppliers;
CREATE POLICY suppliers_insert_policy ON public.suppliers
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role) OR public.check_section_permission(auth.uid(),'suppliers','create')));

DROP POLICY IF EXISTS suppliers_update_policy ON public.suppliers;
CREATE POLICY suppliers_update_policy ON public.suppliers
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role) OR public.check_section_permission(auth.uid(),'suppliers','update')))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS suppliers_delete_policy ON public.suppliers;
CREATE POLICY suppliers_delete_policy ON public.suppliers
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

-- customer_addresses
DROP POLICY IF EXISTS customer_addresses_insert_policy ON public.customer_addresses;
CREATE POLICY customer_addresses_insert_policy ON public.customer_addresses
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role) OR public.check_section_permission(auth.uid(),'customers','update')));

DROP POLICY IF EXISTS customer_addresses_update_policy ON public.customer_addresses;
CREATE POLICY customer_addresses_update_policy ON public.customer_addresses
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role) OR public.check_section_permission(auth.uid(),'customers','update')))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS customer_addresses_delete_policy ON public.customer_addresses;
CREATE POLICY customer_addresses_delete_policy ON public.customer_addresses
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

-- products
DROP POLICY IF EXISTS products_insert_policy ON public.products;
CREATE POLICY products_insert_policy ON public.products
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role) OR public.check_section_permission(auth.uid(),'products','create')));

DROP POLICY IF EXISTS products_update_policy ON public.products;
CREATE POLICY products_update_policy ON public.products
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role) OR public.check_section_permission(auth.uid(),'products','update')))
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS products_delete_policy ON public.products;
CREATE POLICY products_delete_policy ON public.products
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.check_section_permission(auth.uid(),'products','delete')));

-- sales_orders insert
DROP POLICY IF EXISTS sales_orders_insert_policy ON public.sales_orders;
CREATE POLICY sales_orders_insert_policy ON public.sales_orders
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

-- quotations insert
DROP POLICY IF EXISTS quotations_insert_policy ON public.quotations;
CREATE POLICY quotations_insert_policy ON public.quotations
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sales'::app_role)));

-- ============================================================
-- 3. role_limits NULL-tenant exploit
-- ============================================================
-- Delete any null-tenant rows defensively (audit logs them)
DELETE FROM public.role_limits WHERE tenant_id IS NULL;
ALTER TABLE public.role_limits ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================
-- 4. user_roles: enforce non-null tenant_id
-- ============================================================
-- Drop overly-permissive select with NULL fallback
DROP POLICY IF EXISTS user_roles_select_own_tenant ON public.user_roles;
CREATE POLICY user_roles_select_own_tenant ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND tenant_id = public.get_current_tenant());

-- ============================================================
-- 5. supplier_notes redundant permissive policies
-- ============================================================
DROP POLICY IF EXISTS "Tenant users can update supplier notes" ON public.supplier_notes;
DROP POLICY IF EXISTS "Tenant users can delete supplier notes" ON public.supplier_notes;

-- ============================================================
-- 6. check_financial_limit: remove tenant IS NULL fallback
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_financial_limit(
  _user_id uuid,
  _tenant uuid,
  _limit_type text,
  _amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _custom_role_id uuid;
  _max_value numeric;
BEGIN
  IF _user_id IS NULL OR _tenant IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT custom_role_id INTO _custom_role_id 
  FROM public.user_roles
  WHERE user_id = _user_id AND tenant_id = _tenant
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF _custom_role_id IS NULL THEN RETURN TRUE; END IF;
  
  SELECT
    CASE _limit_type
      WHEN 'discount' THEN max_discount_percentage
      WHEN 'credit' THEN max_credit_limit
      WHEN 'invoice' THEN max_invoice_amount
      ELSE NULL
    END
  INTO _max_value
  FROM public.role_limits
  WHERE custom_role_id = _custom_role_id AND tenant_id = _tenant
  LIMIT 1;
  
  IF _max_value IS NULL THEN RETURN TRUE; END IF;
  RETURN _amount <= _max_value;
END;
$$;
