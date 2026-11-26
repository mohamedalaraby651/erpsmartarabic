CREATE OR REPLACE FUNCTION public.emit_event(_event_type text, _aggregate_type text, _aggregate_id uuid, _payload jsonb, _tenant_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _event_id UUID;
BEGIN
  INSERT INTO domain_events (tenant_id, event_type, aggregate_type, aggregate_id, payload, emitted_by)
  VALUES (COALESCE(_tenant_id, get_current_tenant()), _event_type, _aggregate_type, _aggregate_id, _payload, auth.uid())
  RETURNING id INTO _event_id;
  RETURN _event_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.emit_event(text,text,uuid,jsonb,uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.emit_payment_received() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM emit_event('payment.received', 'payment', NEW.id,
    jsonb_build_object('payment_number', NEW.payment_number, 'customer_id', NEW.customer_id, 'amount', NEW.amount, 'invoice_id', NEW.invoice_id), NEW.tenant_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.emit_invoice_approved() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status AND NEW.approval_status = 'approved' THEN
    PERFORM emit_event('invoice.approved', 'invoice', NEW.id,
      jsonb_build_object('invoice_number', NEW.invoice_number, 'customer_id', NEW.customer_id, 'total_amount', NEW.total_amount), NEW.tenant_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.emit_expense_approved() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    PERFORM emit_event('expense.approved', 'expense', NEW.id,
      jsonb_build_object('expense_number', NEW.expense_number, 'amount', NEW.amount, 'category_id', NEW.category_id), NEW.tenant_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.emit_customer_credit_exceeded() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.credit_limit IS NOT NULL AND NEW.credit_limit > 0 AND NEW.current_balance > NEW.credit_limit
     AND (OLD.current_balance IS NULL OR OLD.current_balance <= NEW.credit_limit) THEN
    PERFORM emit_event('customer.credit_exceeded', 'customer', NEW.id,
      jsonb_build_object('customer_name', NEW.name, 'credit_limit', NEW.credit_limit, 'current_balance', NEW.current_balance), NEW.tenant_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.emit_stock_depleted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _min_stock numeric; _product_name text;
BEGIN
  SELECT min_stock, name INTO _min_stock, _product_name FROM products WHERE id = NEW.product_id;
  IF _min_stock IS NOT NULL AND NEW.quantity < _min_stock AND (OLD.quantity IS NULL OR OLD.quantity >= _min_stock) THEN
    PERFORM emit_event('stock.depleted', 'product', NEW.product_id,
      jsonb_build_object('product_name', _product_name, 'current_quantity', NEW.quantity, 'min_stock', _min_stock), NEW.tenant_id);
  END IF;
  RETURN NEW;
END; $$;