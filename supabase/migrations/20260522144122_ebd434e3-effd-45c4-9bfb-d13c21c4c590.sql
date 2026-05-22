
-- Add is_active flag to profiles for enable/disable users (UI gate)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Admin can update is_active on tenant users
DROP POLICY IF EXISTS "Admins can update tenant profile activation" ON public.profiles;
CREATE POLICY "Admins can update tenant profile activation"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND id IN (SELECT user_id FROM public.user_tenants WHERE tenant_id = public.get_current_tenant())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND id IN (SELECT user_id FROM public.user_tenants WHERE tenant_id = public.get_current_tenant())
);

-- RPC to toggle user activation (admin-only, same-tenant)
CREATE OR REPLACE FUNCTION public.admin_set_user_active(_user_id uuid, _active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
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

  UPDATE public.profiles SET is_active = _active, updated_at = now() WHERE id = _user_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
