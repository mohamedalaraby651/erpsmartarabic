CREATE OR REPLACE FUNCTION public.cancel_credit_note(p_credit_note_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_user uuid;
  v_role text;
  v_cn record;
  v_item record;
  v_wh uuid;
  v_journal_result jsonb;
BEGIN
  v_user := auth.uid();
  v_tenant := public.get_current_tenant();
  IF v_user IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT role::text INTO v_role FROM public.user_roles
  WHERE user_id = v_user AND (tenant_id = v_tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = v_tenant) DESC NULLS LAST LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT * INTO v_cn FROM public.credit_notes
  WHERE id = p_credit_note_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit note not found'; END IF;
  IF v_cn.status = 'cancelled' THEN RAISE EXCEPTION 'Already cancelled'; END IF;

  IF v_cn.status = 'confirmed' THEN
    UPDATE public.customers
    SET current_balance = COALESCE(current_balance, 0) + v_cn.amount, updated_at = now()
    WHERE id = v_cn.customer_id AND tenant_id = v_tenant;

    UPDATE public.invoices
    SET paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount),
        payment_status = (CASE
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) >= COALESCE(total_amount, 0) THEN 'paid'
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) > 0 THEN 'partial'
          ELSE 'pending'
        END)::public.payment_status,
        updated_at = now()
    WHERE id = v_cn.invoice_id AND tenant_id = v_tenant;

    SELECT id INTO v_wh FROM public.warehouses
    WHERE tenant_id = v_tenant AND is_active = true ORDER BY created_at ASC LIMIT 1;

    IF v_wh IS NOT NULL THEN
      FOR v_item IN SELECT product_id, variant_id, quantity FROM public.credit_note_items WHERE credit_note_id = p_credit_note_id LOOP
        UPDATE public.product_stock
        SET quantity = GREATEST(0, quantity - v_item.quantity::int), updated_at = now()
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_wh
          AND tenant_id = v_tenant
          AND COALESCE(variant_id::text, '') = COALESCE(v_item.variant_id::text, '');

        INSERT INTO public.stock_movements (
          product_id, variant_id, from_warehouse_id, movement_type, quantity,
          reference_type, reference_id, tenant_id, created_by, notes
        ) VALUES (
          v_item.product_id, v_item.variant_id, v_wh, 'out', v_item.quantity::int,
          'credit_note_cancel', p_credit_note_id, v_tenant, v_user,
          'Reverse of cancelled credit note'
        );
      END LOOP;
    END IF;

    BEGIN
      v_journal_result := public.reverse_journal_for_credit_note(p_credit_note_id);
    EXCEPTION WHEN OTHERS THEN
      v_journal_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;
  END IF;

  UPDATE public.credit_notes SET status = 'cancelled', updated_at = now()
  WHERE id = p_credit_note_id;

  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'journal', v_journal_result
  );
END;
$function$;

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
  IF auth.uid() IS NULL THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  ELSIF _user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
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

CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _endpoint text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _config RECORD;
    _current RECORD;
    _now TIMESTAMPTZ := now();
    _tokens_to_add INTEGER;
    _new_tokens INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  ELSIF _user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
    SELECT * INTO _config
    FROM rate_limit_config
    WHERE endpoint = _endpoint
    AND is_active = true
    ORDER BY tier = 'default' ASC
    LIMIT 1;
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    SELECT * INTO _current
    FROM rate_limits
    WHERE user_id = _user_id AND endpoint = _endpoint;
    IF NOT FOUND THEN
        INSERT INTO rate_limits (user_id, tenant_id, endpoint, tokens_remaining, last_refill)
        VALUES (_user_id, public.get_current_tenant(), _endpoint, _config.max_requests - 1, _now);
        RETURN true;
    END IF;
    _tokens_to_add := FLOOR(
        EXTRACT(EPOCH FROM (_now - _current.last_refill)) /
        _config.window_seconds * _config.max_requests
    );
    _new_tokens := LEAST(_config.max_requests, _current.tokens_remaining + _tokens_to_add);
    IF _new_tokens <= 0 THEN
        RETURN false;
    END IF;
    UPDATE rate_limits
    SET
        tokens_remaining = _new_tokens - 1,
        last_refill = CASE WHEN _tokens_to_add > 0 THEN _now ELSE last_refill END
    WHERE user_id = _user_id AND endpoint = _endpoint;
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_section_permission(_user_id uuid, _section text, _action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _custom_role_id uuid;
  _has_perm boolean;
  _current_tenant uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN RETURN false; END IF;
  ELSIF _user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;
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
      AND rsp.section = _section
      AND (
        (_action = 'view'   AND rsp.can_view   = true) OR
        (_action = 'create' AND rsp.can_create = true) OR
        (_action = 'edit'   AND rsp.can_edit   = true) OR
        (_action = 'delete' AND rsp.can_delete = true)
      )
  ) INTO _has_perm;

  RETURN COALESCE(_has_perm, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_sod_violation(_user_id uuid, _section text, _action text, _entity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _violation RECORD;
    _tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  ELSIF _user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
    _tenant_id := get_current_tenant();
    FOR _violation IN
        SELECT sr.* FROM sod_rules sr
        WHERE sr.is_active = true
        AND (sr.tenant_id = _tenant_id OR sr.tenant_id IS NULL)
        AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(sr.conflicting_actions) ca
            WHERE ca->>'section' = _section AND ca->>'action' = _action
        )
    LOOP
        IF EXISTS (
            SELECT 1 FROM activity_logs al
            CROSS JOIN jsonb_array_elements(_violation.conflicting_actions) ca
            WHERE al.user_id = _user_id
            AND al.entity_id = _entity_id::TEXT
            AND al.entity_type = ca->>'section'
            AND al.action = ca->>'action'
            AND NOT (ca->>'section' = _section AND ca->>'action' = _action)
        ) THEN
            RETURN jsonb_build_object(
                'violated', true,
                'rule_id', _violation.id,
                'rule_name', _violation.name,
                'message', 'لا يمكنك تنفيذ هذا الإجراء بسبب قواعد فصل المهام: ' || _violation.name
            );
        END IF;
    END LOOP;
    RETURN jsonb_build_object('violated', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.compute_permission_matrix(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_admin BOOLEAN;
  _custom_role_id UUID;
  _matrix JSONB := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  ELSIF _user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  _is_admin := has_role(_user_id, 'admin');
  IF _is_admin THEN
    RETURN jsonb_build_object('is_admin', true, 'sections', '*'::jsonb);
  END IF;

  SELECT custom_role_id INTO _custom_role_id FROM user_roles WHERE user_id = _user_id LIMIT 1;
  IF _custom_role_id IS NULL THEN
    RETURN jsonb_build_object('is_admin', false, 'sections', '{}'::jsonb);
  END IF;

  SELECT jsonb_object_agg(
    section,
    jsonb_build_object('view', can_view, 'create', can_create, 'edit', can_edit, 'delete', can_delete)
  ) INTO _matrix
  FROM role_section_permissions WHERE role_id = _custom_role_id;

  RETURN jsonb_build_object('is_admin', false, 'role_id', _custom_role_id, 'sections', COALESCE(_matrix, '{}'::jsonb));
END;
$function$;

CREATE OR REPLACE FUNCTION public.convert_invoice_to_delivery(p_invoice_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant UUID;
  v_inv RECORD;
  v_dn_id UUID;
  v_existing UUID;
  v_warehouse UUID;
  v_item_count INT;
BEGIN
  IF NOT public.check_section_permission(auth.uid(), 'sales', 'create') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  v_tenant := public.get_current_tenant();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant context'; END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT id INTO v_existing FROM public.delivery_notes WHERE invoice_id = p_invoice_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Delivery already exists for this invoice: %', v_existing;
  END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.invoice_items WHERE invoice_id = p_invoice_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Cannot create delivery: invoice has no items';
  END IF;

  v_warehouse := p_warehouse_id;
  IF v_warehouse IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id = v_warehouse AND tenant_id = v_tenant) THEN
    RAISE EXCEPTION 'Warehouse not found in current tenant' USING ERRCODE = '42501';
  END IF;
  IF v_warehouse IS NULL THEN
    SELECT id INTO v_warehouse FROM public.warehouses
      WHERE tenant_id = v_tenant AND is_active = true
      ORDER BY created_at ASC LIMIT 1;
    IF v_warehouse IS NULL THEN
      RAISE EXCEPTION 'No active warehouse available for delivery';
    END IF;
  END IF;

  INSERT INTO public.delivery_notes (tenant_id, delivery_number, invoice_id, customer_id,
                                     warehouse_id, status, notes, created_by, delivery_date)
  VALUES (v_tenant,
          'DN-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6),
          p_invoice_id, v_inv.customer_id, v_warehouse, 'draft', v_inv.notes, auth.uid(), CURRENT_DATE)
  RETURNING id INTO v_dn_id;

  INSERT INTO public.delivery_note_items (tenant_id, delivery_note_id, product_id, variant_id,
                                          quantity, unit_price, notes)
  SELECT v_tenant, v_dn_id, product_id, variant_id, quantity, unit_price, notes
  FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  RETURN v_dn_id;
END $function$;

CREATE OR REPLACE FUNCTION public.create_journal_reversal(_original_journal_id uuid, _reason text, _reversal_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid := public.get_current_tenant();
  _orig public.journals%ROWTYPE;
  _new_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لعكس القيود.' USING ERRCODE = '42501';
  END IF;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'لا يوجد سياق tenant صالح.' USING ERRCODE = 'P0001'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'يجب توفير سبب واضح للعكس (5 أحرف على الأقل).' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO _orig FROM public.journals WHERE id = _original_journal_id AND tenant_id = _tenant;
  IF _orig.id IS NULL THEN RAISE EXCEPTION 'القيد الأصلي غير موجود.' USING ERRCODE = 'P0002'; END IF;
  IF _orig.is_posted <> true THEN RAISE EXCEPTION 'لا يمكن عكس قيد غير مُرحَّل.' USING ERRCODE = 'P0001'; END IF;
  IF _orig.reversed_by_journal_id IS NOT NULL THEN RAISE EXCEPTION 'هذا القيد سبق عكسه.' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.journals (
    tenant_id, fiscal_period_id, journal_number, journal_date, description,
    is_posted, posted_at, created_by, source_type, source_id,
    total_debit, total_credit, reverses_journal_id
  ) VALUES (
    _tenant, _orig.fiscal_period_id, 'REV-' || _orig.journal_number,
    COALESCE(_reversal_date, CURRENT_DATE),
    'عكس قيد ' || _orig.journal_number || ' — ' || _reason,
    true, now(), auth.uid(), 'reversal', _orig.id,
    _orig.total_credit, _orig.total_debit, _orig.id
  ) RETURNING id INTO _new_id;

  INSERT INTO public.journal_entries (journal_id, account_id, line_number, debit_amount, credit_amount, memo, tenant_id)
  SELECT _new_id, account_id, line_number, credit_amount, debit_amount,
         'عكس: ' || COALESCE(memo, ''), _tenant
  FROM public.journal_entries WHERE journal_id = _orig.id ORDER BY line_number;

  UPDATE public.journals SET reversed_by_journal_id = _new_id WHERE id = _orig.id;

  INSERT INTO public.journal_reversals (tenant_id, original_journal_id, reversal_journal_id, reason, reversed_by)
  VALUES (_tenant, _orig.id, _new_id, _reason, auth.uid());

  RETURN _new_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.atomic_customer_balance_update(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atomic_supplier_balance_update(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_customer_balance_update(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_supplier_balance_update(uuid, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_employee_self_salary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.base_salary IS DISTINCT FROM OLD.base_salary
     AND (OLD.user_id = auth.uid() OR NEW.user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'لا يمكنك تعديل راتبك بنفسك؛ يلزم مدير النظام.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_employee_self_salary ON public.employees;
CREATE TRIGGER trg_guard_employee_self_salary BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.guard_employee_self_salary();