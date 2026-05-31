
-- 1) Hide sensitive 2FA columns from authenticated role (PostgREST cannot read them)
REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM authenticated;

-- 2) Fix check_financial_limit: when user has no custom role, no custom limit applies → allow
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

  -- No custom role assigned → no custom financial limit applies; rely on section permission check
  IF _custom_role_id IS NULL THEN
    RETURN true;
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
  WHERE custom_role_id = _custom_role_id;

  -- No limit row or NULL max means unlimited
  IF _max_value IS NULL THEN
    RETURN true;
  END IF;

  RETURN _value <= _max_value;
END;
$function$;

-- 3) Restrict quotes SELECT policy to authenticated role only
DROP POLICY IF EXISTS "tenant_quotes_select" ON public.quotes;
CREATE POLICY "tenant_quotes_select" ON public.quotes
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant());

-- 4) Tighten logo storage policies: require tenant-prefixed path
DROP POLICY IF EXISTS "Admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete logos" ON storage.objects;

CREATE POLICY "Admins can upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND public.has_role(auth.uid(), 'admin')
    AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  );

CREATE POLICY "Admins can update logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND public.has_role(auth.uid(), 'admin')
    AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND public.has_role(auth.uid(), 'admin')
    AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  );

CREATE POLICY "Admins can delete logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos'
    AND public.has_role(auth.uid(), 'admin')
    AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  );

-- 5) Remove tenant_pdf_profiles from realtime publication (no client subscribes; prevents cross-tenant broadcast leakage)
ALTER PUBLICATION supabase_realtime DROP TABLE public.tenant_pdf_profiles;
