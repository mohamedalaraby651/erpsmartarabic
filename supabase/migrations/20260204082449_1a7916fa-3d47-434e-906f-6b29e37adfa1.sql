-- =============================================
-- PHASE 1.3: UPDATE RLS POLICIES FOR TENANT ISOLATION
-- Part 3: Finance, Payments, Treasury, Accounting
-- =============================================

-- PAYMENTS TABLE
DROP POLICY IF EXISTS "Users with view permission can view payments" ON public.payments;
DROP POLICY IF EXISTS "Users with create permission can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users with edit permission can update payments" ON public.payments;
DROP POLICY IF EXISTS "Users with delete permission can delete payments" ON public.payments;

CREATE POLICY "Tenant users can view payments"
    ON public.payments FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'payments', 'view')
    );

CREATE POLICY "Tenant users can create payments"
    ON public.payments FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'payments', 'create')
    );

CREATE POLICY "Tenant users can update payments"
    ON public.payments FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'payments', 'edit')
    );

CREATE POLICY "Tenant users can delete payments"
    ON public.payments FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'payments', 'delete')
    );

-- EXPENSES TABLE
DROP POLICY IF EXISTS "Users with view permission can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users with create permission can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users with edit permission can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users with delete permission can delete expenses" ON public.expenses;

CREATE POLICY "Tenant users can view expenses"
    ON public.expenses FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'view')
    );

CREATE POLICY "Tenant users can create expenses"
    ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'create')
    );

CREATE POLICY "Tenant users can update expenses"
    ON public.expenses FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'edit')
    );

CREATE POLICY "Tenant users can delete expenses"
    ON public.expenses FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'expenses', 'delete')
    );

-- SUPPLIER PAYMENTS TABLE
DROP POLICY IF EXISTS "Users with supplier payment view can view" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users with supplier payment create can insert" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users with supplier payment edit can update" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users with supplier payment delete can delete" ON public.supplier_payments;

CREATE POLICY "Tenant users can view supplier payments"
    ON public.supplier_payments FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'supplier_payments', 'view')
    );

CREATE POLICY "Tenant users can create supplier payments"
    ON public.supplier_payments FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'supplier_payments', 'create')
    );

CREATE POLICY "Tenant users can update supplier payments"
    ON public.supplier_payments FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'supplier_payments', 'edit')
    );

CREATE POLICY "Tenant users can delete supplier payments"
    ON public.supplier_payments FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'supplier_payments', 'delete')
    );

-- CASH REGISTERS TABLE
DROP POLICY IF EXISTS "Admin and accountant can view cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Admin and accountant can create cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Admin and accountant can update cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Admin can delete cash registers" ON public.cash_registers;

CREATE POLICY "Tenant users can view cash registers"
    ON public.cash_registers FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'view')
    );

CREATE POLICY "Tenant users can create cash registers"
    ON public.cash_registers FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'create')
    );

CREATE POLICY "Tenant users can update cash registers"
    ON public.cash_registers FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'edit')
    );

CREATE POLICY "Tenant users can delete cash registers"
    ON public.cash_registers FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'delete')
    );

-- CASH TRANSACTIONS TABLE
DROP POLICY IF EXISTS "Admin and accountant can view cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Admin and accountant can create cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Admin can update cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Admin can delete cash transactions" ON public.cash_transactions;

CREATE POLICY "Tenant users can view cash transactions"
    ON public.cash_transactions FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'view')
    );

CREATE POLICY "Tenant users can create cash transactions"
    ON public.cash_transactions FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'create')
    );

CREATE POLICY "Tenant users can update cash transactions"
    ON public.cash_transactions FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'edit')
    );

CREATE POLICY "Tenant users can delete cash transactions"
    ON public.cash_transactions FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'treasury', 'delete')
    );

-- BANK ACCOUNTS TABLE
DROP POLICY IF EXISTS "Admin and accountant can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin can create bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin can update bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin can delete bank accounts" ON public.bank_accounts;

CREATE POLICY "Tenant users can view bank accounts"
    ON public.bank_accounts FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'))
    );

CREATE POLICY "Tenant admins can create bank accounts"
    ON public.bank_accounts FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update bank accounts"
    ON public.bank_accounts FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can delete bank accounts"
    ON public.bank_accounts FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- CHART OF ACCOUNTS TABLE
DROP POLICY IF EXISTS "Admin and accountant can view accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Admin and accountant can create accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Admin and accountant can update accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Admin can delete accounts" ON public.chart_of_accounts;

CREATE POLICY "Tenant users can view chart of accounts"
    ON public.chart_of_accounts FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'view')
    );

CREATE POLICY "Tenant users can create accounts"
    ON public.chart_of_accounts FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'create')
    );

CREATE POLICY "Tenant users can update accounts"
    ON public.chart_of_accounts FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'edit')
    );

CREATE POLICY "Tenant users can delete accounts"
    ON public.chart_of_accounts FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'delete')
    );

-- JOURNALS TABLE
DROP POLICY IF EXISTS "Admin and accountant can view journals" ON public.journals;
DROP POLICY IF EXISTS "Admin and accountant can create journals" ON public.journals;
DROP POLICY IF EXISTS "Admin and accountant can update journals" ON public.journals;
DROP POLICY IF EXISTS "Admin can delete journals" ON public.journals;

CREATE POLICY "Tenant users can view journals"
    ON public.journals FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'view')
    );

CREATE POLICY "Tenant users can create journals"
    ON public.journals FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'create')
    );

CREATE POLICY "Tenant users can update journals"
    ON public.journals FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'edit')
    );

CREATE POLICY "Tenant users can delete journals"
    ON public.journals FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'delete')
    );

-- JOURNAL ENTRIES TABLE
DROP POLICY IF EXISTS "Admin and accountant can view journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admin and accountant can create journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admin and accountant can update journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admin can delete journal entries" ON public.journal_entries;

CREATE POLICY "Tenant users can view journal entries"
    ON public.journal_entries FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'view')
    );

CREATE POLICY "Tenant users can create journal entries"
    ON public.journal_entries FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'create')
    );

CREATE POLICY "Tenant users can update journal entries"
    ON public.journal_entries FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'edit')
    );

CREATE POLICY "Tenant users can delete journal entries"
    ON public.journal_entries FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'delete')
    );

-- FISCAL PERIODS TABLE
DROP POLICY IF EXISTS "Admin and accountant can view fiscal periods" ON public.fiscal_periods;
DROP POLICY IF EXISTS "Admin and accountant can create fiscal periods" ON public.fiscal_periods;
DROP POLICY IF EXISTS "Admin and accountant can update fiscal periods" ON public.fiscal_periods;
DROP POLICY IF EXISTS "Admin can delete fiscal periods" ON public.fiscal_periods;

CREATE POLICY "Tenant users can view fiscal periods"
    ON public.fiscal_periods FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'view')
    );

CREATE POLICY "Tenant users can create fiscal periods"
    ON public.fiscal_periods FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'create')
    );

CREATE POLICY "Tenant users can update fiscal periods"
    ON public.fiscal_periods FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'edit')
    );

CREATE POLICY "Tenant users can delete fiscal periods"
    ON public.fiscal_periods FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.check_section_permission(auth.uid(), 'accounting', 'delete')
    );