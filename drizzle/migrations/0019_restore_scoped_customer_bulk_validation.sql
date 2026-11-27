CREATE OR REPLACE FUNCTION public.batch_validate_delete(p_ids uuid[])
RETURNS TABLE(customer_id uuid, customer_name text, open_invoice_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid := public.get_current_tenant();
BEGIN
  IF _user_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Authentication and company membership required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.check_section_permission(_user_id, 'customers', 'delete') THEN
    RAISE EXCEPTION 'Customer deletion permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, c.name, COUNT(i.id)
    FROM public.customers c
    JOIN public.invoices i ON i.customer_id = c.id AND i.tenant_id = _tenant_id
    WHERE c.id = ANY(p_ids)
      AND c.tenant_id = _tenant_id
      AND i.payment_status IN ('pending', 'partial')
    GROUP BY c.id, c.name
    HAVING COUNT(i.id) > 0;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.batch_validate_delete(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.batch_validate_delete(uuid[]) TO authenticated, service_role;