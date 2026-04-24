-- Add SALES_DISCOUNT mapping (defaults to revenue account 4100 as contra-entry)
INSERT INTO public.posting_account_map (tenant_id, posting_key, account_id, description)
SELECT t.id, 'SALES_DISCOUNT', coa.id, 'خصم مبيعات (يُخصم من الإيراد)'
FROM public.tenants t
JOIN public.chart_of_accounts coa ON coa.code = '4100' AND coa.tenant_id IS NOT DISTINCT FROM t.id
ON CONFLICT (tenant_id, posting_key) DO NOTHING;

INSERT INTO public.posting_account_map (tenant_id, posting_key, account_id, description)
SELECT 'a0000000-0000-0000-0000-000000000001'::uuid, 'SALES_DISCOUNT', coa.id, 'خصم مبيعات (يُخصم من الإيراد)'
FROM public.chart_of_accounts coa WHERE coa.code = '4100'
ON CONFLICT (tenant_id, posting_key) DO NOTHING;

-- Updated RPC: handles discount_amount
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
  _ar_acct uuid; _rev_acct uuid; _vat_acct uuid; _disc_acct uuid;
  _subtotal numeric; _tax numeric; _total numeric; _discount numeric;
  _line_no int := 1;
BEGIN
  IF EXISTS (SELECT 1 FROM public.journals WHERE source_type = 'invoice' AND source_id = _invoice_id) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'journal_exists');
  END IF;

  SELECT id, tenant_id, invoice_number, customer_id, subtotal, tax_amount, total_amount,
         discount_amount, created_at::date AS invoice_date, created_by, approval_status
  INTO _inv FROM public.invoices WHERE id = _invoice_id;

  IF _inv.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_not_found');
  END IF;
  IF _inv.approval_status IS DISTINCT FROM 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_not_approved');
  END IF;

  SELECT id INTO _period_id
  FROM public.fiscal_periods
  WHERE tenant_id IS NOT DISTINCT FROM _inv.tenant_id
    AND is_closed = false
    AND _inv.invoice_date BETWEEN start_date AND end_date
  LIMIT 1;

  IF _period_id IS NULL THEN
    SELECT id INTO _period_id FROM public.fiscal_periods
    WHERE tenant_id IS NOT DISTINCT FROM _inv.tenant_id AND is_closed = false
    ORDER BY end_date DESC LIMIT 1;
  END IF;
  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  _ar_acct   := public.resolve_posting_account(_inv.tenant_id, 'AR');
  _rev_acct  := public.resolve_posting_account(_inv.tenant_id, 'REVENUE');
  _vat_acct  := public.resolve_posting_account(_inv.tenant_id, 'VAT_PAYABLE');
  _disc_acct := public.resolve_posting_account(_inv.tenant_id, 'SALES_DISCOUNT');

  IF _ar_acct IS NULL OR _rev_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_account_mapping',
                              'detail', jsonb_build_object('AR', _ar_acct, 'REVENUE', _rev_acct));
  END IF;

  _subtotal := COALESCE(_inv.subtotal, 0);
  _tax      := COALESCE(_inv.tax_amount, 0);
  _total    := COALESCE(_inv.total_amount, 0);
  _discount := COALESCE(_inv.discount_amount, 0);

  -- Sanity: subtotal + tax - discount should equal total (within 0.01)
  IF ABS((_subtotal + _tax - _discount) - _total) > 0.01 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_math_inconsistent',
                              'detail', jsonb_build_object(
                                'subtotal', _subtotal, 'tax', _tax, 'discount', _discount, 'total', _total,
                                'expected', _subtotal + _tax - _discount));
  END IF;

  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                                source_type, source_id, created_by, is_posted)
  VALUES (_inv.tenant_id, _period_id, _inv.invoice_date,
          'فاتورة معتمدة: ' || _inv.invoice_number,
          'invoice', _invoice_id, _inv.created_by, false)
  RETURNING id INTO _journal_id;

  -- DR: Accounts Receivable (total)
  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_inv.tenant_id, _journal_id, _ar_acct, _line_no, _total, 0, 'AR — ' || _inv.invoice_number);
  _line_no := _line_no + 1;

  -- CR: Revenue (subtotal)
  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_inv.tenant_id, _journal_id, _rev_acct, _line_no, 0, _subtotal, 'Revenue — ' || _inv.invoice_number);
  _line_no := _line_no + 1;

  -- CR: VAT Payable (tax)
  IF _tax > 0 AND _vat_acct IS NOT NULL THEN
    INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
    VALUES (_inv.tenant_id, _journal_id, _vat_acct, _line_no, 0, _tax, 'VAT — ' || _inv.invoice_number);
    _line_no := _line_no + 1;
  END IF;

  -- DR: Sales Discount (contra-revenue) when discount > 0
  IF _discount > 0 AND _disc_acct IS NOT NULL THEN
    INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
    VALUES (_inv.tenant_id, _journal_id, _disc_acct, _line_no, _discount, 0, 'Sales discount — ' || _inv.invoice_number);
    _line_no := _line_no + 1;
  END IF;

  UPDATE public.journals SET is_posted = true WHERE id = _journal_id;

  RETURN jsonb_build_object('success', true, 'journal_id', _journal_id, 'total', _total, 'discount', _discount);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'exception', 'message', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

-- Re-queue failed events
UPDATE public.domain_events
SET status = 'pending', processed_at = NULL, last_error = NULL, attempts = 0, next_retry_at = NULL
WHERE status = 'failed'
  AND event_type IN ('invoice.approved', 'payment.received');