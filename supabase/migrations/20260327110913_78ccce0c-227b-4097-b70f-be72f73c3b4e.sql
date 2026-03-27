-- 1. Database Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_active ON public.customers(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_type_vip ON public.customers(customer_type, vip_level);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON public.invoices(customer_id, payment_status);

-- 2. Cached stats columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS total_purchases_cached numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_count_cached integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- 3. Trigger function to update cached stats on invoice changes
CREATE OR REPLACE FUNCTION public.update_customer_cached_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _customer_id UUID;
BEGIN
  _customer_id := COALESCE(NEW.customer_id, OLD.customer_id);

  UPDATE customers SET
    total_purchases_cached = COALESCE((
      SELECT SUM(total_amount) FROM invoices WHERE customer_id = _customer_id
    ), 0),
    invoice_count_cached = COALESCE((
      SELECT COUNT(*) FROM invoices WHERE customer_id = _customer_id
    ), 0),
    last_activity_at = COALESCE((
      SELECT MAX(created_at) FROM invoices WHERE customer_id = _customer_id
    ), customers.last_activity_at)
  WHERE id = _customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Attach trigger to invoices table
CREATE OR REPLACE TRIGGER trg_update_customer_stats_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_customer_cached_stats();

-- 5. Trigger function to update last_activity_at on payment changes
CREATE OR REPLACE FUNCTION public.update_customer_activity_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _customer_id UUID;
BEGIN
  _customer_id := COALESCE(NEW.customer_id, OLD.customer_id);

  UPDATE customers SET
    last_activity_at = GREATEST(
      customers.last_activity_at,
      COALESCE(NEW.created_at, NOW())
    )
  WHERE id = _customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trg_update_customer_activity_on_payment
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_customer_activity_on_payment();

-- 6. Bulk operation audit logging function
CREATE OR REPLACE FUNCTION public.log_bulk_operation(
  _action text,
  _entity_type text,
  _entity_ids uuid[],
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _tenant_id UUID := get_current_tenant();
  _id UUID;
BEGIN
  FOREACH _id IN ARRAY _entity_ids
  LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, new_values, tenant_id)
    VALUES (_user_id, _action, _entity_type, _id::text, 'bulk_operation', _details, _tenant_id);
  END LOOP;
END;
$$;