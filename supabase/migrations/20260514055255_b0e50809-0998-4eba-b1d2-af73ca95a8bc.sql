CREATE OR REPLACE FUNCTION public.get_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_customers bigint;
  v_products bigint;
  v_invoices bigint;
  v_quotations bigint;
  v_current_period bigint;
  v_previous_period bigint;
  v_monthly jsonb;
  v_thirty timestamptz := now() - interval '30 days';
  v_sixty timestamptz := now() - interval '60 days';
  v_six_months_start timestamptz := date_trunc('month', now() - interval '5 months');
BEGIN
  v_tenant := public.get_user_tenant_id(auth.uid());
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('error', 'no_tenant');
  END IF;

  SELECT COUNT(*) INTO v_customers FROM customers WHERE tenant_id = v_tenant;
  SELECT COUNT(*) INTO v_products FROM products WHERE tenant_id = v_tenant;
  SELECT COUNT(*) INTO v_invoices FROM invoices WHERE tenant_id = v_tenant;
  SELECT COUNT(*) INTO v_quotations FROM quotations WHERE tenant_id = v_tenant;

  SELECT COUNT(*) INTO v_current_period
  FROM invoices
  WHERE tenant_id = v_tenant AND created_at >= v_thirty;

  SELECT COUNT(*) INTO v_previous_period
  FROM invoices
  WHERE tenant_id = v_tenant
    AND created_at >= v_sixty
    AND created_at < v_thirty;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month', to_char(month_start, 'YYYY-MM'),
    'sales', total_sales
  ) ORDER BY month_start), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT
      date_trunc('month', created_at) AS month_start,
      COALESCE(SUM(total_amount), 0)::numeric AS total_sales
    FROM invoices
    WHERE tenant_id = v_tenant
      AND created_at >= v_six_months_start
    GROUP BY date_trunc('month', created_at)
  ) m;

  RETURN jsonb_build_object(
    'customers_count', v_customers,
    'products_count', v_products,
    'invoices_count', v_invoices,
    'quotations_count', v_quotations,
    'current_period_invoices', v_current_period,
    'previous_period_invoices', v_previous_period,
    'monthly_sales', v_monthly
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated;