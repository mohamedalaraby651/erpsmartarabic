
-- 1. Atomic merge customers function
CREATE OR REPLACE FUNCTION public.merge_customers_atomic(p_primary_id UUID, p_duplicate_id UUID)
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
BEGIN
  IF p_primary_id = p_duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a customer with itself';
  END IF;

  SELECT id, name INTO _primary FROM customers WHERE id = p_primary_id;
  SELECT id, name INTO _duplicate FROM customers WHERE id = p_duplicate_id;

  IF _primary.id IS NULL OR _duplicate.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Transfer all related records
  UPDATE invoices SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE payments SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE sales_orders SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE quotations SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_addresses SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_communications SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_reminders SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE credit_notes SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE attachments SET entity_id = p_primary_id::text WHERE entity_type = 'customer' AND entity_id = p_duplicate_id::text;

  -- Recalculate balance
  SELECT COALESCE(SUM(total_amount), 0) INTO _total_invoiced FROM invoices WHERE customer_id = p_primary_id;
  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM payments WHERE customer_id = p_primary_id;

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
    'deleted_id', p_duplicate_id
  );
END;
$$;

-- 2. Batch validate delete function
CREATE OR REPLACE FUNCTION public.batch_validate_delete(p_ids UUID[])
RETURNS TABLE(customer_id UUID, customer_name TEXT, open_invoice_count BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, COUNT(i.id)
  FROM unnest(p_ids) AS cid(id)
  JOIN customers c ON c.id = cid.id
  JOIN invoices i ON i.customer_id = c.id AND i.payment_status IN ('pending', 'partial')
  GROUP BY c.id, c.name
  HAVING COUNT(i.id) > 0;
$$;

-- 3. Add last_communication_at cached column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_communication_at TIMESTAMPTZ;

-- 4. Create trigger for last_communication_at
CREATE OR REPLACE FUNCTION public.update_customer_last_communication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE customers SET last_communication_at = GREATEST(
    COALESCE(customers.last_communication_at, '1970-01-01'::timestamptz),
    NEW.communication_date::timestamptz
  ) WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_communication ON customer_communications;
CREATE TRIGGER trg_update_last_communication
AFTER INSERT ON customer_communications
FOR EACH ROW
EXECUTE FUNCTION update_customer_last_communication();

-- 5. Add performance index
CREATE INDEX IF NOT EXISTS idx_invoices_customer_payment ON invoices(customer_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer ON credit_notes(customer_id);
