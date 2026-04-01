
CREATE OR REPLACE FUNCTION public.get_customer_chart_data(_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _monthly_data jsonb;
  _top_products jsonb;
BEGIN
  -- Monthly totals (invoices & payments) for chart rendering
  SELECT COALESCE(jsonb_agg(row_to_json(m) ORDER BY m.month), '[]'::jsonb)
  INTO _monthly_data
  FROM (
    SELECT
      TO_CHAR(d.month, 'YYYY-MM') AS month,
      COALESCE(inv.total, 0) AS invoice_total,
      COALESCE(inv.cnt, 0) AS invoice_count,
      COALESCE(pay.total, 0) AS payment_total,
      COALESCE(pay.cnt, 0) AS payment_count
    FROM (
      SELECT DISTINCT DATE_TRUNC('month', created_at) AS month
      FROM invoices WHERE customer_id = _customer_id
      UNION
      SELECT DISTINCT DATE_TRUNC('month', payment_date::timestamp) AS month
      FROM payments WHERE customer_id = _customer_id
    ) d
    LEFT JOIN (
      SELECT DATE_TRUNC('month', created_at) AS month, SUM(total_amount) AS total, COUNT(*) AS cnt
      FROM invoices WHERE customer_id = _customer_id
      GROUP BY 1
    ) inv ON inv.month = d.month
    LEFT JOIN (
      SELECT DATE_TRUNC('month', payment_date::timestamp) AS month, SUM(amount) AS total, COUNT(*) AS cnt
      FROM payments WHERE customer_id = _customer_id
      GROUP BY 1
    ) pay ON pay.month = d.month
    ORDER BY d.month DESC
    LIMIT 24
  ) m;

  -- Top products by revenue
  SELECT COALESCE(jsonb_agg(row_to_json(tp) ORDER BY tp.total_revenue DESC), '[]'::jsonb)
  INTO _top_products
  FROM (
    SELECT
      p.name AS product_name,
      SUM(ii.quantity) AS total_quantity,
      SUM(ii.total_price) AS total_revenue
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    JOIN products p ON p.id = ii.product_id
    WHERE i.customer_id = _customer_id
    GROUP BY p.id, p.name
    ORDER BY total_revenue DESC
    LIMIT 10
  ) tp;

  RETURN jsonb_build_object(
    'monthly_data', _monthly_data,
    'top_products', _top_products
  );
END;
$$;
