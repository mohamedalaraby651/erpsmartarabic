-- POSTF1_SCOPE_001 Unit A: server-derived tenant notification RPC + INSERT revocation

CREATE OR REPLACE FUNCTION public.create_tenant_notification(
  target_user_id uuid,
  title text,
  message text,
  notification_type text DEFAULT 'info',
  link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  _tenant := public.get_current_tenant();
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'no tenant context' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = target_user_id AND ut.tenant_id = _tenant
  ) THEN
    RAISE EXCEPTION 'target user is not a member of the caller tenant' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (user_id, tenant_id, title, message, type, link, is_read)
  VALUES (target_user_id, _tenant, title, message, COALESCE(notification_type, 'info'), link, false)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE INSERT ON public.notifications FROM authenticated;
REVOKE INSERT ON public.notifications FROM anon;

REVOKE ALL ON FUNCTION public.create_tenant_notification(uuid,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_tenant_notification(uuid,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_notification(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_notification(uuid,text,text,text,text) TO service_role;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;