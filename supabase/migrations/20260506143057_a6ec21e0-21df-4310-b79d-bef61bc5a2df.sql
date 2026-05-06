-- 1) Add invoice_item_id link + original price snapshot
ALTER TABLE public.credit_note_items
  ADD COLUMN IF NOT EXISTS invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price_original numeric;

CREATE INDEX IF NOT EXISTS idx_credit_note_items_invoice_item_id
  ON public.credit_note_items(invoice_item_id);

-- 2) Helper: returnable quantity for an invoice item
CREATE OR REPLACE FUNCTION public.get_invoice_item_returnable(_invoice_item_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    COALESCE((SELECT quantity FROM public.invoice_items WHERE id = _invoice_item_id), 0)
    - COALESCE((
        SELECT SUM(cni.quantity)
        FROM public.credit_note_items cni
        JOIN public.credit_notes cn ON cn.id = cni.credit_note_id
        WHERE cni.invoice_item_id = _invoice_item_id
          AND cn.status = 'confirmed'
      ), 0)
  )::numeric
$$;

-- 3) Validation trigger
CREATE OR REPLACE FUNCTION public.validate_credit_note_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cn_invoice uuid;
  v_item_invoice uuid;
  v_returnable numeric;
  v_existing numeric;
BEGIN
  IF NEW.invoice_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT invoice_id INTO v_cn_invoice
    FROM public.credit_notes WHERE id = NEW.credit_note_id;
  SELECT invoice_id INTO v_item_invoice
    FROM public.invoice_items WHERE id = NEW.invoice_item_id;

  IF v_cn_invoice IS NULL OR v_item_invoice IS NULL OR v_cn_invoice <> v_item_invoice THEN
    RAISE EXCEPTION 'invoice_item_id does not belong to the credit note''s invoice';
  END IF;

  v_returnable := public.get_invoice_item_returnable(NEW.invoice_item_id);

  -- For UPDATE, exclude the previous quantity of THIS row from the "already returned" count
  IF TG_OP = 'UPDATE' AND OLD.invoice_item_id = NEW.invoice_item_id THEN
    v_returnable := v_returnable + OLD.quantity;
  END IF;

  IF NEW.quantity > v_returnable THEN
    RAISE EXCEPTION
      'Quantity % exceeds returnable amount % for invoice item %',
      NEW.quantity, v_returnable, NEW.invoice_item_id;
  END IF;

  -- Snapshot original unit price
  IF NEW.unit_price_original IS NULL THEN
    SELECT unit_price INTO NEW.unit_price_original
      FROM public.invoice_items WHERE id = NEW.invoice_item_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_credit_note_item ON public.credit_note_items;
CREATE TRIGGER trg_validate_credit_note_item
  BEFORE INSERT OR UPDATE ON public.credit_note_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_credit_note_item();

-- 4) Recompute credit_notes.amount from items (when items exist) before confirmation
CREATE OR REPLACE FUNCTION public.confirm_credit_note(p_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_user uuid;
  v_role text;
  v_cn record;
  v_items_total numeric;
  v_journal_result jsonb;
  v_stock_result jsonb;
BEGIN
  v_user := auth.uid();
  v_tenant := public.get_current_tenant();
  IF v_user IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT role::text INTO v_role FROM public.user_roles
  WHERE user_id = v_user AND (tenant_id = v_tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = v_tenant) DESC NULLS LAST LIMIT 1;

  IF v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT * INTO v_cn FROM public.credit_notes
    WHERE id = p_credit_note_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit note not found'; END IF;
  IF v_cn.status = 'confirmed' THEN RAISE EXCEPTION 'Already confirmed'; END IF;
  IF v_cn.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot confirm cancelled note'; END IF;

  -- Recompute amount from items if any exist
  SELECT COALESCE(SUM(total_price), 0) INTO v_items_total
    FROM public.credit_note_items WHERE credit_note_id = p_credit_note_id;

  IF v_items_total > 0 AND ABS(v_items_total - COALESCE(v_cn.amount, 0)) > 0.01 THEN
    UPDATE public.credit_notes
       SET amount = ROUND(v_items_total::numeric, 2), updated_at = now()
     WHERE id = p_credit_note_id;
    v_cn.amount := ROUND(v_items_total::numeric, 2);
  END IF;

  -- 1. Reduce customer balance
  UPDATE public.customers
     SET current_balance = COALESCE(current_balance, 0) - v_cn.amount,
         updated_at = now()
   WHERE id = v_cn.customer_id AND tenant_id = v_tenant;

  -- 2. Treat credit as payment on original invoice
  UPDATE public.invoices
     SET paid_amount = LEAST(COALESCE(total_amount, 0), COALESCE(paid_amount, 0) + v_cn.amount),
         payment_status = CASE
           WHEN COALESCE(paid_amount, 0) + v_cn.amount >= COALESCE(total_amount, 0) THEN 'paid'
           WHEN COALESCE(paid_amount, 0) + v_cn.amount > 0 THEN 'partial'
           ELSE payment_status
         END,
         updated_at = now()
   WHERE id = v_cn.invoice_id AND tenant_id = v_tenant;

  -- 3. Mark confirmed
  UPDATE public.credit_notes SET status = 'confirmed', updated_at = now()
   WHERE id = p_credit_note_id;

  -- 4. Reverse stock
  BEGIN
    v_stock_result := public.reverse_stock_for_credit_note(p_credit_note_id);
  EXCEPTION WHEN OTHERS THEN
    v_stock_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  -- 5. Reverse journal
  BEGIN
    v_journal_result := public.create_journal_for_credit_note(p_credit_note_id);
  EXCEPTION WHEN OTHERS THEN
    v_journal_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'amount', v_cn.amount,
    'stock', v_stock_result,
    'journal', v_journal_result
  );
END;
$$;