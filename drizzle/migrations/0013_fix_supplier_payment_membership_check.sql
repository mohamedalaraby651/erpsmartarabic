CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  _supplier_id uuid,
  _amount numeric,
  _payment_method public.payment_method,
  _payment_date date,
  _reference_number text DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := public.get_current_tenant();
  _payment_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _tenant IS NULL OR NOT public.is_tenant_member(auth.uid(), _tenant) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF NOT public.check_section_permission(auth.uid(), 'supplier_payments', 'create') THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 999999999999 THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '22023';
  END IF;
  IF _payment_date IS NULL OR length(COALESCE(_reference_number, '')) > 100 OR length(COALESCE(_notes, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid payment details' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.suppliers
  WHERE id = _supplier_id AND tenant_id = _tenant AND COALESCE(is_active, true)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.supplier_payments (
    tenant_id, payment_number, supplier_id, amount, payment_method,
    payment_date, reference_number, notes, created_by
  ) VALUES (
    _tenant,
    'SP-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
    _supplier_id, round(_amount, 2), _payment_method, _payment_date,
    NULLIF(btrim(_reference_number), ''), NULLIF(btrim(_notes), ''), auth.uid()
  ) RETURNING id INTO _payment_id;

  UPDATE public.suppliers
  SET current_balance = round(COALESCE(current_balance, 0) - round(_amount, 2), 2)
  WHERE id = _supplier_id AND tenant_id = _tenant;

  RETURN _payment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid,numeric,public.payment_method,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid,numeric,public.payment_method,date,text,text) TO authenticated, service_role;