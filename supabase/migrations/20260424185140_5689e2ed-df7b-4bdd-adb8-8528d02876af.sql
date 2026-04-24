-- ============================================================================
-- PHASE 1: DOUBLE-ENTRY ACCOUNTING ENGINE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. POSTING ACCOUNT MAP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posting_account_map (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  posting_key  text NOT NULL,
  account_id   uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, posting_key)
);

CREATE INDEX IF NOT EXISTS idx_posting_account_map_tenant_key
  ON public.posting_account_map (tenant_id, posting_key);

ALTER TABLE public.posting_account_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posting_map_read_tenant"
  ON public.posting_account_map FOR SELECT
  USING (tenant_id = public.get_current_tenant());

CREATE POLICY "posting_map_admin_write"
  ON public.posting_account_map FOR ALL
  USING (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant() AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_posting_map_updated_at
  BEFORE UPDATE ON public.posting_account_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. SEED DEFAULT MAPPINGS FOR EXISTING TENANTS
-- ----------------------------------------------------------------------------
INSERT INTO public.posting_account_map (tenant_id, posting_key, account_id, description)
SELECT
  t.id AS tenant_id,
  m.posting_key,
  coa.id AS account_id,
  m.description
FROM public.tenants t
CROSS JOIN (VALUES
  ('CASH',           '1110', 'النقدية في الصندوق'),
  ('BANK',           '1120', 'الحسابات البنكية'),
  ('AR',             '1130', 'ذمم العملاء (مدينون)'),
  ('AP',             '2110', 'ذمم الموردين (دائنون)'),
  ('REVENUE',        '4100', 'إيرادات المبيعات'),
  ('VAT_PAYABLE',    '2120', 'ضريبة القيمة المضافة'),
  ('SALES_RETURNS',  '4100', 'مردودات المبيعات (تخصم من الإيراد)'),
  ('COGS',           '5100', 'تكلفة البضاعة المباعة'),
  ('EXPENSE_DEFAULT','5900', 'مصروفات أخرى — افتراضي')
) AS m(posting_key, account_code, description)
JOIN public.chart_of_accounts coa
  ON coa.code = m.account_code AND coa.tenant_id IS NOT DISTINCT FROM t.id
ON CONFLICT (tenant_id, posting_key) DO NOTHING;

-- Fallback: seed for tenant_id=NULL accounts (system-wide chart) for default tenant
INSERT INTO public.posting_account_map (tenant_id, posting_key, account_id, description)
SELECT
  'a0000000-0000-0000-0000-000000000001'::uuid AS tenant_id,
  m.posting_key,
  coa.id AS account_id,
  m.description
FROM (VALUES
  ('CASH',           '1110', 'النقدية في الصندوق'),
  ('BANK',           '1120', 'الحسابات البنكية'),
  ('AR',             '1130', 'ذمم العملاء (مدينون)'),
  ('AP',             '2110', 'ذمم الموردين (دائنون)'),
  ('REVENUE',        '4100', 'إيرادات المبيعات'),
  ('VAT_PAYABLE',    '2120', 'ضريبة القيمة المضافة'),
  ('SALES_RETURNS',  '4100', 'مردودات المبيعات'),
  ('COGS',           '5100', 'تكلفة البضاعة المباعة'),
  ('EXPENSE_DEFAULT','5900', 'مصروفات أخرى — افتراضي')
) AS m(posting_key, account_code, description)
JOIN public.chart_of_accounts coa ON coa.code = m.account_code
ON CONFLICT (tenant_id, posting_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. HELPER: resolve account_id from posting_key
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_posting_account(_tenant_id uuid, _posting_key text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.posting_account_map
  WHERE tenant_id = _tenant_id AND posting_key = _posting_key
  LIMIT 1
$$;

-- ----------------------------------------------------------------------------
-- 4. ATOMIC RPC: create_journal_for_invoice
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_journal_for_invoice(_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _period_id uuid;
  _journal_id uuid;
  _ar_acct uuid; _rev_acct uuid; _vat_acct uuid;
  _subtotal numeric; _tax numeric; _total numeric;
BEGIN
  -- Idempotency: skip if journal already exists
  IF EXISTS (SELECT 1 FROM public.journals WHERE source_type = 'invoice' AND source_id = _invoice_id) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'journal_exists');
  END IF;

  SELECT id, tenant_id, invoice_number, customer_id, subtotal, tax_amount, total_amount,
         created_at::date AS invoice_date, created_by, approval_status
  INTO _inv FROM public.invoices WHERE id = _invoice_id;

  IF _inv.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_not_found');
  END IF;

  IF _inv.approval_status IS DISTINCT FROM 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_not_approved');
  END IF;

  -- Find open fiscal period for invoice date
  SELECT id INTO _period_id
  FROM public.fiscal_periods
  WHERE tenant_id IS NOT DISTINCT FROM _inv.tenant_id
    AND is_closed = false
    AND _inv.invoice_date BETWEEN start_date AND end_date
  LIMIT 1;

  IF _period_id IS NULL THEN
    -- Fallback to any open period
    SELECT id INTO _period_id FROM public.fiscal_periods
    WHERE tenant_id IS NOT DISTINCT FROM _inv.tenant_id AND is_closed = false
    ORDER BY end_date DESC LIMIT 1;
  END IF;

  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  -- Resolve accounts
  _ar_acct  := public.resolve_posting_account(_inv.tenant_id, 'AR');
  _rev_acct := public.resolve_posting_account(_inv.tenant_id, 'REVENUE');
  _vat_acct := public.resolve_posting_account(_inv.tenant_id, 'VAT_PAYABLE');

  IF _ar_acct IS NULL OR _rev_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_account_mapping',
                              'detail', jsonb_build_object('AR', _ar_acct, 'REVENUE', _rev_acct));
  END IF;

  _subtotal := COALESCE(_inv.subtotal, 0);
  _tax      := COALESCE(_inv.tax_amount, 0);
  _total    := COALESCE(_inv.total_amount, 0);

  -- Create journal header
  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                                source_type, source_id, created_by, is_posted)
  VALUES (_inv.tenant_id, _period_id, _inv.invoice_date,
          'فاتورة معتمدة: ' || _inv.invoice_number,
          'invoice', _invoice_id, _inv.created_by, false)
  RETURNING id INTO _journal_id;

  -- Lines: DR AR / CR Revenue + VAT
  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_inv.tenant_id, _journal_id, _ar_acct, 1, _total, 0, 'AR — ' || _inv.invoice_number);

  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_inv.tenant_id, _journal_id, _rev_acct, 2, 0, _subtotal, 'Revenue — ' || _inv.invoice_number);

  IF _tax > 0 AND _vat_acct IS NOT NULL THEN
    INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
    VALUES (_inv.tenant_id, _journal_id, _vat_acct, 3, 0, _tax, 'VAT — ' || _inv.invoice_number);
  END IF;

  -- Post the journal (validate_journal_balance trigger checks balance via total_debit/credit)
  UPDATE public.journals SET is_posted = true WHERE id = _journal_id;

  RETURN jsonb_build_object('success', true, 'journal_id', _journal_id, 'total', _total);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'exception', 'message', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. ATOMIC RPC: create_journal_for_payment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_journal_for_payment(_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pay RECORD;
  _period_id uuid;
  _journal_id uuid;
  _cash_acct uuid; _ar_acct uuid;
  _cash_key text;
BEGIN
  -- Idempotency
  IF EXISTS (SELECT 1 FROM public.journals WHERE source_type = 'payment' AND source_id = _payment_id) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'journal_exists');
  END IF;

  SELECT id, tenant_id, payment_number, customer_id, amount, payment_method,
         payment_date::date AS pay_date, created_by
  INTO _pay FROM public.payments WHERE id = _payment_id;

  IF _pay.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_found');
  END IF;

  -- Pick account by payment method
  _cash_key := CASE
    WHEN _pay.payment_method::text = 'cash' THEN 'CASH'
    WHEN _pay.payment_method::text IN ('bank_transfer','credit_card','debit_card','check') THEN 'BANK'
    ELSE 'CASH'
  END;

  -- Find open fiscal period
  SELECT id INTO _period_id
  FROM public.fiscal_periods
  WHERE tenant_id IS NOT DISTINCT FROM _pay.tenant_id
    AND is_closed = false
    AND _pay.pay_date BETWEEN start_date AND end_date
  LIMIT 1;

  IF _period_id IS NULL THEN
    SELECT id INTO _period_id FROM public.fiscal_periods
    WHERE tenant_id IS NOT DISTINCT FROM _pay.tenant_id AND is_closed = false
    ORDER BY end_date DESC LIMIT 1;
  END IF;

  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  _cash_acct := public.resolve_posting_account(_pay.tenant_id, _cash_key);
  _ar_acct   := public.resolve_posting_account(_pay.tenant_id, 'AR');

  IF _cash_acct IS NULL OR _ar_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_account_mapping',
                              'detail', jsonb_build_object(_cash_key, _cash_acct, 'AR', _ar_acct));
  END IF;

  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                                source_type, source_id, created_by, is_posted)
  VALUES (_pay.tenant_id, _period_id, _pay.pay_date,
          'دفعة عميل: ' || _pay.payment_number,
          'payment', _payment_id, _pay.created_by, false)
  RETURNING id INTO _journal_id;

  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_pay.tenant_id, _journal_id, _cash_acct, 1, _pay.amount, 0, _cash_key || ' — ' || _pay.payment_number);

  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_pay.tenant_id, _journal_id, _ar_acct, 2, 0, _pay.amount, 'AR settled — ' || _pay.payment_number);

  UPDATE public.journals SET is_posted = true WHERE id = _journal_id;

  RETURN jsonb_build_object('success', true, 'journal_id', _journal_id, 'amount', _pay.amount);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'exception', 'message', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. APPROVED-INVOICE IMMUTABILITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_approved_invoice_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_journal boolean;
