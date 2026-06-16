-- 1) decrypt_totp_secret: lock down to service_role only
REVOKE EXECUTE ON FUNCTION public.decrypt_totp_secret(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_totp_secret(uuid) TO service_role;

-- 2) atomic_customer_balance_update: enforce tenant isolation
CREATE OR REPLACE FUNCTION public.atomic_customer_balance_update(_customer_id uuid, _amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_tenant uuid;
BEGIN
  _current_tenant := public.get_current_tenant();
  IF _current_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = '42501';
  END IF;

  UPDATE customers
  SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _customer_id
    AND tenant_id = _current_tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found in current tenant' USING ERRCODE = '42501';
  END IF;
END;
$function$;

-- 3) atomic_supplier_balance_update: enforce tenant isolation
CREATE OR REPLACE FUNCTION public.atomic_supplier_balance_update(_supplier_id uuid, _amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_tenant uuid;
BEGIN
  _current_tenant := public.get_current_tenant();
  IF _current_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = '42501';
  END IF;

  UPDATE suppliers
  SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _supplier_id
    AND tenant_id = _current_tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found in current tenant' USING ERRCODE = '42501';
  END IF;
END;
$function$;

-- 4) switch_user_tenant: prevent switching tenant for other users
CREATE OR REPLACE FUNCTION public.switch_user_tenant(_user_id uuid, _tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- A user can only switch their own tenant
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Cannot switch tenant for another user' USING ERRCODE = '42501';
  END IF;

  -- Verify user belongs to target tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  ) THEN
    RAISE EXCEPTION 'User does not belong to target tenant' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_tenants
  SET is_current = (tenant_id = _tenant_id)
  WHERE user_id = _user_id;

  RETURN true;
END;
$function$;

-- 5) merge_customers_atomic: require both customers in current tenant
CREATE OR REPLACE FUNCTION public.merge_customers_atomic(p_primary_id uuid, p_duplicate_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _primary RECORD;
  _duplicate RECORD;
  _current_tenant uuid;
  _total_invoiced NUMERIC;
  _total_paid NUMERIC;
  _total_credit_notes NUMERIC;
BEGIN
  IF p_primary_id = p_duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a customer with itself';
  END IF;

  _current_tenant := public.get_current_tenant();
  IF _current_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = '42501';
  END IF;

  SELECT id, name, tenant_id INTO _primary FROM customers WHERE id = p_primary_id;
  SELECT id, name, tenant_id INTO _duplicate FROM customers WHERE id = p_duplicate_id;

  IF _primary.id IS NULL OR _duplicate.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF _primary.tenant_id <> _current_tenant OR _duplicate.tenant_id <> _current_tenant THEN
    RAISE EXCEPTION 'Cannot merge customers across tenants' USING ERRCODE = '42501';
  END IF;

  -- Transfer all related records (including customer_notes now)
  UPDATE invoices SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE payments SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE sales_orders SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE quotations SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_addresses SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_communications SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_reminders SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE credit_notes SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE customer_notes SET customer_id = p_primary_id WHERE customer_id = p_duplicate_id;
  UPDATE attachments SET entity_id = p_primary_id::text WHERE entity_type = 'customer' AND entity_id = p_duplicate_id::text;

  -- Recalculate balance INCLUDING credit notes
  SELECT COALESCE(SUM(total_amount), 0) INTO _total_invoiced FROM invoices WHERE customer_id = p_primary_id;
  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM payments WHERE customer_id = p_primary_id;
  SELECT COALESCE(SUM(amount), 0) INTO _total_credit_notes FROM credit_notes WHERE customer_id = p_primary_id AND status != 'cancelled';

  UPDATE customers SET
    current_balance = _total_invoiced - _total_paid,
    total_purchases_cached = _total_invoiced,
    invoice_count_cached = (SELECT COUNT(*) FROM invoices WHERE customer_id = p_primary_id)
  WHERE id = p_primary_id;

  -- Delete the duplicate
  DELETE FROM customers WHERE id = p_duplicate_id AND tenant_id = _current_tenant;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم دمج "' || _duplicate.name || '" في "' || _primary.name || '" بنجاح',
    'primary_id', p_primary_id,
    'deleted_id', p_duplicate_id,
    'credit_notes_transferred', _total_credit_notes
  );
END;
$function$;