
-- =================================================================
-- P0 SECURITY FIX 1 — Cross-Tenant Privilege Escalation
-- =================================================================

ALTER TABLE public.user_roles 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.user_roles ur
SET tenant_id = ut.tenant_id
FROM public.user_tenants ut
WHERE ur.user_id = ut.user_id
  AND ur.tenant_id IS NULL;

UPDATE public.user_roles
SET tenant_id = 'a0000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.user_roles 
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant();

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_tenant_key;
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_role_tenant_key UNIQUE (user_id, role, tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user 
  ON public.user_roles(tenant_id, user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND tenant_id = public.get_current_tenant()
  );
$$;

CREATE OR REPLACE FUNCTION public.check_section_permission(
  _user_id uuid, 
  _section text, 
  _action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _custom_role_id uuid;
  _has_perm boolean;
  _current_tenant uuid;
BEGIN
  _current_tenant := public.get_current_tenant();

  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;

  SELECT custom_role_id INTO _custom_role_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND tenant_id = _current_tenant
  LIMIT 1;

  IF _custom_role_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.role_section_permissions rsp
    JOIN public.custom_roles cr ON cr.id = rsp.role_id
    WHERE rsp.role_id = _custom_role_id
      AND cr.tenant_id = _current_tenant
      AND rsp.section_key = _section
      AND (
        (_action = 'view' AND rsp.can_view = true) OR
        (_action = 'create' AND rsp.can_create = true) OR
        (_action = 'edit' AND rsp.can_edit = true) OR
        (_action = 'delete' AND rsp.can_delete = true)
      )
  ) INTO _has_perm;

  RETURN COALESCE(_has_perm, false);
END;
$$;
