
CREATE OR REPLACE FUNCTION public.get_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  FROM public.mv_dashboard_counts
  WHERE tenant_id = v_tenant;

  IF v_customers IS NULL THEN
    SELECT COUNT(*) INTO v_customers FROM customers WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_products  FROM products  WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_invoices  FROM invoices  WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_quotations FROM quotations WHERE tenant_id = v_tenant;
  END IF;

  SELECT COUNT(*) INTO v_current_period
  FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_thirty;

  SELECT COUNT(*) INTO v_previous_period
  FROM invoices WHERE tenant_id = v_tenant
    AND created_at >= v_sixty AND created_at < v_thirty;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month', to_char(month_start, 'YYYY-MM'),
    'sales', total_sales
  ) ORDER BY month_start), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT date_trunc('month', created_at) AS month_start,
           COALESCE(SUM(total_amount), 0)::numeric AS total_sales
    FROM invoices
    WHERE tenant_id = v_tenant AND created_at >= v_six_months_start
    GROUP BY date_trunc('month', created_at)
  ) m;

  SELECT COALESCE(SUM(total_amount), 0) INTO v_today_revenue
  FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_today_start;

  SELECT COALESCE(SUM(total_amount), 0) INTO v_mtd_revenue
  FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_month_start;

  SELECT COALESCE(SUM(GREATEST(total_amount - COALESCE(paid_amount, 0), 0)), 0)
    INTO v_outstanding_ar
  FROM invoices WHERE tenant_id = v_tenant
    AND COALESCE(paid_amount, 0) < total_amount;

  SELECT COALESCE(SUM(GREATEST(total_amount - COALESCE(paid_amount, 0), 0)), 0)
    INTO v_overdue_ar
  FROM invoices WHERE tenant_id = v_tenant
    AND COALESCE(paid_amount, 0) < total_amount
    AND due_date IS NOT NULL AND due_date < CURRENT_DATE;

  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_balance
  FROM cash_registers WHERE tenant_id = v_tenant AND is_active = true;

  SELECT COUNT(*) INTO v_pending_approvals
  FROM invoices WHERE tenant_id = v_tenant AND approval_status = 'pending';

  -- DSO over last 90 days = (Outstanding AR / Credit Sales 90d) * 90
  SELECT COALESCE(SUM(total_amount), 0) INTO v_credit_sales_90
  FROM invoices WHERE tenant_id = v_tenant AND created_at >= v_ninety;

  v_dso := CASE
    WHEN v_credit_sales_90 > 0
      THEN ROUND((v_outstanding_ar / v_credit_sales_90 * 90)::numeric, 1)
    ELSE 0
  END;

  -- Gross margin MTD = SUM((unit_price - cost_price) * quantity) for items in MTD invoices
  SELECT COALESCE(SUM((ii.unit_price - COALESCE(p.cost_price, 0)) * ii.quantity), 0)
    INTO v_gross_margin_value
  FROM invoice_items ii
  JOIN invoices inv ON inv.id = ii.invoice_id
  LEFT JOIN products p ON p.id = ii.product_id
  WHERE inv.tenant_id = v_tenant
    AND inv.created_at >= v_month_start;

  v_gross_margin_pct := CASE
    WHEN v_mtd_revenue > 0
      THEN ROUND((v_gross_margin_value / v_mtd_revenue * 100)::numeric, 1)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'customers_count', v_customers,
    'products_count', v_products,
    'invoices_count', v_invoices,
    'quotations_count', v_quotations,
    'current_period_invoices', v_current_period,
    'previous_period_invoices', v_previous_period,
    'monthly_sales', v_monthly,
    'today_revenue', v_today_revenue,
    'mtd_revenue', v_mtd_revenue,
    'outstanding_ar', v_outstanding_ar,
    'overdue_ar', v_overdue_ar,
    'cash_balance', v_cash_balance,
    'pending_approvals', v_pending_approvals,
    'dso_days', v_dso,
    'gross_margin_value', ROUND(v_gross_margin_value::numeric, 2),
    'gross_margin_pct', v_gross_margin_pct
  );
END;
$function$;
