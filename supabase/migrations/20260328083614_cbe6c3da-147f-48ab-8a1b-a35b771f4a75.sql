
-- 1. Atomic switch_tenant function
CREATE OR REPLACE FUNCTION public.switch_user_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify user belongs to target tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.user_tenants 
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  ) THEN
    RETURN false;
  END IF;

  -- Atomic: reset all defaults and set new one in single statement
  UPDATE public.user_tenants
  SET is_default = (tenant_id = _tenant_id)
  WHERE user_id = _user_id;

  RETURN true;
END;
$$;

-- 2. Payment number sequence
CREATE SEQUENCE IF NOT EXISTS payment_seq START 1;

-- 3. Generate payment number trigger
CREATE OR REPLACE FUNCTION public.generate_payment_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' OR NEW.payment_number LIKE 'PAY-%' THEN
    NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('payment_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for payment number auto-generation
DROP TRIGGER IF EXISTS trg_generate_payment_number ON payments;
CREATE TRIGGER trg_generate_payment_number
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_payment_number();

-- 4. Reverse payment balances on delete
CREATE OR REPLACE FUNCTION public.reverse_payment_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reverse customer balance
  UPDATE customers 
  SET current_balance = current_balance - OLD.amount
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
$$;

DROP TRIGGER IF EXISTS trg_reverse_payment ON payments;
CREATE TRIGGER trg_reverse_payment
  BEFORE DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION reverse_payment_on_delete();

-- 5. Reverse invoice cached stats on delete
CREATE OR REPLACE FUNCTION public.reverse_invoice_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE customers SET
    total_purchases_cached = GREATEST(0, COALESCE(total_purchases_cached, 0) - OLD.total_amount),
    invoice_count_cached = GREATEST(0, COALESCE(invoice_count_cached, 0) - 1)
  WHERE id = OLD.customer_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_invoice ON invoices;
CREATE TRIGGER trg_reverse_invoice
  BEFORE DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION reverse_invoice_on_delete();
