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
  IF auth.uid() IS NULL OR _tenant IS NULL OR NOT public.is_tenant_member(_tenant) THEN
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

REVOKE EXECUTE ON FUNCTION public.atomic_supplier_balance_update(uuid,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_supplier_balance_update(uuid,numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.restore_table_contract(_tables text[])
RETURNS TABLE(table_name text, column_name text, data_type text, is_required boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::text, a.attname::text, format_type(a.atttypid, a.atttypmod)::text,
         (a.attnotnull AND NOT a.atthasdef)
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(_tables)
    AND c.relname = ANY(ARRAY['customers','customer_addresses','customer_categories','customer_notes','customer_communications','customer_reminders','suppliers','supplier_notes','products','product_categories','product_variants','product_stock','warehouses','quotations','quotation_items','sales_orders','sales_order_items','invoices','invoice_items','payments','purchase_orders','purchase_order_items','supplier_payments','stock_movements','expenses','expense_categories','tasks','employees','bank_accounts','cash_registers','custom_roles','role_section_permissions','role_limits','user_tenants','company_settings','approval_chains','fiscal_periods','chart_of_accounts'])
    AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = '' AND a.attidentity = ''
    AND a.attname NOT IN ('tenant_id','created_at','updated_at')
  ORDER BY c.relname, a.attnum
$$;
REVOKE ALL ON FUNCTION public.restore_table_contract(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_table_contract(text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.restore_reference_contract(_tables text[])
RETURNS TABLE(table_name text, column_name text, target_table text, target_column text, target_has_tenant boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT src.relname::text, sa.attname::text, tgt.relname::text, ta.attname::text,
         EXISTS (SELECT 1 FROM pg_attribute tt WHERE tt.attrelid = tgt.oid AND tt.attname = 'tenant_id' AND NOT tt.attisdropped)
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_namespace sn ON sn.oid = src.relnamespace
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  JOIN pg_namespace tn ON tn.oid = tgt.relnamespace
  JOIN pg_attribute sa ON sa.attrelid = src.oid AND sa.attnum = con.conkey[1]
  JOIN pg_attribute ta ON ta.attrelid = tgt.oid AND ta.attnum = con.confkey[1]
  WHERE con.contype = 'f' AND cardinality(con.conkey) = 1
    AND sn.nspname = 'public' AND tn.nspname = 'public'
    AND src.relname = ANY(_tables)
    AND sa.attname <> 'tenant_id'
$$;
REVOKE ALL ON FUNCTION public.restore_reference_contract(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_reference_contract(text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_tenant_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Company ownership cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_tenant_reassignment() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE _table text;
BEGIN
  FOREACH _table IN ARRAY ARRAY['customers','customer_addresses','customer_categories','customer_notes','customer_communications','customer_reminders','suppliers','supplier_notes','products','product_categories','product_variants','product_stock','warehouses','quotations','quotation_items','sales_orders','sales_order_items','invoices','invoice_items','payments','purchase_orders','purchase_order_items','supplier_payments','stock_movements','expenses','expense_categories','tasks','employees','bank_accounts','cash_registers','custom_roles','role_section_permissions','role_limits','user_tenants','company_settings','approval_chains','fiscal_periods','chart_of_accounts'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_table AND column_name='tenant_id') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS zz_prevent_tenant_reassignment ON public.%I', _table);
      EXECUTE format('CREATE TRIGGER zz_prevent_tenant_reassignment BEFORE UPDATE OF tenant_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment()', _table);
    END IF;
  END LOOP;
END $$;