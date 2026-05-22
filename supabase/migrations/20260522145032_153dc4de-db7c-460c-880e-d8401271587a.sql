
CREATE OR REPLACE FUNCTION public.admin_set_user_active(_user_id uuid, _active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  v_tenant := public.get_current_tenant();
  IF NOT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'user not in current tenant';
  END IF;

  IF _user_id = auth.uid() AND _active = false THEN
    RAISE EXCEPTION 'cannot deactivate yourself';
  END IF;

  UPDATE public.profiles
     SET is_active = _active, updated_at = now()
   WHERE id = _user_id
  RETURNING full_name INTO v_name;

  INSERT INTO public.activity_logs
    (user_id, action, entity_type, entity_id, entity_name, new_values, tenant_id)
  VALUES
    (auth.uid(),
     CASE WHEN _active THEN 'user_activated' ELSE 'user_deactivated' END,
     'user', _user_id, v_name,
     jsonb_build_object('is_active', _active),
     v_tenant);

  RETURN true;
END;
$$;
