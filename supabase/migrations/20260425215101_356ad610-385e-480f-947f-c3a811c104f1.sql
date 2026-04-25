
-- Fix check_financial_limit: use role_id (correct column)
CREATE OR REPLACE FUNCTION public.check_financial_limit(
  _user_id uuid,
  _tenant uuid,
  _limit_type text,
  _amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_id uuid;
  _max_value numeric;
BEGIN
  IF _user_id IS NULL OR _tenant IS NULL THEN RETURN FALSE; END IF;
  
  SELECT custom_role_id INTO _role_id 
  FROM public.user_roles
  WHERE user_id = _user_id AND tenant_id = _tenant
  ORDER BY created_at DESC LIMIT 1;
  
  IF _role_id IS NULL THEN RETURN TRUE; END IF;
  
  SELECT
    CASE _limit_type
      WHEN 'discount' THEN max_discount_percentage
      WHEN 'credit' THEN max_credit_limit
      WHEN 'invoice' THEN max_invoice_amount
      ELSE NULL
    END
  INTO _max_value
  FROM public.role_limits
  WHERE role_id = _role_id AND tenant_id = _tenant
  LIMIT 1;
  
  IF _max_value IS NULL THEN RETURN TRUE; END IF;
  RETURN _amount <= _max_value;
END;
$$;

-- permission_matrix_cache: allow admins to read
DROP POLICY IF EXISTS "Admins read tenant cache" ON public.permission_matrix_cache;
CREATE POLICY "Admins read tenant cache" ON public.permission_matrix_cache
FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role));

-- user_tenants: restrict tenant-wide view to admins
DROP POLICY IF EXISTS "Users can view their tenant memberships" ON public.user_tenants;
CREATE POLICY "Users can view their tenant memberships" ON public.user_tenants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(),'admin'::app_role))
);
