-- 1) Ensure SALES_RETURNS posting account mapping helper
CREATE OR REPLACE FUNCTION public.ensure_credit_note_posting_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_acct_id uuid;
BEGIN
  v_tenant := public.get_current_tenant();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;

  -- Sales Returns account (contra-revenue)
  SELECT id INTO v_acct_id FROM public.chart_of_accounts
  WHERE code = '4100' AND (tenant_id = v_tenant OR tenant_id IS NULL) LIMIT 1;

  IF v_acct_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (code, name, name_en, account_type, normal_balance, tenant_id, description)
    VALUES ('4100', 'مرتجعات المبيعات', 'Sales Returns', 'revenue', 'debit', v_tenant, 'حساب عكسي للإيرادات يخصم من المبيعات')
    RETURNING id INTO v_acct_id;
  END IF;

  INSERT INTO public.posting_account_map (tenant_id, posting_key, account_id, description)
  VALUES (v_tenant, 'SALES_RETURNS', v_acct_id, 'مرتجعات المبيعات')
  ON CONFLICT (tenant_id, posting_key) DO UPDATE SET account_id = EXCLUDED.account_id, updated_at = now();

  RETURN jsonb_build_object('success', true, 'sales_returns_account_id', v_acct_id);
END;
$$;

-- 2) Reverse stock for credit note (return items to inventory)
CREATE OR REPLACE FUNCTION public.reverse_stock_for_credit_note(_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cn RECORD;
  _item RECORD;
  _count int := 0;
BEGIN
  SELECT * INTO _cn FROM public.credit_notes WHERE id = _credit_note_id;
  IF _cn.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;

  FOR _item IN
    SELECT product_id, variant_id, quantity FROM public.credit_note_items WHERE credit_note_id = _credit_note_id
  LOOP
    -- Increase product stock
    UPDATE public.products
    SET stock_quantity = COALESCE(stock_quantity, 0) + _item.quantity,
        updated_at = now()
    WHERE id = _item.product_id AND tenant_id = _cn.tenant_id;

    -- If variant tracked
    IF _item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock_quantity = COALESCE(stock_quantity, 0) + _item.quantity,
          updated_at = now()
      WHERE id = _item.variant_id;
    END IF;

    -- Log movement (best-effort)
    BEGIN
      INSERT INTO public.stock_movements (tenant_id, product_id, variant_id, movement_type, quantity, reference_type, reference_id, notes)
      VALUES (_cn.tenant_id, _item.product_id, _item.variant_id, 'return_in', _item.quantity, 'credit_note', _credit_note_id,
              'مرتجع رقم: ' || _cn.credit_note_number);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'items_returned', _count);
END;
$$;

