-- 1) Fix check_financial_limit (3-arg) to accept the limit-type strings
--    actually used by the RLS policies on invoices and customers.
CREATE OR REPLACE FUNCTION public.check_financial_limit(_user_id uuid, _limit_type text, _value numeric)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tenant UUID;
  _custom_role_id UUID;
  _max_value DECIMAL;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  _tenant := public.get_current_tenant();
  IF _tenant IS NULL THEN
    RETURN false;
  END IF;

  SELECT custom_role_id INTO _custom_role_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (tenant_id = _tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = _tenant) DESC NULLS LAST
  LIMIT 1;

  IF _custom_role_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    CASE _limit_type
      WHEN 'discount'        THEN max_discount_percentage
      WHEN 'credit'          THEN max_credit_limit
      WHEN 'credit_limit'    THEN max_credit_limit
      WHEN 'invoice'         THEN max_invoice_amount
      WHEN 'invoice_amount'  THEN max_invoice_amount
      ELSE NULL
    END
  INTO _max_value
  FROM public.role_limits
  WHERE role_id = _custom_role_id
    AND (tenant_id = _tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = _tenant) DESC NULLS LAST
  LIMIT 1;

  -- If no explicit limit row exists for this role, deny by default for safety
  -- (previously fell back to ~999M which effectively bypassed limits).
  IF _max_value IS NULL THEN
    RETURN false;
  END IF;

  RETURN _value <= _max_value;
END;
$function$;

-- 2) Prevent tenant admins from granting the 'admin' role via INSERT.
--    Only platform admins may create new tenant admins.
DROP POLICY IF EXISTS user_roles_insert_admin_tenant ON public.user_roles;

CREATE POLICY user_roles_insert_admin_tenant
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_tenant_member(user_id, tenant_id)
  -- Critical: tenant admins cannot promote other users to admin.
  AND role <> 'admin'::app_role
);

-- Allow platform admins to assign any role (including admin) to tenant members.
CREATE POLICY user_roles_insert_platform_admin
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  AND public.is_tenant_member(user_id, tenant_id)
);

-- Apply the same restriction to UPDATE so admins cannot escalate an
-- existing role row to 'admin' as a workaround.
DROP POLICY IF EXISTS user_roles_update_admin_tenant ON public.user_roles;

CREATE POLICY user_roles_update_admin_tenant
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND role <> 'admin'::app_role
);

CREATE POLICY user_roles_update_platform_admin
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));