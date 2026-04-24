CREATE OR REPLACE FUNCTION public.admin_requeue_event(_event_id uuid)
RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  _event_tenant uuid;
  _event_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: not authenticated';
  END IF;
  
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  SELECT tenant_id, status INTO _event_tenant, _event_status
  FROM public.domain_events 
  WHERE id = _event_id;
  
  IF _event_tenant IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  IF _event_tenant <> get_current_tenant() THEN
    RAISE EXCEPTION 'Cross-tenant access denied';
  END IF;
  
  IF _event_status NOT IN ('failed', 'pending') THEN
    RAISE EXCEPTION 'Only failed or pending events can be requeued (current: %)', _event_status;
  END IF;
  
  UPDATE public.domain_events
  SET status = 'pending',
      attempts = 0,
      next_retry_at = now(),
      last_error = NULL
  WHERE id = _event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_requeue_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_requeue_event(uuid) TO authenticated;