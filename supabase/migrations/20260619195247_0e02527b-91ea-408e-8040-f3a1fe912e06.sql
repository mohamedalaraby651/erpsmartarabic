
-- Fix 1: 3-arg check_financial_limit was reading a non-existent profiles.custom_role_id column,
-- so financial caps were never enforced. Rewrite to read from user_roles (correct source).
CREATE OR REPLACE FUNCTION public.check_financial_limit(_user_id uuid, _limit_type text, _value numeric)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid;
  _role_id uuid;
  _max_amount numeric;
  _norm text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  _tenant := public.get_current_tenant();

  SELECT custom_role_id INTO _role_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (_tenant IS NULL OR tenant_id = _tenant)
  ORDER BY created_at DESC
  LIMIT 1;

  IF _role_id IS NULL THEN
    RETURN true;
  END IF;

  _norm := CASE
    WHEN _limit_type IN ('invoice', 'invoice_amount') THEN 'invoice'
    WHEN _limit_type IN ('credit', 'credit_limit')   THEN 'credit'
    WHEN _limit_type IN ('discount')                 THEN 'discount'
    ELSE NULL
  END;

  IF _norm IS NULL THEN
    RETURN true;
  END IF;

  SELECT
    CASE _norm
      WHEN 'invoice'  THEN max_invoice_amount
      WHEN 'credit'   THEN max_credit_limit
      WHEN 'discount' THEN max_discount_percentage
    END
  INTO _max_amount
  FROM public.role_limits
  WHERE role_id = _role_id
    AND (_tenant IS NULL OR tenant_id = _tenant)
  LIMIT 1;

  IF _max_amount IS NULL OR _max_amount = 0 THEN
    RETURN true;
  END IF;

  RETURN _value <= _max_amount;
END;
$function$;

-- Fix 2: TOTP secret_key, secret_encrypted, and backup_codes must never be readable
-- via PostgREST. Only the verify-totp Edge Function (service_role) needs them.
-- Revoke column-level SELECT for client roles; row-level access to safe columns remains.
REVOKE SELECT (secret_key, secret_encrypted, backup_codes)
  ON public.user_2fa_settings FROM authenticated;
REVOKE SELECT (secret_key, secret_encrypted, backup_codes)
  ON public.user_2fa_settings FROM anon;
-- service_role retains full access (used by Edge Functions).
GRANT ALL ON public.user_2fa_settings TO service_role;
