-- Materialized view: per-tenant counts (cheap reads, refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_dashboard_counts AS
SELECT
  t.id AS tenant_id,
  (SELECT COUNT(*) FROM public.customers c WHERE c.tenant_id = t.id) AS customers_count,
  (SELECT COUNT(*) FROM public.products  p WHERE p.tenant_id = t.id) AS products_count,
  (SELECT COUNT(*) FROM public.invoices  i WHERE i.tenant_id = t.id) AS invoices_count,
  (SELECT COUNT(*) FROM public.quotations q WHERE q.tenant_id = t.id) AS quotations_count,
  now() AS refreshed_at
FROM public.tenants t;

CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_counts_tenant_idx
  ON public.mv_dashboard_counts (tenant_id);

-- Refresh helper (CONCURRENTLY needs the unique index above)
CREATE OR REPLACE FUNCTION public.refresh_mv_dashboard_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_counts;
EXCEPTION WHEN OTHERS THEN
  -- First refresh cannot run CONCURRENTLY; fall back to a regular refresh
  REFRESH MATERIALIZED VIEW public.mv_dashboard_counts;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_mv_dashboard_counts() FROM PUBLIC, anon, authenticated;

-- Initial population
SELECT public.refresh_mv_dashboard_counts();

-- Update overview RPC to read counts from MV (with live fallback)
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

  -- Try the materialized view first (cheap O(1) row lookup)
  SELECT customers_count, products_count, invoices_count, quotations_count
    INTO v_customers, v_products, v_invoices, v_quotations
  FROM public.mv_dashboard_counts
  WHERE tenant_id = v_tenant;

  -- Fallback to live counts when MV has no row yet (new tenant)
  IF v_customers IS NULL THEN
    SELECT COUNT(*) INTO v_customers FROM customers WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_products  FROM products  WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_invoices  FROM invoices  WHERE tenant_id = v_tenant;
    SELECT COUNT(*) INTO v_quotations FROM quotations WHERE tenant_id = v_tenant;
  END IF;

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