-- 3) Create reverse journal for credit note
CREATE OR REPLACE FUNCTION public.create_journal_for_credit_note(_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cn RECORD;
  _period_id uuid;
  _journal_id uuid;
  _ar_acct uuid; _ret_acct uuid;
  _line_no int := 1;
  _cn_date date;
BEGIN
  IF EXISTS (SELECT 1 FROM public.journals WHERE source_type = 'credit_note' AND source_id = _credit_note_id) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'journal_exists');
  END IF;

  SELECT cn.*, cn.created_at::date AS cn_date INTO _cn
  FROM public.credit_notes cn WHERE cn.id = _credit_note_id;

  IF _cn.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'credit_note_not_found');
  END IF;
  IF _cn.status <> 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'credit_note_not_confirmed');
  END IF;

  _cn_date := _cn.cn_date;

  -- Find open fiscal period
  SELECT id INTO _period_id FROM public.fiscal_periods
  WHERE tenant_id IS NOT DISTINCT FROM _cn.tenant_id
    AND is_closed = false
    AND _cn_date BETWEEN start_date AND end_date
  LIMIT 1;

  IF _period_id IS NULL THEN
    SELECT id INTO _period_id FROM public.fiscal_periods
    WHERE tenant_id IS NOT DISTINCT FROM _cn.tenant_id AND is_closed = false
    ORDER BY end_date DESC LIMIT 1;
  END IF;
  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  _ar_acct  := public.resolve_posting_account(_cn.tenant_id, 'AR');
  _ret_acct := public.resolve_posting_account(_cn.tenant_id, 'SALES_RETURNS');

  IF _ar_acct IS NULL OR _ret_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_account_mapping',
                              'detail', jsonb_build_object('AR', _ar_acct, 'SALES_RETURNS', _ret_acct));
  END IF;

  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                               source_type, source_id, created_by, is_posted)
  VALUES (_cn.tenant_id, _period_id, _cn_date,
          'مرتجع مبيعات: ' || _cn.credit_note_number,
          'credit_note', _credit_note_id, _cn.created_by, false)
  RETURNING id INTO _journal_id;

  -- DR: Sales Returns (contra-revenue)
  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_cn.tenant_id, _journal_id, _ret_acct, _line_no, _cn.amount, 0, 'مرتجع: ' || _cn.credit_note_number);
  _line_no := _line_no + 1;

  -- CR: Accounts Receivable
  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_cn.tenant_id, _journal_id, _ar_acct, _line_no, 0, _cn.amount, 'تخفيض ذمم العميل');

  -- Mark journal posted
  UPDATE public.journals SET is_posted = true, posted_at = now() WHERE id = _journal_id;

  -- Log to document_posting_log if exists
  BEGIN
    INSERT INTO public.document_posting_log (tenant_id, document_type, document_id, journal_id, status, posted_at)
    VALUES (_cn.tenant_id, 'credit_note', _credit_note_id, _journal_id, 'posted', now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'journal_id', _journal_id);
END;
$$;

-- 4) Reverse the journal of a credit note (when cancelling a confirmed one)
CREATE OR REPLACE FUNCTION public.reverse_journal_for_credit_note(_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _orig RECORD;
  _new_journal uuid;
  _entry RECORD;
  _line int := 1;
  _period_id uuid;
BEGIN
  SELECT * INTO _orig FROM public.journals
  WHERE source_type = 'credit_note' AND source_id = _credit_note_id
  ORDER BY created_at DESC LIMIT 1;

  IF _orig.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'no_journal_to_reverse');
  END IF;

  SELECT id INTO _period_id FROM public.fiscal_periods
  WHERE tenant_id = _orig.tenant_id AND is_closed = false
  ORDER BY end_date DESC LIMIT 1;

  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                               source_type, source_id, created_by, is_posted, posted_at)
  VALUES (_orig.tenant_id, _period_id, CURRENT_DATE,
          'عكس قيد مرتجع ملغي: ' || COALESCE(_orig.description, ''),
          'credit_note_reversal', _credit_note_id, auth.uid(), true, now())
  RETURNING id INTO _new_journal;

  FOR _entry IN
    SELECT account_id, debit_amount, credit_amount, memo
    FROM public.journal_entries WHERE journal_id = _orig.id ORDER BY line_number
  LOOP
    INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
    VALUES (_orig.tenant_id, _new_journal, _entry.account_id, _line,
            _entry.credit_amount, _entry.debit_amount,
            'عكس: ' || COALESCE(_entry.memo, ''));
    _line := _line + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'reversal_journal_id', _new_journal);
END;
$$;

