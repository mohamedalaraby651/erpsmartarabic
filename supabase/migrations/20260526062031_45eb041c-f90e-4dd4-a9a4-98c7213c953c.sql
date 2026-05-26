
CREATE OR REPLACE FUNCTION public.save_quotation_with_items(
  p_id     uuid,
  p_header jsonb,
  p_items  jsonb
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

  IF NOT public.check_section_permission(auth.uid(), 'quotes', v_action) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.quotes (
      customer_id, quote_date, valid_until, notes,
      subtotal, discount_amount, tax_amount, total_amount,
      created_by, tenant_id, status
    ) VALUES (
      (p_header->>'customer_id')::uuid,
      COALESCE(NULLIF(p_header->>'quote_date','')::date, CURRENT_DATE),
      NULLIF(p_header->>'valid_until','')::date,
      NULLIF(p_header->>'notes',''),
      COALESCE((p_header->>'subtotal')::numeric, 0),
      COALESCE((p_header->>'discount_amount')::numeric, 0),
      COALESCE((p_header->>'tax_amount')::numeric, 0),
      COALESCE((p_header->>'total_amount')::numeric, 0),
      auth.uid(),
      v_tenant,
      COALESCE((p_header->>'status')::document_status, 'draft'::document_status)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.quotes SET
      customer_id     = COALESCE((p_header->>'customer_id')::uuid, customer_id),
      quote_date      = COALESCE(NULLIF(p_header->>'quote_date','')::date, quote_date),
      valid_until     = COALESCE(NULLIF(p_header->>'valid_until','')::date, valid_until),
      notes           = COALESCE(NULLIF(p_header->>'notes',''), notes),
      subtotal        = COALESCE((p_header->>'subtotal')::numeric, subtotal),
      discount_amount = COALESCE((p_header->>'discount_amount')::numeric, discount_amount),
      tax_amount      = COALESCE((p_header->>'tax_amount')::numeric, tax_amount),
      total_amount    = COALESCE((p_header->>'total_amount')::numeric, total_amount),
      status          = COALESCE((p_header->>'status')::document_status, status),
      updated_at      = now()
    WHERE id = p_id AND tenant_id = v_tenant
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Quote not found or access denied';
    END IF;

    DELETE FROM public.quote_items WHERE quote_id = v_id;
  END IF;

  IF jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.quote_items (
      quote_id, product_id, variant_id, quantity, unit_price,
      discount_percentage, total_price, notes, tenant_id
    )
    SELECT
      v_id,
      (it->>'product_id')::uuid,
      NULLIF(it->>'variant_id','')::uuid,
      COALESCE((it->>'quantity')::numeric, 1),
      COALESCE((it->>'unit_price')::numeric, 0),
      COALESCE((it->>'discount_percentage')::numeric, 0),
      COALESCE((it->>'total_price')::numeric, 0),
      NULLIF(it->>'notes',''),
      v_tenant
    FROM jsonb_array_elements(p_items) it;
  END IF;

  RETURN v_id;
END $function$;

GRANT EXECUTE ON FUNCTION public.save_quotation_with_items(uuid, jsonb, jsonb) TO authenticated;
