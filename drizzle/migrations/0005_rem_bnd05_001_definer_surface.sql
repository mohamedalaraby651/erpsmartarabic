-- REM-BND05-001 — SECURITY DEFINER surface remediation for BND-05 (Tenant -> Data)
-- Scope: R-1 .. R-7 exactly, as classified by CERT-REV-BND05. No other object touched.
-- Authority rule: acting tenant is always public.get_current_tenant() (server-derived).
-- A caller-supplied tenant/user argument may only agree with it, never widen it.
-- Trusted server contexts (auth.uid() IS NULL => service_role / triggers) are unchanged.

-- ============================================================ R-1 void_invoice (CRITICAL)
CREATE OR REPLACE FUNCTION public.void_invoice(_invoice_id uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _inv record;
  _orig_journal record;
  _new_journal_id uuid;
  _new_journal_no text;
  _period_id uuid;
  _line record;
  _ln int := 1;
  _tenant uuid;
  _acting uuid;
BEGIN
  SELECT * INTO _inv FROM public.invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  _tenant := _inv.tenant_id;

  -- REM-BND05-001 / R-1: tenant authorization before any mutation.
  _acting := public.get_current_tenant();
  IF auth.uid() IS NOT NULL AND (_acting IS NULL OR _acting IS DISTINCT FROM _tenant) THEN
    RAISE EXCEPTION 'cross-tenant access denied' USING ERRCODE = '42501';
  END IF;

  IF _inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invoice already cancelled';
  END IF;

  IF _inv.paid_amount > 0 THEN
    RAISE EXCEPTION 'Cannot void invoice with payments. Refund payments first.';
  END IF;

  SELECT * INTO _orig_journal
  FROM public.journals
  WHERE source_type = 'invoice' AND source_id = _invoice_id
    AND tenant_id = _tenant
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT id INTO _period_id
  FROM public.fiscal_periods
  WHERE tenant_id = _tenant
    AND CURRENT_DATE BETWEEN start_date AND end_date
    AND COALESCE(is_closed, false) = false
  LIMIT 1;

  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'No open fiscal period for today';
  END IF;

  IF _orig_journal.id IS NOT NULL THEN
    _new_journal_no := 'REV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

    INSERT INTO public.journals (
      tenant_id, journal_number, journal_date, description,
      fiscal_period_id, source_type, source_id, is_posted, posted_at,
      total_debit, total_credit, created_by
    ) VALUES (
      _tenant, _new_journal_no, CURRENT_DATE,
      'إلغاء الفاتورة ' || _inv.invoice_number || COALESCE(' — ' || _reason, ''),
      _period_id, 'invoice_void', _invoice_id, true, now(),
      _orig_journal.total_credit, _orig_journal.total_debit,
      auth.uid()
    ) RETURNING id INTO _new_journal_id;

    FOR _line IN
      SELECT account_id, debit_amount, credit_amount, memo
      FROM public.journal_entries
      WHERE journal_id = _orig_journal.id
      ORDER BY line_number
    LOOP
      INSERT INTO public.journal_entries (
        tenant_id, journal_id, line_number, account_id,
        debit_amount, credit_amount, memo
      ) VALUES (
        _tenant, _new_journal_id, _ln, _line.account_id,
        COALESCE(_line.credit_amount, 0), COALESCE(_line.debit_amount, 0),
        'عكس: ' || COALESCE(_line.memo, '')
      );
      _ln := _ln + 1;
    END LOOP;
  END IF;

  UPDATE public.invoices
  SET status = 'cancelled',
      rejection_reason = COALESCE(_reason, rejection_reason),
      updated_at = now()
  WHERE id = _invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', _invoice_id,
    'reversing_journal_id', _new_journal_id,
    'reversing_journal_number', _new_journal_no
  );
END;
$function$;

