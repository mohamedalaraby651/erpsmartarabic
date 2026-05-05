-- ============================================================
-- PART 1: Fix critical RLS logic bugs
-- ============================================================

-- 1.1 Fix broken UPDATE policies (action 'update' → 'edit')
DROP POLICY IF EXISTS customers_update_policy ON public.customers;
CREATE POLICY customers_update_policy ON public.customers
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'customers', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'customers', 'edit'));

DROP POLICY IF EXISTS quotations_update_policy ON public.quotations;
CREATE POLICY quotations_update_policy ON public.quotations
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'quotations', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'quotations', 'edit'));

DROP POLICY IF EXISTS employees_update_policy ON public.employees;
CREATE POLICY employees_update_policy ON public.employees
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'employees', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'employees', 'edit'));

DROP POLICY IF EXISTS sales_orders_update_policy ON public.sales_orders;
CREATE POLICY sales_orders_update_policy ON public.sales_orders
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales_orders', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales_orders', 'edit'));

DROP POLICY IF EXISTS suppliers_update_policy ON public.suppliers;
CREATE POLICY suppliers_update_policy ON public.suppliers
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'suppliers', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'suppliers', 'edit'));

-- 1.2 Privilege escalation: prevent custom roles with delete on sensitive sections
CREATE OR REPLACE FUNCTION public.is_admin_equivalent_custom_role(_role_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_section_permissions rsp
    JOIN public.custom_roles cr ON cr.id = rsp.role_id
    WHERE rsp.role_id = _role_id
      AND cr.tenant_id = _tenant_id
      AND rsp.can_delete = true
      AND rsp.section IN ('users','roles','tenants','accounting','settings')
    LIMIT 1
  );
$$;

DROP POLICY IF EXISTS user_roles_insert_admin_tenant ON public.user_roles;
CREATE POLICY user_roles_insert_admin_tenant ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant()
    AND has_role(auth.uid(), 'admin'::app_role)
    AND is_tenant_member(user_id, tenant_id)
    AND role <> 'admin'::app_role
    AND (custom_role_id IS NULL OR NOT is_admin_equivalent_custom_role(custom_role_id, tenant_id))
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = user_roles.user_id AND ur.tenant_id = user_roles.tenant_id
    )
  );

-- 1.3 Notifications: enforce strict tenant isolation on INSERT (use user_tenants join)
DROP POLICY IF EXISTS "System or admin can create notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_safe ON public.notifications;
CREATE POLICY notifications_insert_tenant_safe ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant()
    AND (
      user_id = auth.uid()
      OR (
        has_role(auth.uid(), 'admin'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.user_tenants ut
          WHERE ut.user_id = notifications.user_id
            AND ut.tenant_id = get_current_tenant()
        )
      )
    )
  );

-- ============================================================
-- PART 2: TOTP secret encryption (pgcrypto)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.user_2fa_settings
  ADD COLUMN IF NOT EXISTS secret_encrypted bytea;

DO $$
DECLARE
  _key text;
BEGIN
  _key := COALESCE(current_setting('app.totp_master_key', true), '');
  IF _key = '' THEN
    _key := encode(digest('lovable_totp_v1_' || current_database(), 'sha256'), 'hex');
  END IF;
  UPDATE public.user_2fa_settings
  SET secret_encrypted = pgp_sym_encrypt(secret_key, _key)
  WHERE secret_key IS NOT NULL AND secret_encrypted IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(_user_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _enc bytea;
  _key text;
BEGIN
  SELECT secret_encrypted INTO _enc FROM public.user_2fa_settings WHERE user_id = _user_id LIMIT 1;
  IF _enc IS NULL THEN RETURN NULL; END IF;
  _key := COALESCE(current_setting('app.totp_master_key', true), '');
  IF _key = '' THEN
    _key := encode(digest('lovable_totp_v1_' || current_database(), 'sha256'), 'hex');
  END IF;
  RETURN pgp_sym_decrypt(_enc, _key);
END $$;

REVOKE ALL ON FUNCTION public.decrypt_totp_secret(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- PART 3: customers_safe masked view (matches actual schema)
-- ============================================================
DROP VIEW IF EXISTS public.customers_safe;
CREATE VIEW public.customers_safe
WITH (security_invoker = true)
AS
SELECT
  c.id, c.tenant_id, c.name, c.customer_type, c.vip_level, c.category_id,
  c.governorate, c.city,
  c.current_balance, c.credit_limit, c.discount_percentage,
  c.payment_terms_days, c.preferred_payment_method,
  c.tax_number, c.is_active, c.image_url,
  c.contact_person, c.contact_person_role,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR check_section_permission(auth.uid(), 'customers', 'edit')
    THEN c.phone
    ELSE CASE WHEN c.phone IS NULL THEN NULL ELSE repeat('*', GREATEST(length(c.phone) - 4, 0)) || right(c.phone, 4) END
  END AS phone,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR check_section_permission(auth.uid(), 'customers', 'edit')
    THEN c.phone2
    ELSE CASE WHEN c.phone2 IS NULL THEN NULL ELSE repeat('*', GREATEST(length(c.phone2) - 4, 0)) || right(c.phone2, 4) END
  END AS phone2,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR check_section_permission(auth.uid(), 'customers', 'edit')
    THEN c.email
    ELSE CASE
      WHEN c.email IS NULL OR position('@' in c.email) = 0 THEN NULL
      ELSE left(c.email, 1) || '***@' || split_part(c.email, '@', 2)
    END
  END AS email,
  c.notes, c.created_at, c.updated_at, c.last_activity_at, c.last_transaction_date
FROM public.customers c
WHERE c.tenant_id = get_current_tenant();

GRANT SELECT ON public.customers_safe TO authenticated;

-- ============================================================
-- PART 4: Revoke EXECUTE on internal trigger/helper functions from clients
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'auto_assign_default_tenant',
        'prevent_posted_expense_mutation',
        'emit_invoice_approved'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;',
                   r.name, r.args);
  END LOOP;
END $$;
