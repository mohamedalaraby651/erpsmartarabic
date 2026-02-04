-- =============================================
-- PHASE 1.3: UPDATE RLS POLICIES FOR TENANT ISOLATION
-- Part 1: Core Business Tables (customers, products, suppliers, employees)
-- =============================================

-- CUSTOMERS TABLE
DROP POLICY IF EXISTS "Users with view permission can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users with create permission can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users with edit permission can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users with delete permission can delete customers" ON public.customers;

CREATE POLICY "Tenant users can view customers"
    ON public.customers FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'view')
    );

CREATE POLICY "Tenant users can create customers"
    ON public.customers FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'create')
    );

CREATE POLICY "Tenant users can update customers"
    ON public.customers FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'edit')
    );

CREATE POLICY "Tenant users can delete customers"
    ON public.customers FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'customers', 'delete')
    );

-- PRODUCTS TABLE
DROP POLICY IF EXISTS "Users with view permission can view products" ON public.products;
DROP POLICY IF EXISTS "Users with create permission can insert products" ON public.products;
DROP POLICY IF EXISTS "Users with edit permission can update products" ON public.products;
DROP POLICY IF EXISTS "Users with delete permission can delete products" ON public.products;

CREATE POLICY "Tenant users can view products"
    ON public.products FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'view')
    );

CREATE POLICY "Tenant users can create products"
    ON public.products FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'create')
    );

CREATE POLICY "Tenant users can update products"
    ON public.products FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'edit')
    );

CREATE POLICY "Tenant users can delete products"
    ON public.products FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'products', 'delete')
    );

-- SUPPLIERS TABLE
DROP POLICY IF EXISTS "Users with view permission can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users with create permission can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users with edit permission can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users with delete permission can delete suppliers" ON public.suppliers;

CREATE POLICY "Tenant users can view suppliers"
    ON public.suppliers FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'suppliers', 'view')
    );

CREATE POLICY "Tenant users can create suppliers"
    ON public.suppliers FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'suppliers', 'create')
    );

CREATE POLICY "Tenant users can update suppliers"
    ON public.suppliers FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'suppliers', 'edit')
    );

CREATE POLICY "Tenant users can delete suppliers"
    ON public.suppliers FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'suppliers', 'delete')
    );

-- EMPLOYEES TABLE
DROP POLICY IF EXISTS "HR can view employees" ON public.employees;
DROP POLICY IF EXISTS "HR can create employees" ON public.employees;
DROP POLICY IF EXISTS "HR can update employees" ON public.employees;
DROP POLICY IF EXISTS "HR can delete employees" ON public.employees;

CREATE POLICY "Tenant users can view employees"
    ON public.employees FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'employees', 'view')
    );

CREATE POLICY "Tenant users can create employees"
    ON public.employees FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'employees', 'create')
    );

CREATE POLICY "Tenant users can update employees"
    ON public.employees FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'employees', 'edit')
    );

CREATE POLICY "Tenant users can delete employees"
    ON public.employees FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'employees', 'delete')
    );