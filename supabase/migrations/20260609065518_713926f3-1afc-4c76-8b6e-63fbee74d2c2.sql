-- PART 1: Fix user-visible dashboard MV permission error
CREATE OR REPLACE FUNCTION public.get_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_customers bigint;
  v_products bigint;
  v_invoices bigint;
  v_quotations bigint;
  v_current_period bigint;
  v_previous_period bigint;
  v_monthly jsonb;
  v_today_revenue numeric;
  v_mtd_revenue numeric;
  v_outstanding_ar numeric;
  v_overdue_ar numeric;
  v_cash_balance numeric;
  v_pending_approvals bigint;
  v_dso numeric;
  v_credit_sales_90 numeric;
  v_gross_margin_value numeric;
  v_gross_margin_pct numeric;
  v_thirty timestamptz := now() - interval '30 days';
  v_sixty timestamptz := now() - interval '60 days';
  v_ninety timestamptz := now() - interval '90 days';
  v_six_months_start timestamptz := date_trunc('month', now() - interval '5 months');
  v_today_start timestamptz := date_trunc('day', now());
  v_month_start timestamptz := date_trunc('month', now());
BEGIN
  v_tenant := public.get_user_tenant_id(auth.uid());
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('error', 'no_tenant');
  END IF;

  SELECT customers_count, products_count, invoices_count, quotations_count
    INTO v_customers, v_products, v_invoices, v_quotations
  FROM public.mv_dashboard_counts WHERE tenant_id = v_tenant;

  IF v_customers IS NULL THEN
    SELECT COUNT(*) INTO v_customers FROM customers WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_products  FROM products  WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_invoices  FROM invoices  WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_quotations FROM quotations WHERE tenant_id = v_tenant;
  END IF;

  SELECT COUNT(*) INTO v_current_period FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_thirty;
  SELECT COUNT(*) INTO v_previous_period FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_sixty AND created_at < v_thirty;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('month', to_char(month_start, 'YYYY-MM'), 'sales', total_sales) ORDER BY month_start), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT date_trunc('month', created_at) AS month_start, COALESCE(SUM(total_amount), 0)::numeric AS total_sales
    FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_six_months_start
    GROUP BY date_trunc('month', created_at)
  ) m;

  SELECT COALESCE(SUM(total_amount), 0) INTO v_today_revenue FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_today_start;
  SELECT COALESCE(SUM(total_amount), 0) INTO v_mtd_revenue FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_month_start;
  SELECT COALESCE(SUM(GREATEST(total_amount - COALESCE(paid_amount, 0), 0)), 0) INTO v_outstanding_ar
  FROM invoices WHERE tenant_id = v_tenant AND COALESCE(paid_amount, 0) < total_amount;
  SELECT COALESCE(SUM(GREATEST(total_amount - COALESCE(paid_amount, 0), 0)), 0) INTO v_overdue_ar
  FROM invoices WHERE tenant_id = v_tenant AND COALESCE(paid_amount, 0) < total_amount AND due_date IS NOT NULL AND due_date < CURRENT_DATE;
  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_balance FROM cash_registers WHERE tenant_id = v_tenant AND is_active = true;
  SELECT COUNT(*) INTO v_pending_approvals FROM invoices WHERE tenant_id = v_tenant AND approval_status = 'pending';
  SELECT COALESCE(SUM(total_amount), 0) INTO v_credit_sales_90 FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_ninety;

  v_dso := CASE WHEN v_credit_sales_90 > 0 THEN ROUND((v_outstanding_ar / v_credit_sales_90 * 90)::numeric, 1) ELSE 0 END;

  SELECT COALESCE(SUM((ii.unit_price - COALESCE(p.cost_price, 0)) * ii.quantity), 0) INTO v_gross_margin_value
  FROM invoice_items ii
  JOIN invoices inv ON inv.id = ii.invoice_id
  LEFT JOIN products p ON p.id = ii.product_id
  WHERE inv.tenant_id = v_tenant AND inv.created_at >= v_month_start;

  v_gross_margin_pct := CASE WHEN v_mtd_revenue > 0 THEN ROUND((v_gross_margin_value / v_mtd_revenue * 100)::numeric, 1) ELSE 0 END;

  RETURN jsonb_build_object(
    'customers_count', v_customers, 'products_count', v_products,
    'invoices_count', v_invoices, 'quotations_count', v_quotations,
    'current_period_invoices', v_current_period, 'previous_period_invoices', v_previous_period,
    'monthly_sales', v_monthly, 'today_revenue', v_today_revenue, 'mtd_revenue', v_mtd_revenue,
    'outstanding_ar', v_outstanding_ar, 'overdue_ar', v_overdue_ar,
    'cash_balance', v_cash_balance, 'pending_approvals', v_pending_approvals,
    'dso_days', v_dso, 'gross_margin_value', ROUND(v_gross_margin_value::numeric, 2),
    'gross_margin_pct', v_gross_margin_pct
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_dashboard_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated;


-- PART 2: REVOKE anon on every public table + lock defaults
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT format('%I.%I', schemaname, tablename) AS qname FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'REVOKE ALL ON ' || r.qname || ' FROM anon';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ' || r.qname || ' TO authenticated';
    EXECUTE 'GRANT ALL ON ' || r.qname || ' TO service_role';
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- PART 3: Drop existing policies on 22 tables + recreate tenant-scoped
DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'company_settings','product_categories','product_variants',
    'customer_categories','custom_roles','role_section_permissions',
    'role_field_permissions','role_limits','section_customizations',
    'export_templates','system_settings','report_templates',
    'expense_categories','cash_registers','cash_transactions',
    'bank_accounts','customer_communications','customer_reminders',
    'tasks','notifications','activity_logs','audit_trail'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Config/lookup: tenant-read + admin-write
CREATE POLICY "tenant_read" ON public.company_settings FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.company_settings FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.product_categories FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.product_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse')))
  WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse')));

CREATE POLICY "tenant_read" ON public.product_variants FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.product_variants FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse')))
  WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse')));

CREATE POLICY "tenant_read" ON public.customer_categories FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.customer_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.custom_roles FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.custom_roles FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.role_section_permissions FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.role_section_permissions FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.role_field_permissions FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.role_field_permissions FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.role_limits FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.role_limits FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.section_customizations FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.section_customizations FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.export_templates FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.export_templates FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.system_settings FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.system_settings FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_read" ON public.report_templates FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_write" ON public.report_templates FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant())
  WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "tenant_read" ON public.expense_categories FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_admin_write" ON public.expense_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

