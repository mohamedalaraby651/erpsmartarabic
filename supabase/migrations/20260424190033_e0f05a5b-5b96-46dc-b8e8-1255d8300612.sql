-- ============================================
-- Phase 2: Void Invoice + Expense Posting + Observability
-- ============================================

-- 1. Link expense_categories to chart of accounts
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.chart_of_accounts(id);

CREATE INDEX IF NOT EXISTS idx_expense_categories_account
  ON public.expense_categories(tenant_id, account_id) WHERE account_id IS NOT NULL;

-- Backfill default account mappings for the default tenant
UPDATE public.expense_categories ec
SET account_id = coa.id
FROM public.chart_of_accounts coa
WHERE ec.tenant_id = 'a0000000-0000-0000-0000-000000000001'
  AND coa.tenant_id = ec.tenant_id
  AND ec.account_id IS NULL
  AND (
    (ec.name ILIKE '%إيجار%' AND coa.code = '5300') OR
    (ec.name ILIKE '%رواتب%' AND coa.code = '5200') OR
    (ec.name ILIKE '%مرافق%' AND coa.code = '5400') OR
    (ec.name ILIKE '%نقل%'   AND coa.code = '5500')
  );

-- ============================================
-- 2. void_invoice RPC — reverses an approved invoice's journal
-- ============================================
CREATE OR REPLACE FUNCTION public.void_invoice(
  _invoice_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _orig_journal record;
  _new_journal_id uuid;
  _new_journal_no text;
  _period_id uuid;
  _line record;
  _ln int := 1;
  _tenant uuid;
BEGIN
  SELECT * INTO _inv FROM public.invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  _tenant := _inv.tenant_id;

  IF _inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invoice already cancelled';
  END IF;

  IF _inv.paid_amount > 0 THEN
    RAISE EXCEPTION 'Cannot void invoice with payments. Refund payments first.';
  END IF;

  -- Find original journal
  SELECT * INTO _orig_journal
  FROM public.journals
  WHERE source_type = 'invoice' AND source_id = _invoice_id
    AND tenant_id = _tenant
  ORDER BY created_at ASC
  LIMIT 1;

  -- Find current open period for the void date (today)
  SELECT id INTO _period_id
  FROM public.fiscal_periods
  WHERE tenant_id = _tenant
    AND CURRENT_DATE BETWEEN start_date AND end_date
    AND COALESCE(is_closed, false) = false
  LIMIT 1;

  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'No open fiscal period for today';
  END IF;

  -- If a journal exists, create a reversing journal
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

    -- Reverse each line (swap debit and credit)
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

  -- Update invoice status
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
$$;

REVOKE EXECUTE ON FUNCTION public.void_invoice(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_invoice(uuid, text) TO authenticated, service_role;

-- ============================================
-- 3. create_journal_for_expense RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.create_journal_for_expense(
  _expense_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exp record;
  _expense_account_id uuid;
  _credit_account_id uuid;
  _credit_logical text;
  _journal_id uuid;
  _journal_no text;
  _period_id uuid;
  _existing_journal_id uuid;
BEGIN
  SELECT e.*, ec.account_id AS category_account_id, ec.name AS category_name
  INTO _exp
  FROM public.expenses e
  LEFT JOIN public.expense_categories ec ON ec.id = e.category_id
  WHERE e.id = _expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- Skip if already posted
  SELECT id INTO _existing_journal_id
  FROM public.journals
  WHERE source_type = 'expense' AND source_id = _expense_id
    AND tenant_id = _exp.tenant_id
  LIMIT 1;

  IF _existing_journal_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'journal_id', _existing_journal_id);
  END IF;

  -- Resolve expense account: category mapping → fallback to "Other Expenses" (5900)
  _expense_account_id := _exp.category_account_id;
  IF _expense_account_id IS NULL THEN
    SELECT id INTO _expense_account_id
    FROM public.chart_of_accounts
    WHERE tenant_id = _exp.tenant_id AND code = '5900'
    LIMIT 1;
  END IF;

  IF _expense_account_id IS NULL THEN
    RAISE EXCEPTION 'No expense account configured for tenant';
  END IF;

  -- Resolve credit side based on payment_method
  _credit_logical := CASE
    WHEN _exp.payment_method IN ('cash', 'نقدي') THEN 'CASH'
    WHEN _exp.payment_method IN ('bank_transfer', 'card', 'تحويل', 'بطاقة') THEN 'BANK'
    ELSE 'CASH'
  END;

  SELECT pam.account_id INTO _credit_account_id
  FROM public.posting_account_map pam
  WHERE pam.tenant_id = _exp.tenant_id AND pam.logical_key = _credit_logical
  LIMIT 1;

  IF _credit_account_id IS NULL THEN
    -- Fallback to CASH map
    SELECT pam.account_id INTO _credit_account_id
    FROM public.posting_account_map pam
    WHERE pam.tenant_id = _exp.tenant_id AND pam.logical_key = 'CASH'
    LIMIT 1;
  END IF;

  IF _credit_account_id IS NULL THEN
    RAISE EXCEPTION 'No CASH/BANK account in posting_account_map';
  END IF;

  -- Open fiscal period for expense_date
  SELECT id INTO _period_id
  FROM public.fiscal_periods
  WHERE tenant_id = _exp.tenant_id
    AND _exp.expense_date BETWEEN start_date AND end_date
    AND COALESCE(is_closed, false) = false
  LIMIT 1;

  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'No open fiscal period for expense date %', _exp.expense_date;
  END IF;

  _journal_no := 'EXP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO public.journals (
    tenant_id, journal_number, journal_date, description,
    fiscal_period_id, source_type, source_id, is_posted, posted_at,
    total_debit, total_credit, created_by
  ) VALUES (
    _exp.tenant_id, _journal_no, _exp.expense_date,
    'مصروف ' || _exp.expense_number || COALESCE(' — ' || _exp.category_name, ''),
    _period_id, 'expense', _expense_id, true, now(),
    _exp.amount, _exp.amount, _exp.created_by
  ) RETURNING id INTO _journal_id;

  -- DR expense account
  INSERT INTO public.journal_entries (
    tenant_id, journal_id, line_number, account_id, debit_amount, credit_amount, memo
  ) VALUES (
    _exp.tenant_id, _journal_id, 1, _expense_account_id,
    _exp.amount, 0,
    COALESCE(_exp.description, _exp.category_name, 'مصروف')
  );

  -- CR cash/bank
  INSERT INTO public.journal_entries (
    tenant_id, journal_id, line_number, account_id, debit_amount, credit_amount, memo
  ) VALUES (
    _exp.tenant_id, _journal_id, 2, _credit_account_id,
    0, _exp.amount,
    'دفع ' || _exp.expense_number
  );

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', _expense_id,
    'journal_id', _journal_id,
    'journal_number', _journal_no
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_journal_for_expense(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_journal_for_expense(uuid) TO authenticated, service_role;

-- ============================================
-- 4. Observability: event_dispatcher_metrics view
-- ============================================
CREATE OR REPLACE VIEW public.event_dispatcher_metrics AS
SELECT
  date_trunc('hour', em.hour_bucket) AS hour,
  em.event_type,
  em.success_count,
  em.failure_count,
  em.success_count + em.failure_count AS total_count,
  CASE
    WHEN em.success_count + em.failure_count = 0 THEN 0
    ELSE ROUND((em.success_count::numeric / (em.success_count + em.failure_count)) * 100, 2)
  END AS success_rate_pct,
  CASE
    WHEN em.success_count + em.failure_count = 0 THEN 0
    ELSE ROUND(em.total_latency_ms / (em.success_count + em.failure_count), 2)
  END AS avg_latency_ms
FROM public.event_metrics em
ORDER BY em.hour_bucket DESC, em.event_type;

-- Backlog view
CREATE OR REPLACE VIEW public.event_dispatcher_backlog AS
SELECT
  status,
  event_type,
  count(*) AS event_count,
  min(created_at) AS oldest_event_at,
  max(attempts) AS max_attempts
FROM public.domain_events
WHERE status IN ('pending', 'failed', 'processing')
GROUP BY status, event_type
ORDER BY status, event_count DESC;

GRANT SELECT ON public.event_dispatcher_metrics TO authenticated;
GRANT SELECT ON public.event_dispatcher_backlog TO authenticated;