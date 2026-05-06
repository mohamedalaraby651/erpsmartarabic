-- 1) Fix convert_invoice_to_delivery: auto-pick warehouse, validate items exist
CREATE OR REPLACE FUNCTION public.convert_invoice_to_delivery(p_invoice_id uuid, p_warehouse_id uuid DEFAULT NULL)
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
  v_tenant := public.get_current_tenant();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant context'; END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT id INTO v_existing FROM public.delivery_notes WHERE invoice_id = p_invoice_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Delivery already exists for this invoice: %', v_existing;
  END IF;

  -- Validate invoice has items
  SELECT COUNT(*) INTO v_item_count FROM public.invoice_items WHERE invoice_id = p_invoice_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Cannot create delivery: invoice has no items';
  END IF;

  -- Resolve warehouse: explicit > first active for tenant
  v_warehouse := p_warehouse_id;
  IF v_warehouse IS NULL THEN
    SELECT id INTO v_warehouse FROM public.warehouses
    WHERE tenant_id = v_tenant AND is_active = true
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_warehouse IS NULL THEN
    RAISE EXCEPTION 'No active warehouse found. Please create a warehouse first or specify one.';
  END IF;

  -- Verify warehouse belongs to tenant (defense-in-depth)
  IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id = v_warehouse AND tenant_id = v_tenant) THEN
    RAISE EXCEPTION 'Warehouse does not belong to current tenant';
  END IF;

  INSERT INTO public.delivery_notes
    (tenant_id, sales_order_id, invoice_id, customer_id, warehouse_id, delivery_date, status, created_by)
  VALUES
    (v_tenant, v_inv.order_id, p_invoice_id, v_inv.customer_id, v_warehouse, CURRENT_DATE, 'draft', auth.uid())
  RETURNING id INTO v_dn_id;

  INSERT INTO public.delivery_note_items (tenant_id, delivery_id, product_id, variant_id, ordered_qty, delivered_qty)
  SELECT v_tenant, v_dn_id, product_id, variant_id, quantity, quantity
  FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  RETURN v_dn_id;
END $function$;

-- 2) Fix convert_order_to_invoice: validate non-zero, validate items
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

-- 3) Fix convert_quote_to_order: validate items, warn on quantity rounding, atomic
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

  -- Detect fractional quantities that will be rounded
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

  -- ROUND instead of cast (more accurate than truncation)
  INSERT INTO public.sales_order_items (tenant_id, order_id, product_id, variant_id, quantity,
                                         unit_price, discount_percentage, total_price, notes)
  SELECT v_tenant, v_order_id, product_id, variant_id,
         GREATEST(1, ROUND(quantity)::INT),
         unit_price, discount_percentage, total_price, notes
  FROM public.quote_items WHERE quote_id = p_quote_id;

  UPDATE public.quotes SET status = 'converted', converted_order_id = v_order_id WHERE id = p_quote_id;
  RETURN v_order_id;
END $function$;