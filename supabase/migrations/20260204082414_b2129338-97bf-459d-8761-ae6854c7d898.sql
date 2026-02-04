-- =============================================
-- PHASE 1.3: UPDATE RLS POLICIES FOR TENANT ISOLATION
-- Part 2: Sales & Purchase Documents
-- =============================================

-- INVOICES TABLE
DROP POLICY IF EXISTS "Users with view permission can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users with create permission can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users with edit permission can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users with delete permission can delete invoices" ON public.invoices;

CREATE POLICY "Tenant users can view invoices"
    ON public.invoices FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'view')
    );

CREATE POLICY "Tenant users can create invoices"
    ON public.invoices FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'create')
    );

CREATE POLICY "Tenant users can update invoices"
    ON public.invoices FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'edit')
    );

CREATE POLICY "Tenant users can delete invoices"
    ON public.invoices FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'delete')
    );

-- INVOICE ITEMS TABLE
DROP POLICY IF EXISTS "Users with invoice view permission can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users with invoice create permission can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users with invoice edit permission can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users with invoice delete permission can delete invoice items" ON public.invoice_items;

CREATE POLICY "Tenant users can view invoice items"
    ON public.invoice_items FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'view')
    );

CREATE POLICY "Tenant users can create invoice items"
    ON public.invoice_items FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'create')
    );

CREATE POLICY "Tenant users can update invoice items"
    ON public.invoice_items FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'edit')
    );

CREATE POLICY "Tenant users can delete invoice items"
    ON public.invoice_items FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'invoices', 'delete')
    );

-- QUOTATIONS TABLE
DROP POLICY IF EXISTS "Users with view permission can view quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users with create permission can insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users with edit permission can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users with delete permission can delete quotations" ON public.quotations;

CREATE POLICY "Tenant users can view quotations"
    ON public.quotations FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'view')
    );

CREATE POLICY "Tenant users can create quotations"
    ON public.quotations FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'create')
    );

CREATE POLICY "Tenant users can update quotations"
    ON public.quotations FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'edit')
    );

CREATE POLICY "Tenant users can delete quotations"
    ON public.quotations FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'delete')
    );

-- QUOTATION ITEMS TABLE
DROP POLICY IF EXISTS "Users with quotation view permission can view quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users with quotation create permission can insert quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users with quotation edit permission can update quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users with quotation delete permission can delete quotation items" ON public.quotation_items;

CREATE POLICY "Tenant users can view quotation items"
    ON public.quotation_items FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'view')
    );

CREATE POLICY "Tenant users can create quotation items"
    ON public.quotation_items FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'create')
    );

CREATE POLICY "Tenant users can update quotation items"
    ON public.quotation_items FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'edit')
    );

CREATE POLICY "Tenant users can delete quotation items"
    ON public.quotation_items FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'quotations', 'delete')
    );

-- SALES ORDERS TABLE
DROP POLICY IF EXISTS "Users with view permission can view sales orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Users with create permission can insert sales orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Users with edit permission can update sales orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Users with delete permission can delete sales orders" ON public.sales_orders;

CREATE POLICY "Tenant users can view sales orders"
    ON public.sales_orders FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'view')
    );

CREATE POLICY "Tenant users can create sales orders"
    ON public.sales_orders FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'create')
    );

CREATE POLICY "Tenant users can update sales orders"
    ON public.sales_orders FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'edit')
    );

CREATE POLICY "Tenant users can delete sales orders"
    ON public.sales_orders FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'delete')
    );

-- SALES ORDER ITEMS TABLE
DROP POLICY IF EXISTS "Users with order view can view order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Users with order create can insert order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Users with order edit can update order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Users with order delete can delete order items" ON public.sales_order_items;

CREATE POLICY "Tenant users can view sales order items"
    ON public.sales_order_items FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'view')
    );

CREATE POLICY "Tenant users can create sales order items"
    ON public.sales_order_items FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'create')
    );

CREATE POLICY "Tenant users can update sales order items"
    ON public.sales_order_items FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'edit')
    );

CREATE POLICY "Tenant users can delete sales order items"
    ON public.sales_order_items FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'sales_orders', 'delete')
    );

-- PURCHASE ORDERS TABLE
DROP POLICY IF EXISTS "Users with view permission can view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users with create permission can insert purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users with edit permission can update purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users with delete permission can delete purchase orders" ON public.purchase_orders;

CREATE POLICY "Tenant users can view purchase orders"
    ON public.purchase_orders FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'view')
    );

CREATE POLICY "Tenant users can create purchase orders"
    ON public.purchase_orders FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'create')
    );

CREATE POLICY "Tenant users can update purchase orders"
    ON public.purchase_orders FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'edit')
    );

CREATE POLICY "Tenant users can delete purchase orders"
    ON public.purchase_orders FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'delete')
    );

-- PURCHASE ORDER ITEMS TABLE
DROP POLICY IF EXISTS "Users with PO view can view PO items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users with PO create can insert PO items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users with PO edit can update PO items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users with PO delete can delete PO items" ON public.purchase_order_items;

CREATE POLICY "Tenant users can view purchase order items"
    ON public.purchase_order_items FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'view')
    );

CREATE POLICY "Tenant users can create purchase order items"
    ON public.purchase_order_items FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'create')
    );

CREATE POLICY "Tenant users can update purchase order items"
    ON public.purchase_order_items FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'edit')
    );

CREATE POLICY "Tenant users can delete purchase order items"
    ON public.purchase_order_items FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'purchase_orders', 'delete')
    );