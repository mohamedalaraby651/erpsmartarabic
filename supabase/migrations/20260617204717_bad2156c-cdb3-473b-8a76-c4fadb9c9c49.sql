CREATE OR REPLACE FUNCTION public.check_financial_limit(
  _user_id uuid,
  _limit_type text,
  _value numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _custom_role_id uuid;
  _max_amount numeric;
BEGIN
  SELECT custom_role_id INTO _custom_role_id
  FROM public.profiles
  WHERE id = _user_id;

  IF _custom_role_id IS NULL THEN
    RETURN true;
  END IF;

  IF _limit_type = 'invoice' THEN
    SELECT max_invoice_amount INTO _max_amount
    FROM public.role_limits
    WHERE role_id = _custom_role_id;
  ELSIF _limit_type = 'credit' THEN
    SELECT max_credit_limit INTO _max_amount
    FROM public.role_limits
    WHERE role_id = _custom_role_id;
  ELSE
    RETURN true;
  END IF;

  IF _max_amount IS NULL OR _max_amount = 0 THEN
    RETURN true;
  END IF;

  RETURN _value <= _max_amount;
END;
$$;

REVOKE SELECT (secret_key, secret_encrypted, backup_codes)
  ON public.user_2fa_settings FROM authenticated;
REVOKE SELECT (secret_key, secret_encrypted, backup_codes)
  ON public.user_2fa_settings FROM anon;