DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.post_document_atomic(text,text,uuid,jsonb)'::regprocedure);
  IF position('AND status = ''open''' in d) = 0 THEN RAISE EXCEPTION 'pattern not found'; END IF;
  d := replace(d, 'AND status = ''open''', 'AND NOT is_closed');
  EXECUTE d;
END $do$;

CREATE OR REPLACE FUNCTION public.atomic_customer_balance_update(_customer_id uuid, _amount numeric, _tenant_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _t uuid;
BEGIN
  _t := CASE WHEN auth.uid() IS NULL THEN _tenant_id ELSE public.get_current_tenant() END;
  IF _t IS NULL THEN RAISE EXCEPTION 'No tenant context' USING ERRCODE = '42501'; END IF;
  UPDATE customers SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _customer_id AND tenant_id = _t;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found in current tenant' USING ERRCODE = '42501'; END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.atomic_customer_balance_update(uuid,numeric,uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_customer_balance_update(uuid,numeric,uuid) TO service_role;