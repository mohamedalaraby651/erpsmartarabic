
CREATE OR REPLACE FUNCTION public.get_customer_financial_summary(_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
  _total_purchases numeric;
  _total_payments numeric;
  _total_credit_notes numeric;
  _invoice_count integer;
  _dso numeric;
BEGIN
  -- Total purchases
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO _total_purchases, _invoice_count
  FROM invoices WHERE customer_id = _customer_id;

  -- Total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO _total_payments
  FROM payments WHERE customer_id = _customer_id;

  -- Total credit notes
  SELECT COALESCE(SUM(amount), 0)
  INTO _total_credit_notes
  FROM credit_notes WHERE customer_id = _customer_id AND status != 'cancelled';

  -- DSO: Average days between due_date and last payment date for paid invoices
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

  SELECT jsonb_build_object(
    'total_purchases', _total_purchases,
    'total_payments', _total_payments,
    'total_credit_notes', _total_credit_notes,
    'total_outstanding', ROUND((_total_purchases - _total_payments)::numeric, 2),
    'invoice_count', _invoice_count,
    'avg_invoice_value', CASE WHEN _invoice_count > 0 THEN ROUND((_total_purchases / _invoice_count)::numeric, 2) ELSE 0 END,
    'payment_ratio', CASE WHEN _total_purchases > 0 THEN ROUND((_total_payments / _total_purchases * 100)::numeric, 2) ELSE 0 END,
    'dso', _dso,
    'clv', _total_purchases - _total_credit_notes
  ) INTO _result;

  RETURN _result;
END;
$function$;
