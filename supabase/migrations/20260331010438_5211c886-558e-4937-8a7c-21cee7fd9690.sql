
-- 1. Fix reverse_payment_on_delete: change - to +
CREATE OR REPLACE FUNCTION public.reverse_payment_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Reverse customer balance (ADD back, not subtract)
  UPDATE customers 
  SET current_balance = current_balance + OLD.amount
  WHERE id = OLD.customer_id;

  -- Reverse invoice paid_amount if linked
  IF OLD.invoice_id IS NOT NULL THEN
    UPDATE invoices
    SET 
      paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - OLD.amount),
      payment_status = CASE
        WHEN GREATEST(0, COALESCE(paid_amount, 0) - OLD.amount) <= 0 THEN 'pending'
        WHEN GREATEST(0, COALESCE(paid_amount, 0) - OLD.amount) < total_amount THEN 'partial'
        ELSE 'paid'
      END
    WHERE id = OLD.invoice_id;
  END IF;

  RETURN OLD;
END;
$function$;

-- 2. Create trigger to update current_balance on invoice changes
CREATE OR REPLACE FUNCTION public.update_customer_balance_on_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers 
    SET current_balance = COALESCE(current_balance, 0) + NEW.total_amount
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
    UPDATE customers 
    SET current_balance = COALESCE(current_balance, 0) + (NEW.total_amount - OLD.total_amount)
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers 
    SET current_balance = COALESCE(current_balance, 0) - OLD.total_amount
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the trigger on invoices table
DROP TRIGGER IF EXISTS trg_update_customer_balance_on_invoice ON invoices;
CREATE TRIGGER trg_update_customer_balance_on_invoice
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_customer_balance_on_invoice();

-- 3. Reconcile all existing customer balances (one-time fix)
UPDATE customers SET current_balance = (
  COALESCE((SELECT SUM(total_amount) FROM invoices WHERE customer_id = customers.id), 0)
  - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = customers.id), 0)
);
