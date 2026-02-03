-- ============================================
-- المرحلة 2: تحديث RLS Policies - Q1 Enterprise Hardening
-- ============================================

-- =============================================
-- 1. تحديث سياسات جدول invoices (الفواتير)
-- =============================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admin or sales or accountant can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated can view invoices" ON invoices;
DROP POLICY IF EXISTS "invoices_select_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_delete_policy" ON invoices;

-- سياسة العرض المحسّنة
CREATE POLICY "invoices_select_policy" ON invoices
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'invoices', 'view')
);

-- سياسة الإنشاء مع فحص الحد المالي
CREATE POLICY "invoices_insert_policy" ON invoices
FOR INSERT TO authenticated
WITH CHECK (
    (has_role(auth.uid(), 'admin') OR check_section_permission(auth.uid(), 'invoices', 'create'))
    AND check_financial_limit(auth.uid(), 'invoice', total_amount)
);

-- سياسة التحديث مع فحص الحد المالي
CREATE POLICY "invoices_update_policy" ON invoices
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'invoices', 'edit')
)
WITH CHECK (
    check_financial_limit(auth.uid(), 'invoice', total_amount)
);

-- سياسة الحذف للأدمن فقط
CREATE POLICY "invoices_delete_policy" ON invoices
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 2. تحديث سياسات جدول invoice_items
-- =============================================

DROP POLICY IF EXISTS "Admin or sales or accountant can manage invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated can view invoice items" ON invoice_items;

CREATE POLICY "invoice_items_select_policy" ON invoice_items
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'invoices', 'view')
);

CREATE POLICY "invoice_items_insert_policy" ON invoice_items
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'invoices', 'create')
);

CREATE POLICY "invoice_items_update_policy" ON invoice_items
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'invoices', 'edit')
);

CREATE POLICY "invoice_items_delete_policy" ON invoice_items
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 3. تحديث سياسات جدول payments (المدفوعات)
-- =============================================

DROP POLICY IF EXISTS "Admin or accountant can manage payments" ON payments;
DROP POLICY IF EXISTS "Authenticated can view payments" ON payments;

CREATE POLICY "payments_select_policy" ON payments
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'payments', 'view')
);

CREATE POLICY "payments_insert_policy" ON payments
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'payments', 'create')
);

CREATE POLICY "payments_update_policy" ON payments
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'payments', 'edit')
);

CREATE POLICY "payments_delete_policy" ON payments
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 4. تحديث سياسات جدول quotations (عروض الأسعار)
-- =============================================

DROP POLICY IF EXISTS "Admin or sales can manage quotations" ON quotations;
DROP POLICY IF EXISTS "Authenticated can view quotations" ON quotations;

CREATE POLICY "quotations_select_policy" ON quotations
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'view')
);

CREATE POLICY "quotations_insert_policy" ON quotations
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'create')
);

CREATE POLICY "quotations_update_policy" ON quotations
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'edit')
);

CREATE POLICY "quotations_delete_policy" ON quotations
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'delete')
);

-- =============================================
-- 5. تحديث سياسات جدول quotation_items
-- =============================================

DROP POLICY IF EXISTS "Admin or sales can manage quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Authenticated can view quotation items" ON quotation_items;

CREATE POLICY "quotation_items_select_policy" ON quotation_items
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'view')
);

CREATE POLICY "quotation_items_insert_policy" ON quotation_items
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'create')
);

CREATE POLICY "quotation_items_update_policy" ON quotation_items
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'edit')
);

CREATE POLICY "quotation_items_delete_policy" ON quotation_items
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'quotations', 'delete')
);

-- =============================================
-- 6. تحديث سياسات جدول sales_orders (أوامر البيع)
-- =============================================

DROP POLICY IF EXISTS "Admin or sales can manage orders" ON sales_orders;
DROP POLICY IF EXISTS "Authenticated can view orders" ON sales_orders;

CREATE POLICY "sales_orders_select_policy" ON sales_orders
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'view')
);

CREATE POLICY "sales_orders_insert_policy" ON sales_orders
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'create')
);

CREATE POLICY "sales_orders_update_policy" ON sales_orders
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'edit')
);

CREATE POLICY "sales_orders_delete_policy" ON sales_orders
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'delete')
);

-- =============================================
-- 7. تحديث سياسات جدول sales_order_items
-- =============================================

DROP POLICY IF EXISTS "Admin or sales can manage order items" ON sales_order_items;
DROP POLICY IF EXISTS "Authenticated can view order items" ON sales_order_items;

CREATE POLICY "sales_order_items_select_policy" ON sales_order_items
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'view')
);

CREATE POLICY "sales_order_items_insert_policy" ON sales_order_items
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'create')
);

CREATE POLICY "sales_order_items_update_policy" ON sales_order_items
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'edit')
);

CREATE POLICY "sales_order_items_delete_policy" ON sales_order_items
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'sales_orders', 'delete')
);

-- =============================================
-- 8. تحديث سياسات جدول customers (العملاء)
-- =============================================

