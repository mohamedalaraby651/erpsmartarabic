
-- 1. Create get_supplier_aging RPC
CREATE OR REPLACE FUNCTION public.get_supplier_aging(_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'bucket_0_30', jsonb_build_object(
      'amount', COALESCE(SUM(CASE WHEN days <= 30 THEN outstanding ELSE 0 END), 0),
      'count', COUNT(*) FILTER (WHERE days <= 30 AND outstanding > 0)
    ),
    'bucket_31_60', jsonb_build_object(
      'amount', COALESCE(SUM(CASE WHEN days > 30 AND days <= 60 THEN outstanding ELSE 0 END), 0),
      'count', COUNT(*) FILTER (WHERE days > 30 AND days <= 60 AND outstanding > 0)
    ),
    'bucket_61_90', jsonb_build_object(
      'amount', COALESCE(SUM(CASE WHEN days > 60 AND days <= 90 THEN outstanding ELSE 0 END), 0),
      'count', COUNT(*) FILTER (WHERE days > 60 AND days <= 90 AND outstanding > 0)
    ),
    'bucket_90_plus', jsonb_build_object(
      'amount', COALESCE(SUM(CASE WHEN days > 90 THEN outstanding ELSE 0 END), 0),
      'count', COUNT(*) FILTER (WHERE days > 90 AND outstanding > 0)
    ),
    'total_outstanding', COALESCE(SUM(outstanding), 0),
    'total_count', COUNT(*) FILTER (WHERE outstanding > 0)
  ) INTO _result
  FROM (
    SELECT
      EXTRACT(DAY FROM (now() - po.created_at::timestamp))::integer AS days,
      GREATEST(0, po.total_amount - COALESCE((
        SELECT SUM(sp.amount) FROM supplier_payments sp 
        WHERE sp.supplier_id = po.supplier_id
      ) * (po.total_amount / NULLIF((
        SELECT SUM(po2.total_amount) FROM purchase_orders po2 WHERE po2.supplier_id = po.supplier_id
      ), 0)), 0)) AS outstanding
    FROM purchase_orders po
    WHERE po.supplier_id = _supplier_id
      AND po.status NOT IN ('cancelled')
  ) sub;

  RETURN COALESCE(_result, '{}'::jsonb);
END;
$$;

-- 2. Update get_supplier_financial_summary to include pending_order_count and last_order_date
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
  _pending_order_count integer;
  _last_order_date timestamptz;
  _dso numeric;
BEGIN
  -- Total purchases from purchase orders
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO _total_purchases, _order_count
  FROM purchase_orders WHERE supplier_id = _supplier_id;

  -- Pending order count
  SELECT COUNT(*)
  INTO _pending_order_count
  FROM purchase_orders WHERE supplier_id = _supplier_id AND status IN ('pending', 'draft');

  -- Last order date
  SELECT MAX(created_at)
  INTO _last_order_date
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
    'pending_order_count', _pending_order_count,
    'last_order_date', _last_order_date,
    'avg_order_value', CASE WHEN _order_count > 0 THEN ROUND((_total_purchases / _order_count)::numeric, 2) ELSE 0 END,
    'payment_ratio', CASE WHEN _total_purchases > 0 THEN ROUND((_total_payments / _total_purchases * 100)::numeric, 2) ELSE 0 END,
    'dso', _dso
  ) INTO _result;

  RETURN _result;
END;
$$;
