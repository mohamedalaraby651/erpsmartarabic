
-- ============================================================================
-- PHASE 1: RLS Hardening — quotes, quote_items, credit_notes, credit_note_items
-- ============================================================================

-- quotes ---------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_quotes_insert ON public.quotes;
DROP POLICY IF EXISTS tenant_quotes_update ON public.quotes;
DROP POLICY IF EXISTS tenant_quotes_delete ON public.quotes;

CREATE POLICY tenant_quotes_insert ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'sales', 'create')
  );

CREATE POLICY tenant_quotes_update ON public.quotes
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant())
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'sales', 'edit')
  );

CREATE POLICY tenant_quotes_delete ON public.quotes
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_current_tenant()
    AND status = 'draft'::quote_status
    AND public.check_section_permission(auth.uid(), 'sales', 'delete')
  );

-- quote_items ----------------------------------------------------------------
DROP POLICY IF EXISTS tenant_qitems_all ON public.quote_items;

CREATE POLICY tenant_qitems_select ON public.quote_items
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant());

CREATE POLICY tenant_qitems_insert ON public.quote_items
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'sales', 'create')
  );

CREATE POLICY tenant_qitems_update ON public.quote_items
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant())
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'sales', 'edit')
  );

CREATE POLICY tenant_qitems_delete ON public.quote_items
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'sales', 'delete')
  );

-- credit_notes ---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Authenticated users can update credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Authenticated users can delete credit_notes" ON public.credit_notes;

CREATE POLICY tenant_credit_notes_insert ON public.credit_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'invoices', 'create')
  );

CREATE POLICY tenant_credit_notes_update ON public.credit_notes
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant())
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'invoices', 'edit')
  );

CREATE POLICY tenant_credit_notes_delete ON public.credit_notes
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'invoices', 'delete')
  );

-- credit_note_items ----------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Authenticated users can update credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Authenticated users can delete credit_note_items" ON public.credit_note_items;

CREATE POLICY tenant_credit_note_items_insert ON public.credit_note_items
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'invoices', 'create')
  );

CREATE POLICY tenant_credit_note_items_update ON public.credit_note_items
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant())
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'invoices', 'edit')
  );

CREATE POLICY tenant_credit_note_items_delete ON public.credit_note_items
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_current_tenant()
    AND public.check_section_permission(auth.uid(), 'invoices', 'delete')
  );

-- ============================================================================
-- PHASE 1 (cont.): Harden conversion RPCs with section-permission guards
-- ============================================================================

