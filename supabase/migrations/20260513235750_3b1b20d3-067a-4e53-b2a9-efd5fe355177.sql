
CREATE OR REPLACE FUNCTION public.get_low_stock_products()
RETURNS TABLE (product_id uuid, product_name text, current_stock numeric, min_stock numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, COALESCE(SUM(ps.quantity), 0)::numeric, p.min_stock::numeric
  FROM public.products p
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id
  WHERE p.is_active = true
    AND p.min_stock IS NOT NULL
    AND p.min_stock > 0
    AND p.tenant_id = public.get_current_tenant()
  GROUP BY p.id, p.name, p.min_stock
  HAVING COALESCE(SUM(ps.quantity), 0) <= p.min_stock
  ORDER BY (p.min_stock - COALESCE(SUM(ps.quantity), 0)) DESC
  LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.get_unpaid_invoices_summary()
RETURNS TABLE (total_unpaid numeric, invoice_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)::numeric,
    COUNT(*)::bigint
  FROM public.invoices
  WHERE payment_status <> 'paid'
    AND tenant_id = public.get_current_tenant();
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_sales_decline()
RETURNS TABLE (customer_id uuid, customer_name text, customer_phone text, recent_sales numeric, previous_sales numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH window_invoices AS (
    SELECT i.customer_id, i.total_amount,
      CASE WHEN i.created_at >= now() - interval '30 days' THEN 'recent' ELSE 'previous' END AS bucket
    FROM public.invoices i
    WHERE i.created_at >= now() - interval '60 days'
      AND i.tenant_id = public.get_current_tenant()
  )
  SELECT c.id, c.name, c.phone,
    COALESCE(SUM(CASE WHEN wi.bucket = 'recent' THEN wi.total_amount END), 0)::numeric,
    COALESCE(SUM(CASE WHEN wi.bucket = 'previous' THEN wi.total_amount END), 0)::numeric
  FROM window_invoices wi
  JOIN public.customers c ON c.id = wi.customer_id
  GROUP BY c.id, c.name, c.phone
  HAVING COALESCE(SUM(CASE WHEN wi.bucket = 'previous' THEN wi.total_amount END), 0) > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_low_stock_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unpaid_invoices_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_sales_decline() TO authenticated;
