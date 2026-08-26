REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM authenticated;
REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM anon;
REVOKE ALL ON public.user_2fa_settings FROM anon;
GRANT ALL ON public.user_2fa_settings TO service_role;