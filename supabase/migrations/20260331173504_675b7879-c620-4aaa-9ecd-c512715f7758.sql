
-- 1. Materialized View for customer stats
CREATE MATERIALIZED VIEW IF NOT EXISTS public.customer_stats_mv AS
SELECT
  tenant_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE customer_type = 'individual') AS individuals,
  COUNT(*) FILTER (WHERE customer_type = 'company') AS companies,
  COUNT(*) FILTER (WHERE customer_type = 'farm') AS farms,
  COUNT(*) FILTER (WHERE vip_level != 'regular') AS vip,
  COUNT(*) FILTER (WHERE is_active = true) AS active,
  COUNT(*) FILTER (WHERE is_active = false) AS inactive,
  COALESCE(SUM(current_balance), 0) AS total_balance,
  COUNT(*) FILTER (WHERE current_balance > 0) AS debtors
FROM customers
GROUP BY tenant_id;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_stats_mv_tenant ON public.customer_stats_mv (tenant_id);

-- 2. Replace get_customer_stats to read from MV
CREATE OR REPLACE FUNCTION public.get_customer_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(total, 0),
    'individuals', COALESCE(individuals, 0),
    'companies', COALESCE(companies, 0),
    'farms', COALESCE(farms, 0),
    'vip', COALESCE(vip, 0),
    'active', COALESCE(active, 0),
    'inactive', COALESCE(inactive, 0),
    'total_balance', COALESCE(total_balance, 0),
    'debtors', COALESCE(debtors, 0)
  )
  FROM customer_stats_mv
  WHERE tenant_id = get_current_tenant()
$$;

-- 3. Function to refresh the MV (called by cron)
CREATE OR REPLACE FUNCTION public.refresh_customer_stats_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.customer_stats_mv;
END;
$$;

-- 4. Health Score RPC
CREATE OR REPLACE FUNCTION public.get_customer_health_score(_customer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _credit_limit numeric;
  _current_balance numeric;
  _payment_terms_days integer;
  _total_invoiced numeric;
  _total_paid numeric;
  _dso numeric;
  _overdue_90_amount numeric;
  _total_outstanding numeric;
  _credit_score numeric := 100;
  _dso_score numeric := 100;
  _aging_score numeric := 100;
  _final_score numeric;
  _grade text;
  _recommendations text[] := '{}';
BEGIN
  -- Get customer basics
  SELECT credit_limit, current_balance, COALESCE(payment_terms_days, 30)
  INTO _credit_limit, _current_balance, _payment_terms_days
  FROM customers WHERE id = _customer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Customer not found');
  END IF;

  -- Total invoiced & paid
  SELECT COALESCE(SUM(total_amount), 0) INTO _total_invoiced FROM invoices WHERE customer_id = _customer_id;
  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM payments WHERE customer_id = _customer_id;
  _total_outstanding := _total_invoiced - _total_paid;

  -- Credit usage score (30% weight)
  IF _credit_limit > 0 THEN
    IF _current_balance >= _credit_limit THEN
      _credit_score := 0;
      _recommendations := array_append(_recommendations, 'تجاوز حد الائتمان — يُنصح بوقف البيع الآجل');
    ELSIF _current_balance >= _credit_limit * 0.8 THEN
      _credit_score := 30;
      _recommendations := array_append(_recommendations, 'اقتراب من حد الائتمان (80%+)');
    ELSIF _current_balance >= _credit_limit * 0.5 THEN
      _credit_score := 70;
    END IF;
  ELSE
    -- No credit limit set
    IF _current_balance > 0 THEN
      _credit_score := 60;
      _recommendations := array_append(_recommendations, 'لا يوجد حد ائتمان — يُنصح بتحديد سقف');
    END IF;
  END IF;

  -- DSO score (30% weight)
  SELECT ROUND(AVG(
    GREATEST(0, EXTRACT(EPOCH FROM (
      (SELECT MAX(p.payment_date::timestamp) FROM payments p WHERE p.invoice_id = i.id)
      - COALESCE(i.due_date::timestamp, i.created_at::timestamp)
    )) / 86400)
  ))
  INTO _dso
  FROM invoices i
  WHERE i.customer_id = _customer_id
    AND i.payment_status = 'paid'
    AND EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = i.id);

  IF _dso IS NOT NULL THEN
    IF _dso > _payment_terms_days * 2 THEN
      _dso_score := 10;
      _recommendations := array_append(_recommendations, 'متوسط السداد ضعف المدة المتفق عليها');
    ELSIF _dso > _payment_terms_days THEN
      _dso_score := 40;
      _recommendations := array_append(_recommendations, 'تأخر في السداد عن المدة المتفق عليها');
    ELSIF _dso > _payment_terms_days * 0.5 THEN
      _dso_score := 75;
    END IF;
  END IF;

  -- Aging score (40% weight) - ratio of 90+ day debt
  SELECT COALESCE(SUM(i.total_amount - COALESCE(i.paid_amount, 0)), 0)
  INTO _overdue_90_amount
  FROM invoices i
  WHERE i.customer_id = _customer_id
    AND i.payment_status IN ('pending', 'partial')
    AND EXTRACT(DAY FROM (now() - COALESCE(i.due_date::timestamp, i.created_at::timestamp))) > 90;

  IF _total_outstanding > 0 AND _overdue_90_amount > 0 THEN
    IF _overdue_90_amount / _total_outstanding > 0.5 THEN
      _aging_score := 10;
      _recommendations := array_append(_recommendations, 'أكثر من 50% من الديون متأخرة +90 يوم — يُنصح بالتحويل لنقدي فقط');
    ELSIF _overdue_90_amount / _total_outstanding > 0.25 THEN
      _aging_score := 40;
      _recommendations := array_append(_recommendations, 'ديون متأخرة +90 يوم تتجاوز 25%');
    ELSE
      _aging_score := 70;
    END IF;
  END IF;

  -- Weighted final score
  _final_score := ROUND((_credit_score * 0.3) + (_dso_score * 0.3) + (_aging_score * 0.4));

  -- Grade
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
    'dso', _dso,
    'total_outstanding', _total_outstanding,
    'overdue_90', _overdue_90_amount,
    'recommendations', to_jsonb(_recommendations)
  );
END;
$$;

-- 5. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
