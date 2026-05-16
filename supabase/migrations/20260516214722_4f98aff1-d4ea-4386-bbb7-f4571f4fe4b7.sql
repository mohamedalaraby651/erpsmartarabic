-- 1) Block authenticated clients from reading raw TOTP secrets via PostgREST.
--    Edge Function `verify-totp` uses the service role which bypasses these grants.
REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM authenticated, anon;

-- 2) Fix broken RLS policies that passed an unsupported 'update' action to
--    check_section_permission (only 'view'/'create'/'edit'/'delete' are valid).

-- invoices_update_policy
DROP POLICY IF EXISTS invoices_update_policy ON public.invoices;
CREATE POLICY invoices_update_policy ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    (tenant_id = get_current_tenant()) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'sales'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR check_section_permission(auth.uid(), 'invoices'::text, 'edit'::text)
    )
  )
  WITH CHECK (tenant_id = get_current_tenant());

-- products_update_policy
DROP POLICY IF EXISTS products_update_policy ON public.products;
CREATE POLICY products_update_policy ON public.products
  FOR UPDATE TO authenticated
  USING (
    (tenant_id = get_current_tenant()) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'warehouse'::app_role)
      OR check_section_permission(auth.uid(), 'products'::text, 'edit'::text)
    )
  )
  WITH CHECK (tenant_id = get_current_tenant());

-- customer_addresses_update_policy
DROP POLICY IF EXISTS customer_addresses_update_policy ON public.customer_addresses;
CREATE POLICY customer_addresses_update_policy ON public.customer_addresses
  FOR UPDATE TO authenticated
  USING (
    (tenant_id = get_current_tenant()) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'sales'::app_role)
      OR check_section_permission(auth.uid(), 'customers'::text, 'edit'::text)
    )
  )
  WITH CHECK (tenant_id = get_current_tenant());

-- customer_addresses_insert_policy (custom-role branch should map to 'create')
DROP POLICY IF EXISTS customer_addresses_insert_policy ON public.customer_addresses;
CREATE POLICY customer_addresses_insert_policy ON public.customer_addresses
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id = get_current_tenant()) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'sales'::app_role)
      OR check_section_permission(auth.uid(), 'customers'::text, 'create'::text)
    )
  );