DROP POLICY IF EXISTS "Admin or sales can manage customers" ON customers;
DROP POLICY IF EXISTS "Role-based customer access" ON customers;

CREATE POLICY "customers_select_policy" ON customers
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'view')
);

CREATE POLICY "customers_insert_policy" ON customers
FOR INSERT TO authenticated
WITH CHECK (
    (has_role(auth.uid(), 'admin') OR check_section_permission(auth.uid(), 'customers', 'create'))
    AND check_financial_limit(auth.uid(), 'credit', COALESCE(credit_limit, 0))
);

CREATE POLICY "customers_update_policy" ON customers
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'edit')
)
WITH CHECK (
    check_financial_limit(auth.uid(), 'credit', COALESCE(credit_limit, 0))
);

CREATE POLICY "customers_delete_policy" ON customers
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'delete')
);

-- =============================================
-- 9. تحديث سياسات جدول customer_addresses
-- =============================================

DROP POLICY IF EXISTS "Admin or sales can manage addresses" ON customer_addresses;
DROP POLICY IF EXISTS "Role-based address access" ON customer_addresses;

CREATE POLICY "customer_addresses_select_policy" ON customer_addresses
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'view')
);

CREATE POLICY "customer_addresses_insert_policy" ON customer_addresses
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'create')
);

CREATE POLICY "customer_addresses_update_policy" ON customer_addresses
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'edit')
);

CREATE POLICY "customer_addresses_delete_policy" ON customer_addresses
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'delete')
);

-- =============================================
-- 10. تحديث سياسات جدول customer_categories
-- =============================================

DROP POLICY IF EXISTS "Admin can manage customer categories" ON customer_categories;
DROP POLICY IF EXISTS "Role-based customer categories access" ON customer_categories;

CREATE POLICY "customer_categories_select_policy" ON customer_categories
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'customers', 'view')
);

CREATE POLICY "customer_categories_manage_policy" ON customer_categories
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =============================================
-- 11. تحديث سياسات جدول products (المنتجات)
-- =============================================

DROP POLICY IF EXISTS "Admin or warehouse can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated can view products" ON products;

CREATE POLICY "products_select_policy" ON products
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'products', 'view')
);

CREATE POLICY "products_insert_policy" ON products
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'products', 'create')
);

CREATE POLICY "products_update_policy" ON products
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'products', 'edit')
);

CREATE POLICY "products_delete_policy" ON products
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'products', 'delete')
);

-- =============================================
-- 12. تحديث سياسات جدول product_categories
-- =============================================

DROP POLICY IF EXISTS "Admin or warehouse can manage categories" ON product_categories;
DROP POLICY IF EXISTS "Authenticated can view categories" ON product_categories;

CREATE POLICY "product_categories_select_policy" ON product_categories
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'products', 'view')
);

CREATE POLICY "product_categories_manage_policy" ON product_categories
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse'));

-- =============================================
-- 13. تحديث سياسات جدول product_stock
-- =============================================

DROP POLICY IF EXISTS "Admin or warehouse can manage stock" ON product_stock;
DROP POLICY IF EXISTS "Authenticated can view stock" ON product_stock;

CREATE POLICY "product_stock_select_policy" ON product_stock
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'inventory', 'view')
);

CREATE POLICY "product_stock_insert_policy" ON product_stock
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'inventory', 'create')
);

CREATE POLICY "product_stock_update_policy" ON product_stock
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'inventory', 'edit')
);

CREATE POLICY "product_stock_delete_policy" ON product_stock
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 14. تحديث سياسات جدول stock_movements
-- =============================================

DROP POLICY IF EXISTS "Admin or warehouse can manage movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated can view movements" ON stock_movements;

CREATE POLICY "stock_movements_select_policy" ON stock_movements
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'inventory', 'view')
);

CREATE POLICY "stock_movements_insert_policy" ON stock_movements
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'inventory', 'create')
);

CREATE POLICY "stock_movements_update_policy" ON stock_movements
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "stock_movements_delete_policy" ON stock_movements
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 15. تحديث سياسات جدول suppliers (الموردين)
-- =============================================

DROP POLICY IF EXISTS "Admin or warehouse can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated can view suppliers" ON suppliers;

CREATE POLICY "suppliers_select_policy" ON suppliers
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'suppliers', 'view')
);

CREATE POLICY "suppliers_insert_policy" ON suppliers
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'suppliers', 'create')
);

CREATE POLICY "suppliers_update_policy" ON suppliers
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'suppliers', 'edit')
);

CREATE POLICY "suppliers_delete_policy" ON suppliers
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'suppliers', 'delete')
);

-- =============================================
-- 16. تحديث سياسات جدول supplier_notes
-- =============================================

DROP POLICY IF EXISTS "Admin or warehouse can manage supplier notes" ON supplier_notes;
DROP POLICY IF EXISTS "Authenticated can view supplier notes" ON supplier_notes;

CREATE POLICY "supplier_notes_select_policy" ON supplier_notes
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'suppliers', 'view')
);

