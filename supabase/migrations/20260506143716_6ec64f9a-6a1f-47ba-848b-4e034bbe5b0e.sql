CREATE OR REPLACE FUNCTION public.cancel_credit_note(p_credit_note_id uuid)
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
  v_item record;
  v_wh uuid;
  v_journal_result jsonb;
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
  IF v_cn.status = 'cancelled' THEN RAISE EXCEPTION 'Already cancelled'; END IF;

  IF v_cn.status = 'confirmed' THEN
    UPDATE public.customers
    SET current_balance = COALESCE(current_balance, 0) + v_cn.amount, updated_at = now()
    WHERE id = v_cn.customer_id AND tenant_id = v_tenant;

    UPDATE public.invoices
    SET paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount),
        payment_status = (CASE
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) >= COALESCE(total_amount, 0) THEN 'paid'
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) > 0 THEN 'partial'
          ELSE 'pending'
        END)::public.payment_status,
        updated_at = now()
    WHERE id = v_cn.invoice_id AND tenant_id = v_tenant;

    SELECT id INTO v_wh FROM public.warehouses
    WHERE tenant_id = v_tenant AND is_active = true ORDER BY created_at ASC LIMIT 1;

    IF v_wh IS NOT NULL THEN
      FOR v_item IN SELECT product_id, variant_id, quantity FROM public.credit_note_items WHERE credit_note_id = p_credit_note_id LOOP
        UPDATE public.product_stock
        SET quantity = GREATEST(0, quantity - v_item.quantity::int), updated_at = now()
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_wh
          AND tenant_id = v_tenant
          AND COALESCE(variant_id::text, '') = COALESCE(v_item.variant_id::text, '');

        INSERT INTO public.stock_movements (
          product_id, variant_id, from_warehouse_id, movement_type, quantity,
          reference_type, reference_id, tenant_id, created_by, notes
        ) VALUES (
          v_item.product_id, v_item.variant_id, v_wh, 'out', v_item.quantity::int,
          'credit_note_cancel', p_credit_note_id, v_tenant, v_user,
          'Reverse of cancelled credit note'
        );
      END LOOP;
    END IF;

    BEGIN
      v_journal_result := public.reverse_journal_for_credit_note(p_credit_note_id);
    EXCEPTION WHEN OTHERS THEN
      v_journal_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;
  END IF;

  UPDATE public.credit_notes SET status = 'cancelled', updated_at = now()
  WHERE id = p_credit_note_id;

  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'journal', v_journal_result
  );
END;
$$;