BEGIN
  -- Only enforce when invoice is currently approved
  IF OLD.approval_status = 'approved' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.journals WHERE source_type = 'invoice' AND source_id = OLD.id AND is_posted = true
    ) INTO _has_journal;

    IF _has_journal THEN
      -- DELETE blocked
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'لا يمكن حذف فاتورة معتمدة لها قيد محاسبي مرحّل. استخدم عملية الإلغاء (void).'
          USING ERRCODE = 'check_violation';
      END IF;

      -- UPDATE: only allow status transition to 'cancelled' or paid_amount/payment_status updates
      IF TG_OP = 'UPDATE' THEN
        IF (NEW.subtotal IS DISTINCT FROM OLD.subtotal)
           OR (NEW.tax_amount IS DISTINCT FROM OLD.tax_amount)
           OR (NEW.total_amount IS DISTINCT FROM OLD.total_amount)
           OR (NEW.discount_amount IS DISTINCT FROM OLD.discount_amount)
           OR (NEW.customer_id IS DISTINCT FROM OLD.customer_id)
           OR (NEW.invoice_number IS DISTINCT FROM OLD.invoice_number) THEN
          RAISE EXCEPTION 'لا يمكن تعديل الحقول المالية لفاتورة معتمدة (% , % → %). استخدم قيد عكسي أو إشعار دائن.',
            OLD.invoice_number, OLD.total_amount, NEW.total_amount
            USING ERRCODE = 'check_violation';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_approved_invoice_mutation ON public.invoices;
