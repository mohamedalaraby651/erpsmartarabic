CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_tenants
  WHERE user_id = _user_id
  ORDER BY is_default DESC, joined_at ASC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated, anon, service_role;