-- =============================================
-- PHASE 1.3: UPDATE RLS POLICIES FOR TENANT ISOLATION
-- Part 4: Inventory, Categories, System Tables
-- =============================================

-- WAREHOUSES TABLE
DROP POLICY IF EXISTS "Users with view permission can view warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users with create permission can insert warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users with edit permission can update warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users with delete permission can delete warehouses" ON public.warehouses;

CREATE POLICY "Tenant users can view warehouses"
    ON public.warehouses FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'view')
    );

CREATE POLICY "Tenant users can create warehouses"
    ON public.warehouses FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'create')
    );

CREATE POLICY "Tenant users can update warehouses"
    ON public.warehouses FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'edit')
    );

CREATE POLICY "Tenant users can delete warehouses"
    ON public.warehouses FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'delete')
    );

-- PRODUCT STOCK TABLE
DROP POLICY IF EXISTS "Users with view permission can view stock" ON public.product_stock;
DROP POLICY IF EXISTS "Users with create permission can insert stock" ON public.product_stock;
DROP POLICY IF EXISTS "Users with edit permission can update stock" ON public.product_stock;
DROP POLICY IF EXISTS "Users with delete permission can delete stock" ON public.product_stock;

CREATE POLICY "Tenant users can view product stock"
    ON public.product_stock FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'view')
    );

CREATE POLICY "Tenant users can create product stock"
    ON public.product_stock FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'create')
    );

CREATE POLICY "Tenant users can update product stock"
    ON public.product_stock FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'edit')
    );

CREATE POLICY "Tenant users can delete product stock"
    ON public.product_stock FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'delete')
    );

-- STOCK MOVEMENTS TABLE
DROP POLICY IF EXISTS "Users with view permission can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users with create permission can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users with edit permission can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users with delete permission can delete stock movements" ON public.stock_movements;

CREATE POLICY "Tenant users can view stock movements"
    ON public.stock_movements FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'view')
    );

CREATE POLICY "Tenant users can create stock movements"
    ON public.stock_movements FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'create')
    );

CREATE POLICY "Tenant users can update stock movements"
    ON public.stock_movements FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'edit')
    );

CREATE POLICY "Tenant users can delete stock movements"
    ON public.stock_movements FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'inventory', 'delete')
    );

-- PRODUCT VARIANTS TABLE
DROP POLICY IF EXISTS "Users with product view can view variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users with product create can insert variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users with product edit can update variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users with product delete can delete variants" ON public.product_variants;

CREATE POLICY "Tenant users can view product variants"
    ON public.product_variants FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'view')
    );

CREATE POLICY "Tenant users can create product variants"
    ON public.product_variants FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'create')
    );

CREATE POLICY "Tenant users can update product variants"
    ON public.product_variants FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'edit')
    );

CREATE POLICY "Tenant users can delete product variants"
    ON public.product_variants FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'delete')
    );

-- PRODUCT CATEGORIES TABLE
DROP POLICY IF EXISTS "Users with view permission can view categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users with create permission can insert categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users with edit permission can update categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users with delete permission can delete categories" ON public.product_categories;

CREATE POLICY "Tenant users can view product categories"
    ON public.product_categories FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'view')
    );

CREATE POLICY "Tenant users can create product categories"
    ON public.product_categories FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'create')
    );

CREATE POLICY "Tenant users can update product categories"
    ON public.product_categories FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'edit')
    );

CREATE POLICY "Tenant users can delete product categories"
    ON public.product_categories FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'delete')
    );

-- CUSTOMER CATEGORIES TABLE
DROP POLICY IF EXISTS "Users can view customer categories" ON public.customer_categories;
DROP POLICY IF EXISTS "Users can create customer categories" ON public.customer_categories;
DROP POLICY IF EXISTS "Users can update customer categories" ON public.customer_categories;
DROP POLICY IF EXISTS "Users can delete customer categories" ON public.customer_categories;

CREATE POLICY "Tenant users can view customer categories"
    ON public.customer_categories FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'view')
    );

CREATE POLICY "Tenant users can create customer categories"
    ON public.customer_categories FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'create')
    );

CREATE POLICY "Tenant users can update customer categories"
    ON public.customer_categories FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'edit')
    );

CREATE POLICY "Tenant users can delete customer categories"
    ON public.customer_categories FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'categories', 'delete')
    );

-- EXPENSE CATEGORIES TABLE
DROP POLICY IF EXISTS "Admin and accountant can view expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Admin and accountant can create expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Admin and accountant can update expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Admin can delete expense categories" ON public.expense_categories;

CREATE POLICY "Tenant users can view expense categories"
    ON public.expense_categories FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'view')
    );

CREATE POLICY "Tenant users can create expense categories"
    ON public.expense_categories FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'create')
    );

CREATE POLICY "Tenant users can update expense categories"
    ON public.expense_categories FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'edit')
    );

CREATE POLICY "Tenant users can delete expense categories"
    ON public.expense_categories FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'delete')
    );

-- CUSTOMER ADDRESSES TABLE
DROP POLICY IF EXISTS "Users with customer view can view addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users with customer create can insert addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users with customer edit can update addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users with customer delete can delete addresses" ON public.customer_addresses;

CREATE POLICY "Tenant users can view customer addresses"
    ON public.customer_addresses FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'view')
    );

CREATE POLICY "Tenant users can create customer addresses"
    ON public.customer_addresses FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'create')
    );

CREATE POLICY "Tenant users can update customer addresses"
    ON public.customer_addresses FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'edit')
    );

CREATE POLICY "Tenant users can delete customer addresses"
    ON public.customer_addresses FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'delete')
    );