CREATE POLICY "supplier_notes_insert_policy" ON supplier_notes
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'suppliers', 'create')
);

CREATE POLICY "supplier_notes_delete_policy" ON supplier_notes
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'suppliers', 'delete')
);

-- =============================================
-- 17. تحديث سياسات جدول purchase_orders
-- =============================================

DROP POLICY IF EXISTS "Admin or warehouse can manage purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated can view purchase orders" ON purchase_orders;

CREATE POLICY "purchase_orders_select_policy" ON purchase_orders
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'purchase_orders', 'view')
);

CREATE POLICY "purchase_orders_insert_policy" ON purchase_orders
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'purchase_orders', 'create')
);

CREATE POLICY "purchase_orders_update_policy" ON purchase_orders
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'purchase_orders', 'edit')
);

CREATE POLICY "purchase_orders_delete_policy" ON purchase_orders
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'purchase_orders', 'delete')
);

-- =============================================
-- 18. تحديث سياسات جدول expenses (المصروفات)
-- =============================================

DROP POLICY IF EXISTS "Admins can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Accountants can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON expenses;

CREATE POLICY "expenses_select_policy" ON expenses
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'accountant')
    OR created_by = auth.uid()
    OR check_section_permission(auth.uid(), 'expenses', 'view')
);

CREATE POLICY "expenses_insert_policy" ON expenses
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "expenses_update_policy" ON expenses
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'accountant')
    OR check_section_permission(auth.uid(), 'expenses', 'edit')
);

CREATE POLICY "expenses_delete_policy" ON expenses
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 19. تحديث سياسات جدول expense_categories
-- =============================================

DROP POLICY IF EXISTS "Admins can manage expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Accountants can manage expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Authenticated can view expense categories" ON expense_categories;

CREATE POLICY "expense_categories_select_policy" ON expense_categories
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "expense_categories_manage_policy" ON expense_categories
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'));

-- =============================================
-- 20. تحديث سياسات جدول cash_registers
-- =============================================

DROP POLICY IF EXISTS "Admins can manage cash registers" ON cash_registers;
DROP POLICY IF EXISTS "Accountants can manage cash registers" ON cash_registers;
DROP POLICY IF EXISTS "Authenticated can view cash registers" ON cash_registers;

CREATE POLICY "cash_registers_select_policy" ON cash_registers
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'accountant')
    OR check_section_permission(auth.uid(), 'treasury', 'view')
);

CREATE POLICY "cash_registers_manage_policy" ON cash_registers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'));

-- =============================================
-- 21. تحديث سياسات جدول cash_transactions
-- =============================================

DROP POLICY IF EXISTS "Admins can manage cash transactions" ON cash_transactions;
DROP POLICY IF EXISTS "Accountants can manage cash transactions" ON cash_transactions;
DROP POLICY IF EXISTS "Authenticated can view cash transactions" ON cash_transactions;

CREATE POLICY "cash_transactions_select_policy" ON cash_transactions
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'accountant')
    OR check_section_permission(auth.uid(), 'treasury', 'view')
);

CREATE POLICY "cash_transactions_insert_policy" ON cash_transactions
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'accountant')
    OR check_section_permission(auth.uid(), 'treasury', 'create')
);

CREATE POLICY "cash_transactions_update_policy" ON cash_transactions
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "cash_transactions_delete_policy" ON cash_transactions
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 22. تحديث سياسات جدول bank_accounts
-- =============================================

DROP POLICY IF EXISTS "Admins can manage bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Accountants can manage bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Financial staff can view bank accounts" ON bank_accounts;

CREATE POLICY "bank_accounts_select_policy" ON bank_accounts
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'accountant')
);

CREATE POLICY "bank_accounts_manage_policy" ON bank_accounts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'));

-- =============================================
-- 23. تحديث سياسات جدول employees (الموظفين)
-- =============================================

DROP POLICY IF EXISTS "Admin and HR can manage employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

CREATE POLICY "employees_select_policy" ON employees
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'hr')
    OR user_id = auth.uid()
    OR check_section_permission(auth.uid(), 'employees', 'view')
);

CREATE POLICY "employees_insert_policy" ON employees
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'hr')
    OR check_section_permission(auth.uid(), 'employees', 'create')
);

CREATE POLICY "employees_update_policy" ON employees
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'hr')
    OR check_section_permission(auth.uid(), 'employees', 'edit')
);

CREATE POLICY "employees_delete_policy" ON employees
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 24. تحديث سياسات جدول tasks (المهام)
-- =============================================

DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated can create tasks with proper assignment" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "tasks_select_policy" ON tasks
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR assigned_to = auth.uid() 
    OR created_by = auth.uid()
);

CREATE POLICY "tasks_insert_policy" ON tasks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_update_policy" ON tasks
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR assigned_to = auth.uid() 
    OR created_by = auth.uid()
);

CREATE POLICY "tasks_delete_policy" ON tasks
FOR DELETE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR created_by = auth.uid()
);