CREATE TRIGGER trg_prevent_approved_invoice_mutation
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_invoice_mutation();

-- ----------------------------------------------------------------------------
-- 7. BACKFILL DOMAIN EVENTS FOR HISTORICAL APPROVED INVOICES & PAYMENTS
-- ----------------------------------------------------------------------------
-- Approved invoices missing journals
INSERT INTO public.domain_events (tenant_id, event_type, aggregate_type, aggregate_id, payload, status)
SELECT
  i.tenant_id,
  'invoice.approved',
  'invoice',
  i.id,
  jsonb_build_object(
    'invoice_number', i.invoice_number,
    'customer_id', i.customer_id,
    'total_amount', i.total_amount,
    'backfill', true
  ),
  'pending'
FROM public.invoices i
WHERE i.approval_status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.journals j
    WHERE j.source_type = 'invoice' AND j.source_id = i.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.domain_events de
    WHERE de.event_type = 'invoice.approved' AND de.aggregate_id = i.id AND de.status = 'pending'
  );

-- Payments missing journals
INSERT INTO public.domain_events (tenant_id, event_type, aggregate_type, aggregate_id, payload, status)
SELECT
  p.tenant_id,
  'payment.received',
  'payment',
  p.id,
  jsonb_build_object(
    'payment_number', p.payment_number,
    'customer_id', p.customer_id,
    'amount', p.amount,
    'invoice_id', p.invoice_id,
    'backfill', true
  ),
  'pending'
FROM public.payments p
WHERE NOT EXISTS (
    SELECT 1 FROM public.journals j
    WHERE j.source_type = 'payment' AND j.source_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.domain_events de
    WHERE de.event_type = 'payment.received' AND de.aggregate_id = p.id AND de.status = 'pending'
  );