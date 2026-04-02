
-- =============================================
-- RPC 1: get_supplier_financial_summary
-- =============================================
CREATE OR REPLACE FUNCTION public.get_supplier_financial_summary(_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _total_purchases numeric;
  _total_payments numeric;
  _order_count integer;
  _dso numeric;
BEGIN
  -- Total purchases from purchase orders
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO _total_purchases, _order_count
  FROM purchase_orders WHERE supplier_id = _supplier_id;

  -- Total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO _total_payments
  FROM supplier_payments WHERE supplier_id = _supplier_id;

  -- DSO: Average days between order date and payment date
  SELECT ROUND(AVG(
    GREATEST(0, EXTRACT(EPOCH FROM (
      sp.payment_date::timestamp - po.created_at::timestamp
    )) / 86400)
  ))
  INTO _dso
  FROM supplier_payments sp
  JOIN purchase_orders po ON po.supplier_id = sp.supplier_id
  WHERE sp.supplier_id = _supplier_id
  LIMIT 100;

  SELECT jsonb_build_object(
    'total_purchases', _total_purchases,
    'total_payments', _total_payments,
    'total_outstanding', ROUND((_total_purchases - _total_payments)::numeric, 2),
    'order_count', _order_count,
    'avg_order_value', CASE WHEN _order_count > 0 THEN ROUND((_total_purchases / _order_count)::numeric, 2) ELSE 0 END,
    'payment_ratio', CASE WHEN _total_purchases > 0 THEN ROUND((_total_payments / _total_purchases * 100)::numeric, 2) ELSE 0 END,
    'dso', _dso
  ) INTO _result;

  RETURN _result;
END;
$$;

-- =============================================
-- RPC 2: get_supplier_chart_data
-- =============================================
CREATE OR REPLACE FUNCTION public.get_supplier_chart_data(_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _monthly_data jsonb;
  _top_products jsonb;
BEGIN
  -- Monthly totals (purchase orders & payments)
  SELECT COALESCE(jsonb_agg(row_to_json(m) ORDER BY m.month), '[]'::jsonb)
  INTO _monthly_data
  FROM (
    SELECT
      TO_CHAR(d.month, 'YYYY-MM') AS month,
      COALESCE(po.total, 0) AS purchase_total,
      COALESCE(po.cnt, 0) AS purchase_count,
      COALESCE(pay.total, 0) AS payment_total,
      COALESCE(pay.cnt, 0) AS payment_count
    FROM (
      SELECT DISTINCT DATE_TRUNC('month', created_at) AS month
      FROM purchase_orders WHERE supplier_id = _supplier_id
      UNION
      SELECT DISTINCT DATE_TRUNC('month', payment_date::timestamp) AS month
      FROM supplier_payments WHERE supplier_id = _supplier_id
    ) d
    LEFT JOIN (
      SELECT DATE_TRUNC('month', created_at) AS month, SUM(total_amount) AS total, COUNT(*) AS cnt
      FROM purchase_orders WHERE supplier_id = _supplier_id
      GROUP BY 1
    ) po ON po.month = d.month
    LEFT JOIN (
      SELECT DATE_TRUNC('month', payment_date::timestamp) AS month, SUM(amount) AS total, COUNT(*) AS cnt
      FROM supplier_payments WHERE supplier_id = _supplier_id
      GROUP BY 1
    ) pay ON pay.month = d.month
    ORDER BY d.month DESC
    LIMIT 24
  ) m;

  -- Top products purchased from this supplier
  SELECT COALESCE(jsonb_agg(row_to_json(tp) ORDER BY tp.total_cost DESC), '[]'::jsonb)
  INTO _top_products
  FROM (
    SELECT
      p.name AS product_name,
      SUM(poi.quantity) AS total_quantity,
      SUM(poi.total_price) AS total_cost
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    JOIN products p ON p.id = poi.product_id
    WHERE po.supplier_id = _supplier_id
    GROUP BY p.id, p.name
    ORDER BY total_cost DESC
    LIMIT 10
  ) tp;

  RETURN jsonb_build_object(
    'monthly_data', _monthly_data,
    'top_products', _top_products
  );
END;
$$;

-- =============================================
-- RPC 3: get_supplier_statement
-- =============================================
CREATE OR REPLACE FUNCTION public.get_supplier_statement(_supplier_id uuid, _date_from date DEFAULT NULL, _date_to date DEFAULT NULL)
RETURNS TABLE(entry_date timestamptz, entry_type text, reference text, debit numeric, credit numeric, running_balance numeric, status text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH all_entries AS (
    -- Purchase Orders (debit - we owe the supplier)
    SELECT
      po.created_at AS entry_date,
      'أمر شراء'::text AS entry_type,
      po.order_number AS reference,
      po.total_amount AS debit,
      0::numeric AS credit,
      CASE po.status
        WHEN 'completed' THEN 'مكتمل'
        WHEN 'approved' THEN 'معتمد'
        WHEN 'pending' THEN 'معلق'
        ELSE po.status
      END AS status
    FROM purchase_orders po
    WHERE po.supplier_id = _supplier_id

    UNION ALL

    -- Supplier Payments (credit - we paid the supplier)
    SELECT
      sp.payment_date::timestamptz AS entry_date,
      'دفعة'::text AS entry_type,
      sp.payment_number AS reference,
      0::numeric AS debit,
      sp.amount AS credit,
      'مسدد'::text AS status
    FROM supplier_payments sp
    WHERE sp.supplier_id = _supplier_id
  ),
  filtered AS (
    SELECT * FROM all_entries ae
    WHERE (_date_from IS NULL OR ae.entry_date >= _date_from::timestamptz)
      AND (_date_to IS NULL OR ae.entry_date <= (_date_to::timestamptz + interval '1 day' - interval '1 second'))
    ORDER BY ae.entry_date ASC, ae.entry_type ASC
  )
  SELECT
    f.entry_date,
    f.entry_type,
    f.reference,
    f.debit,
    f.credit,
    SUM(f.debit - f.credit) OVER (ORDER BY f.entry_date ASC, f.entry_type ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance,
    f.status
  FROM filtered f;
END;
$$;
