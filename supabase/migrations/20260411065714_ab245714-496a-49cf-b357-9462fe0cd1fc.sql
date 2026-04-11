
-- 1. Add is_pinned and user_id to supplier_notes
ALTER TABLE public.supplier_notes 
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update existing rows to set user_id from created_by
UPDATE public.supplier_notes SET user_id = created_by WHERE created_by IS NOT NULL AND user_id IS NULL;

-- 2. Create get_supplier_health_score RPC
CREATE OR REPLACE FUNCTION public.get_supplier_health_score(_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _credit_limit numeric;
  _current_balance numeric;
  _rating integer;
  _total_purchases numeric;
  _total_payments numeric;
  _total_outstanding numeric;
  _dso numeric;
  _overdue_90_amount numeric;
  _credit_score numeric := 100;
  _dso_score numeric := 100;
  _aging_score numeric := 100;
  _rating_score numeric := 100;
  _final_score numeric;
  _grade text;
  _recommendations text[] := '{}';
BEGIN
  -- Get supplier basics
  SELECT s.credit_limit, s.current_balance, COALESCE(s.rating, 0)
  INTO _credit_limit, _current_balance, _rating
  FROM suppliers s WHERE s.id = _supplier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Supplier not found');
  END IF;

  -- Totals
  SELECT COALESCE(SUM(total_amount), 0) INTO _total_purchases FROM purchase_orders WHERE supplier_id = _supplier_id AND status != 'cancelled';
  SELECT COALESCE(SUM(amount), 0) INTO _total_payments FROM supplier_payments WHERE supplier_id = _supplier_id;
  _total_outstanding := GREATEST(0, _total_purchases - _total_payments);

  -- Credit usage score (30%)
  IF _credit_limit > 0 THEN
    IF _current_balance >= _credit_limit THEN
      _credit_score := 0;
      _recommendations := array_append(_recommendations, 'تجاوز حد الائتمان — يُنصح بالسداد قبل طلبات جديدة');
    ELSIF _current_balance >= _credit_limit * 0.8 THEN
      _credit_score := 30;
      _recommendations := array_append(_recommendations, 'اقتراب من حد الائتمان (80%+)');
    ELSIF _current_balance >= _credit_limit * 0.5 THEN
      _credit_score := 70;
    END IF;
  ELSE
    IF _current_balance > 0 THEN
      _credit_score := 60;
      _recommendations := array_append(_recommendations, 'لا يوجد حد ائتمان محدد — يُنصح بتحديد سقف');
    END IF;
  END IF;

  -- DSO score (30%)
  SELECT ROUND(AVG(
    GREATEST(0, EXTRACT(EPOCH FROM (sp.payment_date::timestamp - po.created_at::timestamp)) / 86400)
  ))
  INTO _dso
  FROM supplier_payments sp
  JOIN purchase_orders po ON po.supplier_id = sp.supplier_id
  WHERE sp.supplier_id = _supplier_id
  LIMIT 100;

  IF _dso IS NOT NULL THEN
    IF _dso > 90 THEN
      _dso_score := 10;
      _recommendations := array_append(_recommendations, 'متوسط أيام السداد مرتفع جداً (+90 يوم)');
    ELSIF _dso > 60 THEN
      _dso_score := 40;
      _recommendations := array_append(_recommendations, 'متوسط أيام السداد مرتفع (+60 يوم)');
    ELSIF _dso > 30 THEN
      _dso_score := 75;
    END IF;
  END IF;

  -- Aging score (20%)
  SELECT COALESCE(SUM(
    GREATEST(0, po.total_amount - COALESCE(
      (SELECT SUM(sp2.amount) FROM supplier_payments sp2 WHERE sp2.supplier_id = po.supplier_id)
      * (po.total_amount / NULLIF((SELECT SUM(po2.total_amount) FROM purchase_orders po2 WHERE po2.supplier_id = po.supplier_id AND po2.status != 'cancelled'), 0))
    , 0))
  ), 0)
  INTO _overdue_90_amount
  FROM purchase_orders po
  WHERE po.supplier_id = _supplier_id
    AND po.status != 'cancelled'
    AND EXTRACT(DAY FROM (now() - po.created_at::timestamp)) > 90;

  IF _total_outstanding > 0 AND _overdue_90_amount > 0 THEN
    IF _overdue_90_amount / _total_outstanding > 0.5 THEN
      _aging_score := 10;
      _recommendations := array_append(_recommendations, 'أكثر من 50% من المستحقات متأخرة +90 يوم');
    ELSIF _overdue_90_amount / _total_outstanding > 0.25 THEN
      _aging_score := 40;
      _recommendations := array_append(_recommendations, 'مستحقات متأخرة +90 يوم تتجاوز 25%');
    ELSE
      _aging_score := 70;
    END IF;
  END IF;

  -- Rating score (20%) — unique to suppliers
  IF _rating >= 4 THEN
    _rating_score := 100;
  ELSIF _rating = 3 THEN
    _rating_score := 70;
  ELSIF _rating = 2 THEN
    _rating_score := 40;
    _recommendations := array_append(_recommendations, 'تقييم المورد منخفض — يُنصح بمراجعة الأداء');
  ELSIF _rating = 1 THEN
    _rating_score := 15;
    _recommendations := array_append(_recommendations, 'تقييم المورد سيء — يُنصح بالبحث عن بدائل');
  ELSE
    _rating_score := 50; -- No rating set
  END IF;

  -- Weighted final score: credit 30%, dso 30%, aging 20%, rating 20%
  _final_score := ROUND((_credit_score * 0.3) + (_dso_score * 0.3) + (_aging_score * 0.2) + (_rating_score * 0.2));

  _grade := CASE
    WHEN _final_score >= 80 THEN 'excellent'
    WHEN _final_score >= 60 THEN 'good'
    WHEN _final_score >= 40 THEN 'warning'
    ELSE 'critical'
  END;

  RETURN jsonb_build_object(
    'score', _final_score,
    'grade', _grade,
    'credit_score', _credit_score,
    'dso_score', _dso_score,
    'aging_score', _aging_score,
    'rating_score', _rating_score,
    'dso', _dso,
    'rating', _rating,
    'total_outstanding', _total_outstanding,
    'overdue_90', _overdue_90_amount,
    'recommendations', to_jsonb(_recommendations)
  );
END;
$$;
