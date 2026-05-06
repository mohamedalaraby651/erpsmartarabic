-- Fix reverse_stock_for_credit_note: use product_stock per-warehouse, valid enum
CREATE OR REPLACE FUNCTION public.reverse_stock_for_credit_note(_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cn RECORD;
  _item RECORD;
  _wh uuid;
  _count int := 0;
BEGIN
  SELECT * INTO _cn FROM public.credit_notes WHERE id = _credit_note_id;
  IF _cn.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;

  -- Pick first active warehouse for tenant
  SELECT id INTO _wh FROM public.warehouses
  WHERE tenant_id = _cn.tenant_id AND is_active = true
  ORDER BY created_at ASC LIMIT 1;

  IF _wh IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_warehouse_for_tenant');
  END IF;

  FOR _item IN
    SELECT product_id, variant_id, quantity FROM public.credit_note_items WHERE credit_note_id = _credit_note_id
  LOOP
    -- Upsert product_stock (add returned quantity)
    INSERT INTO public.product_stock (product_id, variant_id, warehouse_id, quantity, tenant_id)
    VALUES (_item.product_id, _item.variant_id, _wh, _item.quantity::int, _cn.tenant_id)
    ON CONFLICT (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), warehouse_id)
    DO UPDATE SET quantity = public.product_stock.quantity + EXCLUDED.quantity, updated_at = now();

    -- Log movement (best-effort; valid enum only)
    BEGIN
      INSERT INTO public.stock_movements (tenant_id, product_id, variant_id, to_warehouse_id, movement_type, quantity, reference_type, reference_id, notes)
      VALUES (_cn.tenant_id, _item.product_id, _item.variant_id, _wh, 'in', _item.quantity::int, 'credit_note', _credit_note_id,
              'مرتجع رقم: ' || _cn.credit_note_number);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'items_returned', _count, 'warehouse_id', _wh);
END;
$$;

-- Update cancel_credit_note inline stock reversal: subtract from product_stock
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
        payment_status = CASE
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) >= COALESCE(total_amount, 0) THEN 'paid'
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) > 0 THEN 'partial'
          ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = v_cn.invoice_id AND tenant_id = v_tenant;

    -- Reverse stock: subtract from same warehouse(s) (use first active again)
    SELECT id INTO v_wh FROM public.warehouses
    WHERE tenant_id = v_tenant AND is_active = true ORDER BY created_at ASC LIMIT 1;

    IF v_wh IS NOT NULL THEN
      FOR v_item IN SELECT product_id, variant_id, quantity FROM public.credit_note_items WHERE credit_note_id = p_credit_note_id LOOP
        UPDATE public.product_stock
        SET quantity = quantity - v_item.quantity::int, updated_at = now()
        WHERE product_id = v_item.product_id
          AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v_item.variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND warehouse_id = v_wh;

        BEGIN
          INSERT INTO public.stock_movements (tenant_id, product_id, variant_id, from_warehouse_id, movement_type, quantity, reference_type, reference_id, notes)
          VALUES (v_tenant, v_item.product_id, v_item.variant_id, v_wh, 'out', v_item.quantity::int, 'credit_note_cancel', p_credit_note_id,
                  'إلغاء مرتجع: ' || v_cn.credit_note_number);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
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
    'reversal_journal', v_journal_result
  );
END;
$$;