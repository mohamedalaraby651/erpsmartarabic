-- ============================================================
-- Full partial-return support across multiple credit notes
-- ============================================================

-- 1) Extend get_invoice_item_returnable to optionally include drafts
--    so we can warn the UI when overlapping drafts may collide.
CREATE OR REPLACE FUNCTION public.get_invoice_item_returnable(
  _invoice_item_id uuid,
  _include_drafts boolean DEFAULT false
)
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
          AND (
            cn.status = 'confirmed'
            OR (_include_drafts AND cn.status = 'draft')
          )
      ), 0)
  )::numeric
$$;

-- Backwards-compat: keep single-arg version as a wrapper (already works via DEFAULT).
COMMENT ON FUNCTION public.get_invoice_item_returnable(uuid, boolean) IS
'Returns remaining returnable qty for an invoice item. Set _include_drafts=true to also subtract qty reserved by draft credit notes (preview only).';

-- 2) Concurrency-safe validation: lock the invoice item row, then re-check.
CREATE OR REPLACE FUNCTION public.validate_credit_note_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cn_invoice uuid;
  v_item_invoice uuid;
  v_item_qty numeric;
  v_item_unit_price numeric;
  v_already_returned numeric;
  v_returnable numeric;
BEGIN
  IF NEW.invoice_item_id IS NULL THEN
    -- Unlinked items still need a sensible unit_price_original
    IF NEW.unit_price_original IS NULL THEN
      NEW.unit_price_original := NEW.unit_price;
    END IF;
    RETURN NEW;
  END IF;

  -- Lock invoice item row to serialize concurrent returns on same line
  SELECT invoice_id, quantity, unit_price
    INTO v_item_invoice, v_item_qty, v_item_unit_price
    FROM public.invoice_items
    WHERE id = NEW.invoice_item_id
    FOR UPDATE;

  IF v_item_invoice IS NULL THEN
    RAISE EXCEPTION 'Invoice item % not found', NEW.invoice_item_id;
  END IF;

  SELECT invoice_id INTO v_cn_invoice
    FROM public.credit_notes WHERE id = NEW.credit_note_id;

  IF v_cn_invoice IS NULL OR v_cn_invoice <> v_item_invoice THEN
    RAISE EXCEPTION 'invoice_item_id does not belong to the credit note''s invoice';
  END IF;

  -- Sum qty already returned by CONFIRMED credit notes (excluding this row on UPDATE)
  SELECT COALESCE(SUM(cni.quantity), 0)
    INTO v_already_returned
    FROM public.credit_note_items cni
    JOIN public.credit_notes cn ON cn.id = cni.credit_note_id
    WHERE cni.invoice_item_id = NEW.invoice_item_id
      AND cn.status = 'confirmed'
      AND (TG_OP = 'INSERT' OR cni.id <> NEW.id);

  v_returnable := GREATEST(0, v_item_qty - v_already_returned);

  IF NEW.quantity > v_returnable THEN
    RAISE EXCEPTION
      'Quantity % exceeds returnable amount % for invoice item % (original: %, already returned: %)',
      NEW.quantity, v_returnable, NEW.invoice_item_id, v_item_qty, v_already_returned;
  END IF;

  -- Snapshot original unit price (immutable once set)
  IF NEW.unit_price_original IS NULL THEN
    NEW.unit_price_original := v_item_unit_price;
  END IF;

  -- Keep total_price consistent with quantity * unit_price (rounded to 2 dp)
  IF NEW.unit_price IS NULL THEN
    NEW.unit_price := NEW.unit_price_original;
  END IF;
  NEW.total_price := ROUND((NEW.quantity * NEW.unit_price)::numeric, 2);

  RETURN NEW;
END;
$$;

-- 3) Recalculate amount when items change (insert/update/delete on credit_note_items)
CREATE OR REPLACE FUNCTION public.sync_credit_note_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cn_id uuid;
  v_status text;
  v_total numeric;
BEGIN
  v_cn_id := COALESCE(NEW.credit_note_id, OLD.credit_note_id);

  SELECT status INTO v_status FROM public.credit_notes WHERE id = v_cn_id;
  -- Only auto-sync while still draft; confirmed notes are immutable
  IF v_status IS DISTINCT FROM 'draft' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(total_price), 0) INTO v_total
    FROM public.credit_note_items WHERE credit_note_id = v_cn_id;

  UPDATE public.credit_notes
     SET amount = ROUND(v_total::numeric, 2),
         updated_at = now()
   WHERE id = v_cn_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_credit_note_amount ON public.credit_note_items;
CREATE TRIGGER trg_sync_credit_note_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_note_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_credit_note_amount();

-- 4) Block edits to confirmed credit_note_items (immutability)
CREATE OR REPLACE FUNCTION public.guard_credit_note_items_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
    FROM public.credit_notes
    WHERE id = COALESCE(NEW.credit_note_id, OLD.credit_note_id);

  IF v_status = 'confirmed' THEN
    RAISE EXCEPTION 'Cannot modify items of a confirmed credit note';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_credit_note_items_immutable ON public.credit_note_items;
CREATE TRIGGER trg_guard_credit_note_items_immutable
  BEFORE UPDATE OR DELETE ON public.credit_note_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_credit_note_items_immutable();

-- 5) Reporting view: aggregated returns per invoice item across all credit notes
CREATE OR REPLACE VIEW public.invoice_item_returns_summary AS
SELECT
  ii.id                                              AS invoice_item_id,
  ii.invoice_id,
  ii.product_id,
  ii.quantity                                        AS original_qty,
  ii.unit_price                                      AS unit_price_current,
  COALESCE(SUM(cni.quantity) FILTER (WHERE cn.status = 'confirmed'), 0)
                                                     AS confirmed_returned_qty,
  COALESCE(SUM(cni.quantity) FILTER (WHERE cn.status = 'draft'), 0)
                                                     AS draft_returned_qty,
  GREATEST(
    0,
    ii.quantity - COALESCE(SUM(cni.quantity) FILTER (WHERE cn.status = 'confirmed'), 0)
  )                                                  AS remaining_qty,
  COUNT(DISTINCT cn.id) FILTER (WHERE cn.status = 'confirmed')
                                                     AS confirmed_credit_notes_count,
  COUNT(DISTINCT cn.id) FILTER (WHERE cn.status = 'draft')
                                                     AS draft_credit_notes_count
FROM public.invoice_items ii
LEFT JOIN public.credit_note_items cni ON cni.invoice_item_id = ii.id
LEFT JOIN public.credit_notes cn       ON cn.id = cni.credit_note_id
GROUP BY ii.id, ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price;

COMMENT ON VIEW public.invoice_item_returns_summary IS
'Aggregated view of return progress per invoice line: original / confirmed / draft / remaining qty across multiple credit notes.';