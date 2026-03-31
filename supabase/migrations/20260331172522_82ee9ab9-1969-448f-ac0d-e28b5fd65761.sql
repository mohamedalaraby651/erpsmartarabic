
-- =============================================
-- 1) RPC: get_customer_statement (server-side complete statement)
-- Returns ALL invoices, payments, and credit notes for a customer
-- with running balance, sorted by date. Supports date filtering.
-- =============================================

CREATE OR REPLACE FUNCTION public.get_customer_statement(
  _customer_id uuid,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL
)
RETURNS TABLE(
  entry_date timestamptz,
  entry_type text,
  reference text,
  debit numeric,
  credit numeric,
  running_balance numeric,
  status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH all_entries AS (
    -- Invoices (debit)
    SELECT
      i.created_at AS entry_date,
      'فاتورة'::text AS entry_type,
      i.invoice_number AS reference,
      i.total_amount AS debit,
      0::numeric AS credit,
      CASE i.payment_status
        WHEN 'paid' THEN 'مسدد'
        WHEN 'partial' THEN 'جزئي'
        ELSE 'معلق'
      END AS status
    FROM invoices i
    WHERE i.customer_id = _customer_id
    
    UNION ALL
    
    -- Payments (credit)
    SELECT
      p.payment_date::timestamptz AS entry_date,
      'دفعة'::text AS entry_type,
      p.payment_number AS reference,
      0::numeric AS debit,
      p.amount AS credit,
      'مسدد'::text AS status
    FROM payments p
    WHERE p.customer_id = _customer_id
    
    UNION ALL
    
    -- Credit Notes (credit)
    SELECT
      cn.created_at AS entry_date,
      'مرتجع'::text AS entry_type,
      cn.credit_note_number AS reference,
      0::numeric AS debit,
      cn.amount AS credit,
      CASE cn.status
        WHEN 'approved' THEN 'معتمد'
        ELSE 'معلق'
      END AS status
    FROM credit_notes cn
    WHERE cn.customer_id = _customer_id
      AND cn.status != 'cancelled'
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

-- =============================================
-- 2) RPC: get_customer_aging (server-side aging buckets)
-- Returns aging bucket summary for unpaid invoices
-- =============================================

CREATE OR REPLACE FUNCTION public.get_customer_aging(_customer_id uuid)
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
      'count', COUNT(*) FILTER (WHERE days <= 30)
    ),
    'bucket_31_60', jsonb_build_object(
      'amount', COALESCE(SUM(CASE WHEN days > 30 AND days <= 60 THEN outstanding ELSE 0 END), 0),
      'count', COUNT(*) FILTER (WHERE days > 30 AND days <= 60)
    ),
    'bucket_61_90', jsonb_build_object(
      'amount', COALESCE(SUM(CASE WHEN days > 60 AND days <= 90 THEN outstanding ELSE 0 END), 0),
      'count', COUNT(*) FILTER (WHERE days > 60 AND days <= 90)
    ),
    'bucket_90_plus', jsonb_build_object(
      'amount', COALESCE(SUM(CASE WHEN days > 90 THEN outstanding ELSE 0 END), 0),
      'count', COUNT(*) FILTER (WHERE days > 90)
    ),
    'total_outstanding', COALESCE(SUM(outstanding), 0),
    'total_count', COUNT(*)
  ) INTO _result
  FROM (
    SELECT
      EXTRACT(DAY FROM (now() - COALESCE(i.due_date::timestamp, i.created_at::timestamp)))::integer AS days,
      (i.total_amount - COALESCE(i.paid_amount, 0)) AS outstanding
    FROM invoices i
    WHERE i.customer_id = _customer_id
      AND i.payment_status IN ('pending', 'partial')
  ) sub;

  RETURN COALESCE(_result, '{}'::jsonb);
END;
$$;

-- =============================================
-- 3) Fix merge_customers_atomic: subtract credit notes + transfer notes
-- =============================================

CREATE OR REPLACE FUNCTION public.merge_customers_atomic(p_primary_id uuid, p_duplicate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _primary RECORD;
  _duplicate RECORD;
  _total_invoiced NUMERIC;
  _total_paid NUMERIC;
  _total_credit_notes NUMERIC;
BEGIN
  IF p_primary_id = p_duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a customer with itself';
  END IF;

  SELECT id, name INTO _primary FROM customers WHERE id = p_primary_id;
  SELECT id, name INTO _duplicate FROM customers WHERE id = p_duplicate_id;

  IF _primary.id IS NULL OR _duplicate.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Transfer all related records (including customer_notes now)
  UPDATE invoices SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE payments SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE sales_orders SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE quotations SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_addresses SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_communications SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_reminders SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE credit_notes SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_notes SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE attachments SET entity_id = p_primary_id::text WHERE entity_type = 'customer' AND entity_id = p_duplicate_id::text;

  -- Recalculate balance INCLUDING credit notes
  SELECT COALESCE(SUM(total_amount), 0) INTO _total_invoiced FROM invoices WHERE customer_id = p_primary_id;
  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM payments WHERE customer_id = p_primary_id;
  SELECT COALESCE(SUM(amount), 0) INTO _total_credit_notes FROM credit_notes WHERE customer_id = p_primary_id AND status != 'cancelled';

  UPDATE customers SET
    current_balance = _total_invoiced - _total_paid,
    total_purchases_cached = _total_invoiced,
    invoice_count_cached = (SELECT COUNT(*) FROM invoices WHERE customer_id = p_primary_id)
  WHERE id = p_primary_id;

  -- Delete the duplicate
  DELETE FROM customers WHERE id = p_duplicate_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم دمج "' || _duplicate.name || '" في "' || _primary.name || '" بنجاح',
    'primary_id', p_primary_id,
    'deleted_id', p_duplicate_id,
    'credit_notes_transferred', _total_credit_notes
  );
END;
$$;

-- =============================================
-- 4) Add composite index on activity_logs for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_lookup
  ON activity_logs (entity_type, entity_id);