CREATE OR REPLACE FUNCTION public.convert_quote_to_order(p_quote_id uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant UUID;
  v_quote RECORD;
  v_order_id UUID;
  v_order_no TEXT;
  v_item_count INT;
  v_rounding_count INT;
  v_warn_notes TEXT;
BEGIN
  IF NOT public.check_section_permission(auth.uid(), 'sales', 'create') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;
  IF NOT public.check_section_permission(auth.uid(), 'sales', 'edit') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  v_tenant := public.get_current_tenant();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant context'; END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF v_quote.status = 'converted' THEN RAISE EXCEPTION 'Quote already converted'; END IF;
  IF v_quote.status NOT IN ('accepted','sent') THEN
    RAISE EXCEPTION 'Only accepted/sent quotes can be converted (current: %)', v_quote.status;
  END IF;
  IF v_quote.valid_until < CURRENT_DATE THEN RAISE EXCEPTION 'Quote expired on %', v_quote.valid_until; END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.quote_items WHERE quote_id = p_quote_id;
  IF v_item_count = 0 THEN RAISE EXCEPTION 'Cannot convert a quote with no items'; END IF;

  SELECT COUNT(*) INTO v_rounding_count
  FROM public.quote_items
  WHERE quote_id = p_quote_id AND quantity != FLOOR(quantity);

  v_warn_notes := COALESCE(v_quote.notes, '');
  IF v_rounding_count > 0 THEN
    v_warn_notes := v_warn_notes ||
      E'\n[تنبيه نظام] تم تقريب ' || v_rounding_count || ' بند(بنود) ذات كميات كسرية إلى أعداد صحيحة.';
  END IF;

  v_order_no := 'SO-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);

  INSERT INTO public.sales_orders (tenant_id, order_number, customer_id, status, subtotal,
                                    discount_amount, tax_amount, total_amount, notes, created_by)
  VALUES (v_tenant, v_order_no, v_quote.customer_id, 'pending', v_quote.subtotal,
          v_quote.discount_amount, v_quote.tax_amount, v_quote.total_amount, v_warn_notes, auth.uid())
  RETURNING id INTO v_order_id;

  INSERT INTO public.sales_order_items (tenant_id, order_id, product_id, variant_id, quantity,
                                         unit_price, discount_percentage, total_price, notes)
  SELECT v_tenant, v_order_id, product_id, variant_id,
         GREATEST(1, ROUND(quantity)::INT),
         unit_price, discount_percentage, total_price, notes
  FROM public.quote_items WHERE quote_id = p_quote_id;

  UPDATE public.quotes SET status = 'converted', converted_order_id = v_order_id WHERE id = p_quote_id;
  RETURN v_order_id;
END $function$;

CREATE OR REPLACE FUNCTION public.convert_order_to_invoice(p_order_id uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant UUID;
  v_order RECORD;
  v_inv_id UUID;
  v_inv_no TEXT;
  v_existing UUID;
  v_item_count INT;
BEGIN
  IF NOT public.check_section_permission(auth.uid(), 'invoices', 'create') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;
  IF NOT public.check_section_permission(auth.uid(), 'sales', 'edit') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  v_tenant := public.get_current_tenant();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant context'; END IF;

  SELECT * INTO v_order FROM public.sales_orders WHERE id = p_order_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_order.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot invoice a cancelled order'; END IF;

  SELECT id INTO v_existing FROM public.invoices WHERE order_id = p_order_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'Invoice already exists for this order: %', v_existing; END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.sales_order_items WHERE order_id = p_order_id;
  IF v_item_count = 0 THEN RAISE EXCEPTION 'Cannot invoice an order with no items'; END IF;

  IF COALESCE(v_order.total_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Cannot invoice an order with zero total';
  END IF;

  v_inv_no := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);

  INSERT INTO public.invoices (tenant_id, invoice_number, order_id, customer_id, status, payment_status,
                               subtotal, discount_amount, tax_amount, total_amount, due_date, notes, created_by)
  VALUES (v_tenant, v_inv_no, p_order_id, v_order.customer_id, 'pending', 'pending',
          v_order.subtotal, v_order.discount_amount, v_order.tax_amount, v_order.total_amount,
          CURRENT_DATE + INTERVAL '30 days', v_order.notes, auth.uid())
  RETURNING id INTO v_inv_id;

  INSERT INTO public.invoice_items (tenant_id, invoice_id, product_id, variant_id, quantity, unit_price,
                                    discount_percentage, total_price, notes)
  SELECT v_tenant, v_inv_id, product_id, variant_id, quantity, unit_price, discount_percentage, total_price, notes
  FROM public.sales_order_items WHERE order_id = p_order_id;

  UPDATE public.sales_orders SET status = 'completed' WHERE id = p_order_id;
  RETURN v_inv_id;
END $function$;

-- For convert_invoice_to_delivery, only inject the permission guards at the top
-- (we re-fetch the original body and prepend the check).
DO $$
DECLARE
  v_body TEXT;
BEGIN
  -- Just create a new definition with guard prepended. We rebuild it from scratch.
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.convert_invoice_to_delivery(p_invoice_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant UUID;
  v_inv RECORD;
  v_dn_id UUID;
  v_existing UUID;
  v_warehouse UUID;
  v_item_count INT;
BEGIN
  IF NOT public.check_section_permission(auth.uid(), 'sales', 'create') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  v_tenant := public.get_current_tenant();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant context'; END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT id INTO v_existing FROM public.delivery_notes WHERE invoice_id = p_invoice_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Delivery already exists for this invoice: %', v_existing;
  END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.invoice_items WHERE invoice_id = p_invoice_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Cannot create delivery: invoice has no items';
  END IF;

  v_warehouse := p_warehouse_id;
  IF v_warehouse IS NULL THEN
    SELECT id INTO v_warehouse FROM public.warehouses
      WHERE tenant_id = v_tenant AND is_active = true
      ORDER BY created_at ASC LIMIT 1;
    IF v_warehouse IS NULL THEN
      RAISE EXCEPTION 'No active warehouse available for delivery';
    END IF;
  END IF;

  INSERT INTO public.delivery_notes (tenant_id, delivery_number, invoice_id, customer_id,
                                     warehouse_id, status, notes, created_by, delivery_date)
  VALUES (v_tenant,
          'DN-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6),
          p_invoice_id, v_inv.customer_id, v_warehouse, 'draft', v_inv.notes, auth.uid(), CURRENT_DATE)
  RETURNING id INTO v_dn_id;

  INSERT INTO public.delivery_note_items (tenant_id, delivery_note_id, product_id, variant_id,
                                          quantity, unit_price, notes)
  SELECT v_tenant, v_dn_id, product_id, variant_id, quantity, unit_price, notes
  FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  RETURN v_dn_id;
END $function$;

-- ============================================================================
-- PHASE 2: Atomic save_invoice_with_items RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_invoice_with_items(
  p_id     uuid,           -- NULL on create
  p_header jsonb,
  p_items  jsonb           -- array of items
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_id     uuid;
  v_tenant uuid := public.get_current_tenant();
  v_action text := CASE WHEN p_id IS NULL THEN 'create' ELSE 'edit' END;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  IF NOT public.check_section_permission(auth.uid(), 'invoices', v_action) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.invoices (
      invoice_number, order_id, customer_id, status, payment_status, payment_method,
      subtotal, discount_amount, tax_amount, total_amount, paid_amount, due_date,
      notes, created_by, tenant_id
    ) VALUES (
      COALESCE(p_header->>'invoice_number',
               'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
      NULLIF(p_header->>'order_id','')::uuid,
      (p_header->>'customer_id')::uuid,
      COALESCE((p_header->>'status')::document_status, 'pending'::document_status),
      COALESCE((p_header->>'payment_status')::payment_status, 'pending'::payment_status),
      COALESCE((p_header->>'payment_method')::payment_method, 'cash'::payment_method),
      COALESCE((p_header->>'subtotal')::numeric, 0),
      COALESCE((p_header->>'discount_amount')::numeric, 0),
      COALESCE((p_header->>'tax_amount')::numeric, 0),
      COALESCE((p_header->>'total_amount')::numeric, 0),
      COALESCE((p_header->>'paid_amount')::numeric, 0),
      NULLIF(p_header->>'due_date','')::date,
      NULLIF(p_header->>'notes',''),
      COALESCE(NULLIF(p_header->>'created_by','')::uuid, auth.uid()),
      v_tenant
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.invoices SET
      invoice_number  = COALESCE(p_header->>'invoice_number', invoice_number),
      order_id        = COALESCE(NULLIF(p_header->>'order_id','')::uuid, order_id),
      customer_id     = COALESCE((p_header->>'customer_id')::uuid, customer_id),
      status          = COALESCE((p_header->>'status')::document_status, status),
      payment_status  = COALESCE((p_header->>'payment_status')::payment_status, payment_status),
      payment_method  = COALESCE((p_header->>'payment_method')::payment_method, payment_method),
      subtotal        = COALESCE((p_header->>'subtotal')::numeric, subtotal),
      discount_amount = COALESCE((p_header->>'discount_amount')::numeric, discount_amount),
      tax_amount      = COALESCE((p_header->>'tax_amount')::numeric, tax_amount),
      total_amount    = COALESCE((p_header->>'total_amount')::numeric, total_amount),
      due_date        = COALESCE(NULLIF(p_header->>'due_date','')::date, due_date),
      notes           = COALESCE(NULLIF(p_header->>'notes',''), notes),
      updated_at      = now()
    WHERE id = p_id AND tenant_id = v_tenant
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Invoice not found or access denied';
    END IF;

    DELETE FROM public.invoice_items WHERE invoice_id = v_id;
  END IF;

  IF jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.invoice_items (
      invoice_id, product_id, variant_id, quantity, unit_price,
      discount_percentage, total_price, notes, tenant_id
    )
    SELECT
      v_id,
      (it->>'product_id')::uuid,
      NULLIF(it->>'variant_id','')::uuid,
      COALESCE((it->>'quantity')::int, 1),
      COALESCE((it->>'unit_price')::numeric, 0),
      COALESCE((it->>'discount_percentage')::numeric, 0),
      COALESCE((it->>'total_price')::numeric, 0),
      NULLIF(it->>'notes',''),
      v_tenant
    FROM jsonb_array_elements(p_items) it;
  END IF;

  RETURN v_id;
END $function$;

GRANT EXECUTE ON FUNCTION public.save_invoice_with_items(uuid, jsonb, jsonb) TO authenticated;

-- ============================================================================
-- PHASE 3: Header math integrity trigger (quotes + quotations)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_quote_totals_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_expected numeric;
BEGIN
  v_expected := COALESCE(NEW.subtotal, 0)
              - COALESCE(NEW.discount_amount, 0)
              + COALESCE(NEW.tax_amount, 0);
  IF ABS(COALESCE(NEW.total_amount, 0) - v_expected) > 0.01 THEN
    RAISE EXCEPTION 'TOTAL_MISMATCH: total_amount (%) must equal subtotal - discount_amount + tax_amount (%)',
      NEW.total_amount, v_expected;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_quotes_totals_consistency ON public.quotes;
CREATE TRIGGER trg_quotes_totals_consistency
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_totals_consistency();

DROP TRIGGER IF EXISTS trg_quotations_totals_consistency ON public.quotations;
CREATE TRIGGER trg_quotations_totals_consistency
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_totals_consistency();