-- ================================================ R-2 find_duplicate_customers (MEDIUM)
CREATE OR REPLACE FUNCTION public.find_duplicate_customers(p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id1 uuid, name1 text, phone1 text, id2 uuid, name2 text, phone2 text, similarity_score double precision, match_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _tenant uuid;
BEGIN
  _tenant := COALESCE(public.get_current_tenant(), p_tenant_id);

  IF _tenant IS NULL THEN
    RETURN;  -- no tenant context => no rows, never a global scan
  END IF;

  IF p_tenant_id IS NOT NULL AND p_tenant_id IS DISTINCT FROM _tenant THEN
    RAISE EXCEPTION 'cross-tenant access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      a.id AS id1, a.name AS name1, a.phone AS phone1,
      b.id AS id2, b.name AS name2, b.phone AS phone2,
      similarity(a.name, b.name)::float AS sim,
      'name'::text AS mtype
    FROM public.customers a
    JOIN public.customers b ON a.id < b.id
    WHERE a.tenant_id = _tenant AND b.tenant_id = _tenant
      AND similarity(a.name, b.name) > 0.5

    UNION ALL

    SELECT
      a.id, a.name, a.phone,
      b.id, b.name, b.phone,
      1.0::float,
      'phone'::text
    FROM public.customers a
    JOIN public.customers b ON a.id < b.id
    WHERE a.tenant_id = _tenant AND b.tenant_id = _tenant
      AND a.phone IS NOT NULL AND a.phone != ''
      AND a.phone = b.phone
      AND similarity(a.name, b.name) <= 0.5
  ) sub
  ORDER BY sub.sim DESC
  LIMIT 50;
END;
$function$;

-- ==================================================== R-3 get_user_tenant_id (LOW)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tenant_id
  FROM public.user_tenants
  WHERE user_id = _user_id
    AND (auth.uid() IS NULL OR _user_id = auth.uid())
  ORDER BY is_default DESC, joined_at ASC
  LIMIT 1
$function$;

-- ====================================================== R-4 get_user_tenants (LOW)
CREATE OR REPLACE FUNCTION public.get_user_tenants(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tenant_id
  FROM public.user_tenants
  WHERE user_id = _user_id
    AND (auth.uid() IS NULL OR _user_id = auth.uid())
$function$;

-- ======================================================= R-5 is_period_closed (LOW)
CREATE OR REPLACE FUNCTION public.is_period_closed(_tenant_id uuid, _date date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _acting uuid;
BEGIN
  _acting := public.get_current_tenant();
  IF auth.uid() IS NOT NULL AND _acting IS DISTINCT FROM _tenant_id THEN
    RAISE EXCEPTION 'cross-tenant access denied' USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.fiscal_periods
    WHERE tenant_id IS NOT DISTINCT FROM _tenant_id
      AND _date BETWEEN start_date AND end_date
      AND is_closed = true
  );
END;
$function$;

-- ======================================= R-6 is_admin_equivalent_custom_role (LOW)
CREATE OR REPLACE FUNCTION public.is_admin_equivalent_custom_role(_role_id uuid, _tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _acting uuid;
BEGIN
  _acting := public.get_current_tenant();
  IF auth.uid() IS NOT NULL AND _acting IS DISTINCT FROM _tenant_id THEN
    RAISE EXCEPTION 'cross-tenant access denied' USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_section_permissions rsp
    JOIN public.custom_roles cr ON cr.id = rsp.role_id
    WHERE rsp.role_id = _role_id
      AND cr.tenant_id = _tenant_id
      AND rsp.can_delete = true
      AND rsp.section IN ('users','roles','tenants','accounting','settings')
  );
END;
$function$;

-- =========================== R-7 check_financial_limit (4-arg overload only) (LOW)
CREATE OR REPLACE FUNCTION public.check_financial_limit(_user_id uuid, _tenant uuid, _limit_type text, _amount numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role_id uuid;
  _max_value numeric;
  _acting uuid;
BEGIN
  IF _user_id IS NULL OR _tenant IS NULL THEN RETURN FALSE; END IF;

  _acting := public.get_current_tenant();
  IF auth.uid() IS NOT NULL AND (_acting IS DISTINCT FROM _tenant OR _user_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'cross-tenant access denied' USING ERRCODE = '42501';
  END IF;

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
$function$;

-- ------------------------------------------------------------ grant surface
REVOKE ALL ON FUNCTION public.void_invoice(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_duplicate_customers(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_tenants(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_period_closed(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_equivalent_custom_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_financial_limit(uuid, uuid, text, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.void_invoice(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_duplicate_customers(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tenants(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_period_closed(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_equivalent_custom_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_financial_limit(uuid, uuid, text, numeric) TO authenticated, service_role;