-- 5) Updated confirm_credit_note: balance + invoice paid_amount + stock + journal
CREATE OR REPLACE FUNCTION public.confirm_credit_note(p_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_user uuid;
  v_role text;
  v_cn record;
  v_journal_result jsonb;
  v_stock_result jsonb;
BEGIN
  v_user := auth.uid();
  v_tenant := public.get_current_tenant();
  IF v_user IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT role::text INTO v_role FROM public.user_roles
  WHERE user_id = v_user AND (tenant_id = v_tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = v_tenant) DESC NULLS LAST LIMIT 1;

  IF v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT * INTO v_cn FROM public.credit_notes
  WHERE id = p_credit_note_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit note not found'; END IF;
  IF v_cn.status = 'confirmed' THEN RAISE EXCEPTION 'Already confirmed'; END IF;
  IF v_cn.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot confirm cancelled note'; END IF;

  -- 1. Reduce customer balance
  UPDATE public.customers
  SET current_balance = COALESCE(current_balance, 0) - v_cn.amount,
      updated_at = now()
  WHERE id = v_cn.customer_id AND tenant_id = v_tenant;

  -- 2. Reduce paid_amount on original invoice (treat credit as payment)
  UPDATE public.invoices
  SET paid_amount = LEAST(COALESCE(total_amount, 0), COALESCE(paid_amount, 0) + v_cn.amount),
      payment_status = CASE
        WHEN COALESCE(paid_amount, 0) + v_cn.amount >= COALESCE(total_amount, 0) THEN 'paid'
        WHEN COALESCE(paid_amount, 0) + v_cn.amount > 0 THEN 'partial'
        ELSE payment_status
      END,
      updated_at = now()
  WHERE id = v_cn.invoice_id AND tenant_id = v_tenant;

  -- 3. Update status BEFORE journal (journal requires confirmed)
  UPDATE public.credit_notes SET status = 'confirmed', updated_at = now()
  WHERE id = p_credit_note_id;

  -- 4. Reverse stock (best-effort; logs warning if fails)
  BEGIN
    v_stock_result := public.reverse_stock_for_credit_note(p_credit_note_id);
  EXCEPTION WHEN OTHERS THEN
    v_stock_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  -- 5. Create reverse journal (best-effort; status remains confirmed even if accounting fails — reported)
  BEGIN
    v_journal_result := public.create_journal_for_credit_note(p_credit_note_id);
  EXCEPTION WHEN OTHERS THEN
    v_journal_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'stock', v_stock_result,
    'journal', v_journal_result
  );
END;
$$;

-- 6) Updated cancel_credit_note: reverse everything
CREATE OR REPLACE FUNCTION public.cancel_credit_note(p_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_user uuid;
  v_role text;
  v_cn record;
  v_item record;
  v_journal_result jsonb;
BEGIN
  v_user := auth.uid();
  v_tenant := public.get_current_tenant();
  IF v_user IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT role::text INTO v_role FROM public.user_roles
  WHERE user_id = v_user AND (tenant_id = v_tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = v_tenant) DESC NULLS LAST LIMIT 1;

  IF v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT * INTO v_cn FROM public.credit_notes
  WHERE id = p_credit_note_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit note not found'; END IF;
  IF v_cn.status = 'cancelled' THEN RAISE EXCEPTION 'Already cancelled'; END IF;

  IF v_cn.status = 'confirmed' THEN
    -- Reverse balance
    UPDATE public.customers
    SET current_balance = COALESCE(current_balance, 0) + v_cn.amount, updated_at = now()
    WHERE id = v_cn.customer_id AND tenant_id = v_tenant;

    -- Reverse invoice paid_amount
    UPDATE public.invoices
    SET paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount),
        payment_status = CASE
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) >= COALESCE(total_amount, 0) THEN 'paid'
          WHEN GREATEST(0, COALESCE(paid_amount, 0) - v_cn.amount) > 0 THEN 'partial'
          ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = v_cn.invoice_id AND tenant_id = v_tenant;

    -- Reverse stock (subtract again)
    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.credit_note_items WHERE credit_note_id = p_credit_note_id LOOP
      UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) - v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id AND tenant_id = v_tenant;
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants SET stock_quantity = COALESCE(stock_quantity, 0) - v_item.quantity, updated_at = now()
        WHERE id = v_item.variant_id;
      END IF;
    END LOOP;

    -- Create reversal journal entry
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
    'reversal_journal', v_journal_result
  );
END;
$$;