-- Finance: admin or accountant
CREATE POLICY "tenant_read" ON public.cash_registers FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_finance_write" ON public.cash_registers FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')))
  WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')));

CREATE POLICY "tenant_read" ON public.cash_transactions FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_finance_write" ON public.cash_transactions FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')))
  WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')));

CREATE POLICY "tenant_read" ON public.bank_accounts FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_finance_write" ON public.bank_accounts FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')))
  WITH CHECK (tenant_id = public.get_current_tenant() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')));

CREATE POLICY "tenant_read" ON public.customer_communications FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_write" ON public.customer_communications FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "tenant_read" ON public.customer_reminders FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_write" ON public.customer_reminders FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

-- Tasks (no 'manager' role exists; use admin)
CREATE POLICY "tenant_tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant()
    AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "tenant_tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant() AND created_by = auth.uid());
CREATE POLICY "tenant_tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (tenant_id = public.get_current_tenant());
CREATE POLICY "tenant_tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "tenant_notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant() AND user_id = auth.uid());
CREATE POLICY "tenant_notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant() AND user_id = auth.uid())
  WITH CHECK (tenant_id = public.get_current_tenant() AND user_id = auth.uid());
CREATE POLICY "tenant_notifications_delete" ON public.notifications FOR DELETE TO authenticated
  USING (tenant_id = public.get_current_tenant() AND user_id = auth.uid());

CREATE POLICY "tenant_activity_insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "tenant_activity_read" ON public.activity_logs FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant() AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "tenant_audit_insert" ON public.audit_trail FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant() AND auth.uid() IS NOT NULL);
CREATE POLICY "tenant_audit_read" ON public.audit_trail FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));
