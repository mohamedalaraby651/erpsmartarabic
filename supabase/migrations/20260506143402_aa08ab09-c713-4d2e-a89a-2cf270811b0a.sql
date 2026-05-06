CREATE OR REPLACE FUNCTION public.validate_credit_note_before_confirm(p_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cn record;
  v_inv record;
  v_errors text[] := ARRAY[]::text[];
  v_warnings text[] := ARRAY[]::text[];
  v_items_count int;
  v_unlinked_count int;
  v_wrong_invoice_count int;
  v_overdraw record;
  v_items_total numeric;
BEGIN
  SELECT * INTO v_cn FROM public.credit_notes WHERE id = p_credit_note_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'errors', ARRAY['Credit note not found'], 'warnings', ARRAY[]::text[]);
  END IF;

  IF v_cn.status = 'confirmed' THEN
    v_errors := array_append(v_errors, 'Credit note already confirmed');
  ELSIF v_cn.status = 'cancelled' THEN
    v_errors := array_append(v_errors, 'Credit note is cancelled');
  END IF;

  -- Original invoice must exist and not be cancelled
  SELECT id, status, total_amount, paid_amount
    INTO v_inv FROM public.invoices WHERE id = v_cn.invoice_id;
  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Original invoice not found');
  ELSIF v_inv.status::text = 'cancelled' THEN
    v_errors := array_append(v_errors, 'Cannot confirm: original invoice is cancelled');
  END IF;

  -- Items checks
  SELECT count(*),
         count(*) FILTER (WHERE invoice_item_id IS NULL),
         COALESCE(SUM(total_price), 0)
    INTO v_items_count, v_unlinked_count, v_items_total
    FROM public.credit_note_items
   WHERE credit_note_id = p_credit_note_id;

  IF v_items_count = 0 AND COALESCE(v_cn.amount, 0) <= 0 THEN
    v_errors := array_append(v_errors, 'Credit note has no items and no amount');
  END IF;

  IF v_items_count > 0 AND v_unlinked_count > 0 THEN
    v_warnings := array_append(v_warnings,
      format('%s item(s) are not linked to invoice items — stock will not be reversed for them', v_unlinked_count));
  END IF;

  -- Wrong invoice linkage
  SELECT count(*) INTO v_wrong_invoice_count
    FROM public.credit_note_items cni
    JOIN public.invoice_items ii ON ii.id = cni.invoice_item_id
   WHERE cni.credit_note_id = p_credit_note_id
     AND ii.invoice_id <> v_cn.invoice_id;
  IF v_wrong_invoice_count > 0 THEN
    v_errors := array_append(v_errors,
      format('%s item(s) are linked to a different invoice', v_wrong_invoice_count));
  END IF;

  -- Quantity overdraw (any item where this credit-note's qty + previously confirmed qty > sold qty)
  FOR v_overdraw IN
    SELECT cni.invoice_item_id,
           cni.quantity AS req_qty,
           ii.quantity  AS sold_qty,
           COALESCE((
             SELECT SUM(c2.quantity)
             FROM public.credit_note_items c2
             JOIN public.credit_notes cn2 ON cn2.id = c2.credit_note_id
             WHERE c2.invoice_item_id = cni.invoice_item_id
               AND cn2.status = 'confirmed'
               AND cn2.id <> p_credit_note_id
           ), 0) AS prev_returned
      FROM public.credit_note_items cni
      JOIN public.invoice_items ii ON ii.id = cni.invoice_item_id
     WHERE cni.credit_note_id = p_credit_note_id
  LOOP
    IF v_overdraw.req_qty + v_overdraw.prev_returned > v_overdraw.sold_qty THEN
      v_errors := array_append(v_errors, format(
        'Item %s: returning %s + already-returned %s exceeds sold %s',
        v_overdraw.invoice_item_id, v_overdraw.req_qty, v_overdraw.prev_returned, v_overdraw.sold_qty
      ));
    END IF;
  END LOOP;

  -- Amount mismatch warning
  IF v_items_count > 0 AND ABS(v_items_total - COALESCE(v_cn.amount, 0)) > 0.01 THEN
    v_warnings := array_append(v_warnings, format(
      'Header amount %s differs from items total %s — will be auto-corrected on confirm',
      ROUND(COALESCE(v_cn.amount, 0)::numeric, 2),
      ROUND(v_items_total::numeric, 2)
    ));
  END IF;

  RETURN jsonb_build_object(
    'ok',         array_length(v_errors, 1) IS NULL,
    'errors',     v_errors,
    'warnings',   v_warnings,
    'items_count', v_items_count,
    'items_total', ROUND(v_items_total::numeric, 2),
    'header_amount', ROUND(COALESCE(v_cn.amount, 0)::numeric, 2)
  );
END;
$$;

-- Wire validation into confirm_credit_note
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
  v_validation jsonb;
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

  -- Pre-flight validation
  v_validation := public.validate_credit_note_before_confirm(p_credit_note_id);
  IF NOT (v_validation->>'ok')::boolean THEN
    RAISE EXCEPTION 'Validation failed: %', v_validation->'errors';
  END IF;

  -- Recompute amount from items if any exist
  SELECT COALESCE(SUM(total_price), 0) INTO v_items_total
    FROM public.credit_note_items WHERE credit_note_id = p_credit_note_id;

  IF v_items_total > 0 AND ABS(v_items_total - COALESCE(v_cn.amount, 0)) > 0.01 THEN
    UPDATE public.credit_notes
       SET amount = ROUND(v_items_total::numeric, 2), updated_at = now()
     WHERE id = p_credit_note_id;
    v_cn.amount := ROUND(v_items_total::numeric, 2);
  END IF;

  UPDATE public.customers
     SET current_balance = COALESCE(current_balance, 0) - v_cn.amount,
         updated_at = now()
   WHERE id = v_cn.customer_id AND tenant_id = v_tenant;

  UPDATE public.invoices
     SET paid_amount = LEAST(COALESCE(total_amount, 0), COALESCE(paid_amount, 0) + v_cn.amount),
         payment_status = CASE
           WHEN COALESCE(paid_amount, 0) + v_cn.amount >= COALESCE(total_amount, 0) THEN 'paid'
           WHEN COALESCE(paid_amount, 0) + v_cn.amount > 0 THEN 'partial'
           ELSE payment_status
         END,
         updated_at = now()
   WHERE id = v_cn.invoice_id AND tenant_id = v_tenant;

  UPDATE public.credit_notes SET status = 'confirmed', updated_at = now()
   WHERE id = p_credit_note_id;

  BEGIN
    v_stock_result := public.reverse_stock_for_credit_note(p_credit_note_id);
  EXCEPTION WHEN OTHERS THEN
    v_stock_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  BEGIN
    v_journal_result := public.create_journal_for_credit_note(p_credit_note_id);
  EXCEPTION WHEN OTHERS THEN
    v_journal_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'amount', v_cn.amount,
    'validation', v_validation,
    'stock', v_stock_result,
    'journal', v_journal_result
  );
END;
$$;