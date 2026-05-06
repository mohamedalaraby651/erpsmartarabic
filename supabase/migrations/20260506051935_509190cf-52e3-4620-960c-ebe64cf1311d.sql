-- ============================================================
-- Layer 3: Accounting Posting Rules for Logistics Documents
-- ============================================================

-- 1) Document posting log (audit trail for accounting integration)
CREATE TABLE IF NOT EXISTS public.document_posting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_type TEXT NOT NULL,         -- 'goods_receipt' | 'delivery_note' | 'purchase_invoice'
  document_id UUID NOT NULL,
  document_number TEXT,
  journal_id UUID,                     -- NULL if posting failed
  status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'skipped' | 'failed'
  reason TEXT,                         -- error message or skip reason
  total_amount NUMERIC(18,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_dpl_tenant_doc ON public.document_posting_log(tenant_id, document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_dpl_journal ON public.document_posting_log(journal_id) WHERE journal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dpl_failed ON public.document_posting_log(tenant_id, status) WHERE status = 'failed';

ALTER TABLE public.document_posting_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpl_tenant_read"
  ON public.document_posting_log FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());

CREATE POLICY "dpl_system_insert"
  ON public.document_posting_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant());

-- 2) Helper: check if a date falls in a closed fiscal period
CREATE OR REPLACE FUNCTION public.is_period_closed(_tenant_id uuid, _date date)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fiscal_periods
    WHERE tenant_id IS NOT DISTINCT FROM _tenant_id
      AND _date BETWEEN start_date AND end_date
      AND is_closed = true
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_period_closed(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_period_closed(uuid, date) TO authenticated;

-- 3) Helper: resolve open fiscal period (with sensible fallback)
CREATE OR REPLACE FUNCTION public._resolve_open_period(_tenant_id uuid, _date date)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _pid uuid;
BEGIN
  SELECT id INTO _pid FROM public.fiscal_periods
  WHERE tenant_id IS NOT DISTINCT FROM _tenant_id
    AND is_closed = false
    AND _date BETWEEN start_date AND end_date
  LIMIT 1;
  IF _pid IS NULL THEN
    SELECT id INTO _pid FROM public.fiscal_periods
    WHERE tenant_id IS NOT DISTINCT FROM _tenant_id AND is_closed = false
    ORDER BY end_date DESC LIMIT 1;
  END IF;
  RETURN _pid;
END $$;

REVOKE EXECUTE ON FUNCTION public._resolve_open_period(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public._resolve_open_period(uuid, date) TO authenticated;

-- ============================================================
-- 4) RPC: create_journal_for_goods_receipt
--    DR: Inventory (sum of received_qty * unit_cost)
--    CR: GR/IR Clearing (waiting for the supplier invoice)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_journal_for_goods_receipt(_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _gr RECORD;
  _period_id uuid;
  _journal_id uuid;
  _inv_acct uuid; _gri_acct uuid;
  _total numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.journals WHERE source_type = 'goods_receipt' AND source_id = _receipt_id) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'journal_exists');
  END IF;

  SELECT id, tenant_id, receipt_number, received_date, posted_by
  INTO _gr FROM public.goods_receipts WHERE id = _receipt_id AND status = 'posted';
  IF _gr.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'receipt_not_posted');
  END IF;

  IF public.is_period_closed(_gr.tenant_id, _gr.received_date) THEN
    RETURN jsonb_build_object('success', false, 'error', 'period_closed');
  END IF;

  SELECT COALESCE(SUM(received_qty * unit_cost), 0)::numeric(18,2)
  INTO _total FROM public.goods_receipt_items WHERE receipt_id = _receipt_id;

  IF _total <= 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'zero_value_receipt');
  END IF;

  _inv_acct := public.resolve_posting_account(_gr.tenant_id, 'INVENTORY');
  _gri_acct := public.resolve_posting_account(_gr.tenant_id, 'GR_IR_CLEARING');

  IF _inv_acct IS NULL OR _gri_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_account_mapping',
      'detail', jsonb_build_object('INVENTORY', _inv_acct, 'GR_IR_CLEARING', _gri_acct));
  END IF;

  _period_id := public._resolve_open_period(_gr.tenant_id, _gr.received_date);
  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                                source_type, source_id, created_by, is_posted)
  VALUES (_gr.tenant_id, _period_id, _gr.received_date,
          'استلام بضاعة: ' || _gr.receipt_number,
          'goods_receipt', _receipt_id, _gr.posted_by, false)
  RETURNING id INTO _journal_id;

  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_gr.tenant_id, _journal_id, _inv_acct, 1, _total, 0, 'Inventory in — ' || _gr.receipt_number);

  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_gr.tenant_id, _journal_id, _gri_acct, 2, 0, _total, 'GR/IR clearing — ' || _gr.receipt_number);

  UPDATE public.journals SET is_posted = true WHERE id = _journal_id;

  RETURN jsonb_build_object('success', true, 'journal_id', _journal_id, 'total', _total);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'exception', 'message', SQLERRM, 'sqlstate', SQLSTATE);
END $$;

REVOKE EXECUTE ON FUNCTION public.create_journal_for_goods_receipt(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_journal_for_goods_receipt(uuid) TO authenticated;

-- ============================================================
-- 5) RPC: create_journal_for_purchase_invoice
--    DR: GR/IR Clearing (subtotal — closes the GR open balance)
--    DR: VAT Receivable (tax)
--    CR: Accounts Payable (total)
--    CR: Purchase Discount when discount > 0 (reduces inventory cost or P&L)
--    Fallback when no GR linked: DR Inventory directly.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_journal_for_purchase_invoice(_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _pi RECORD;
  _period_id uuid;
  _journal_id uuid;
  _ap_acct uuid; _gri_acct uuid; _vat_acct uuid; _disc_acct uuid; _inv_acct uuid;
  _has_gr boolean;
  _line_no int := 1;
  _subtotal numeric; _tax numeric; _disc numeric; _total numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.journals WHERE source_type = 'purchase_invoice' AND source_id = _invoice_id) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'journal_exists');
  END IF;

  SELECT id, tenant_id, invoice_number, invoice_date, purchase_order_id,
         subtotal, tax_amount, discount_amount, total_amount, posted_by, status
  INTO _pi FROM public.purchase_invoices WHERE id = _invoice_id;

  IF _pi.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_not_found');
  END IF;
  IF _pi.status NOT IN ('posted', 'paid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_not_posted');
  END IF;
  IF public.is_period_closed(_pi.tenant_id, _pi.invoice_date) THEN
    RETURN jsonb_build_object('success', false, 'error', 'period_closed');
  END IF;

  _subtotal := COALESCE(_pi.subtotal, 0);
  _tax      := COALESCE(_pi.tax_amount, 0);
  _disc     := COALESCE(_pi.discount_amount, 0);
  _total    := COALESCE(_pi.total_amount, 0);

  IF ABS((_subtotal + _tax - _disc) - _total) > 0.01 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_math_inconsistent');
  END IF;

  _ap_acct   := public.resolve_posting_account(_pi.tenant_id, 'AP');
  _gri_acct  := public.resolve_posting_account(_pi.tenant_id, 'GR_IR_CLEARING');
  _vat_acct  := public.resolve_posting_account(_pi.tenant_id, 'VAT_RECEIVABLE');
  _disc_acct := public.resolve_posting_account(_pi.tenant_id, 'PURCHASE_DISCOUNT');
  _inv_acct  := public.resolve_posting_account(_pi.tenant_id, 'INVENTORY');

  IF _ap_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_AP_account');
  END IF;

  -- Did this invoice's PO get any goods receipt?
  _has_gr := _pi.purchase_order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.goods_receipts gr
    WHERE gr.purchase_order_id = _pi.purchase_order_id AND gr.status = 'posted'
  );

  IF _has_gr AND _gri_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_GR_IR_account');
  END IF;
  IF NOT _has_gr AND _inv_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_INVENTORY_account');
  END IF;

  _period_id := public._resolve_open_period(_pi.tenant_id, _pi.invoice_date);
  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                                source_type, source_id, created_by, is_posted)
  VALUES (_pi.tenant_id, _period_id, _pi.invoice_date,
          'فاتورة مشتريات: ' || _pi.invoice_number,
          'purchase_invoice', _invoice_id, _pi.posted_by, false)
  RETURNING id INTO _journal_id;

  -- DR: Settle GR/IR (when GR exists) OR DR Inventory directly
  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_pi.tenant_id, _journal_id,
          CASE WHEN _has_gr THEN _gri_acct ELSE _inv_acct END,
          _line_no, _subtotal, 0,
          CASE WHEN _has_gr THEN 'GR/IR settle — ' ELSE 'Inventory direct — ' END || _pi.invoice_number);
  _line_no := _line_no + 1;

  -- DR: VAT Receivable
  IF _tax > 0 AND _vat_acct IS NOT NULL THEN
    INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
    VALUES (_pi.tenant_id, _journal_id, _vat_acct, _line_no, _tax, 0, 'VAT in — ' || _pi.invoice_number);
    _line_no := _line_no + 1;
  END IF;

  -- CR: Purchase Discount
  IF _disc > 0 AND _disc_acct IS NOT NULL THEN
    INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
    VALUES (_pi.tenant_id, _journal_id, _disc_acct, _line_no, 0, _disc, 'Purchase discount — ' || _pi.invoice_number);
    _line_no := _line_no + 1;
  END IF;

  -- CR: Accounts Payable (total)
  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_pi.tenant_id, _journal_id, _ap_acct, _line_no, 0, _total, 'AP — ' || _pi.invoice_number);

  UPDATE public.journals SET is_posted = true WHERE id = _journal_id;

  RETURN jsonb_build_object('success', true, 'journal_id', _journal_id, 'total', _total, 'mode',
    CASE WHEN _has_gr THEN 'gr_settle' ELSE 'direct_inventory' END);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'exception', 'message', SQLERRM, 'sqlstate', SQLSTATE);
END $$;

REVOKE EXECUTE ON FUNCTION public.create_journal_for_purchase_invoice(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_journal_for_purchase_invoice(uuid) TO authenticated;

-- ============================================================
-- 6) RPC: create_journal_for_delivery_note
--    DR: Cost of Goods Sold (sum of delivered_qty * cost)
--    CR: Inventory
--    Cost source: latest cost from product_stock OR product.cost_price fallback.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_journal_for_delivery_note(_delivery_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _dn RECORD;
  _period_id uuid;
  _journal_id uuid;
  _cogs_acct uuid; _inv_acct uuid;
  _total_cost numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.journals WHERE source_type = 'delivery_note' AND source_id = _delivery_id) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'journal_exists');
  END IF;

  SELECT id, tenant_id, delivery_number, delivery_date, posted_by, status
  INTO _dn FROM public.delivery_notes WHERE id = _delivery_id;
  IF _dn.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'delivery_not_found');
  END IF;
  IF _dn.status <> 'delivered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'delivery_not_posted');
  END IF;
  IF public.is_period_closed(_dn.tenant_id, _dn.delivery_date) THEN
    RETURN jsonb_build_object('success', false, 'error', 'period_closed');
  END IF;

  -- Compute COGS from product cost_price (fallback to 0 — non-blocking)
  SELECT COALESCE(SUM(dni.delivered_qty * COALESCE(p.cost_price, 0)), 0)::numeric(18,2)
  INTO _total_cost
  FROM public.delivery_note_items dni
  LEFT JOIN public.products p ON p.id = dni.product_id
  WHERE dni.delivery_id = _delivery_id;

  IF _total_cost <= 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'zero_cost_delivery');
  END IF;

  _cogs_acct := public.resolve_posting_account(_dn.tenant_id, 'COGS');
  _inv_acct  := public.resolve_posting_account(_dn.tenant_id, 'INVENTORY');
  IF _cogs_acct IS NULL OR _inv_acct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_account_mapping',
      'detail', jsonb_build_object('COGS', _cogs_acct, 'INVENTORY', _inv_acct));
  END IF;

  _period_id := public._resolve_open_period(_dn.tenant_id, _dn.delivery_date);
  IF _period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_open_fiscal_period');
  END IF;

  INSERT INTO public.journals (tenant_id, fiscal_period_id, journal_date, description,
                                source_type, source_id, created_by, is_posted)
  VALUES (_dn.tenant_id, _period_id, _dn.delivery_date,
          'تسليم بضاعة: ' || _dn.delivery_number,
          'delivery_note', _delivery_id, _dn.posted_by, false)
  RETURNING id INTO _journal_id;

  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_dn.tenant_id, _journal_id, _cogs_acct, 1, _total_cost, 0, 'COGS — ' || _dn.delivery_number);

  INSERT INTO public.journal_entries (tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo)
  VALUES (_dn.tenant_id, _journal_id, _inv_acct, 2, 0, _total_cost, 'Inventory out — ' || _dn.delivery_number);

  UPDATE public.journals SET is_posted = true WHERE id = _journal_id;

  RETURN jsonb_build_object('success', true, 'journal_id', _journal_id, 'total_cost', _total_cost);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'exception', 'message', SQLERRM, 'sqlstate', SQLSTATE);
END $$;

REVOKE EXECUTE ON FUNCTION public.create_journal_for_delivery_note(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_journal_for_delivery_note(uuid) TO authenticated;

-- ============================================================
-- 7) Wrap existing post_* RPCs to:
--    a) Block when fiscal period is closed
--    b) Auto-create accounting journal AFTER successful posting
--    c) Log the result to document_posting_log
-- ============================================================

CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _items_count int;
  _journal_res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'inventory', 'edit') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.goods_receipts WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'current_status', _row.status);
  END IF;

  IF public.is_period_closed(_tenant, _row.received_date) THEN
    RETURN jsonb_build_object('success', false, 'error', 'period_closed',
      'message', 'لا يمكن الترحيل في فترة مالية مغلقة');
  END IF;

  SELECT COUNT(*) INTO _items_count FROM public.goods_receipt_items WHERE receipt_id = p_id;
  IF _items_count = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'no_items'); END IF;

  UPDATE public.goods_receipts
  SET status = 'posted', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  WHERE id = p_id;

  -- Auto-create accounting journal
  _journal_res := public.create_journal_for_goods_receipt(p_id);

  INSERT INTO public.document_posting_log
    (tenant_id, document_type, document_id, document_number, journal_id, status, reason, total_amount, created_by)
  VALUES (_tenant, 'goods_receipt', p_id, _row.receipt_number,
          (_journal_res->>'journal_id')::uuid,
          CASE WHEN (_journal_res->>'success')::boolean
               THEN CASE WHEN (_journal_res->>'skipped')::boolean THEN 'skipped' ELSE 'success' END
               ELSE 'failed' END,
          COALESCE(_journal_res->>'reason', _journal_res->>'error'),
          (_journal_res->>'total')::numeric, auth.uid());

  RETURN jsonb_build_object('success', true, 'receipt_id', p_id,
    'items_processed', _items_count, 'journal', _journal_res);
END $$;

CREATE OR REPLACE FUNCTION public.post_purchase_invoice(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _journal_res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'purchases', 'edit') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.purchase_invoices WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  IF public.is_period_closed(_tenant, _row.invoice_date) THEN
    RETURN jsonb_build_object('success', false, 'error', 'period_closed');
  END IF;

  -- Trigger calculates matching_status & approval_required
  UPDATE public.purchase_invoices
  SET status = 'posted', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  WHERE id = p_id;

  -- Re-read for latest matching status
  SELECT * INTO _row FROM public.purchase_invoices WHERE id = p_id;

  _journal_res := public.create_journal_for_purchase_invoice(p_id);

  INSERT INTO public.document_posting_log
    (tenant_id, document_type, document_id, document_number, journal_id, status, reason, total_amount, created_by)
  VALUES (_tenant, 'purchase_invoice', p_id, _row.invoice_number,
          (_journal_res->>'journal_id')::uuid,
          CASE WHEN (_journal_res->>'success')::boolean
               THEN CASE WHEN (_journal_res->>'skipped')::boolean THEN 'skipped' ELSE 'success' END
               ELSE 'failed' END,
          COALESCE(_journal_res->>'reason', _journal_res->>'error'),
          _row.total_amount, auth.uid());

  RETURN jsonb_build_object('success', true,
    'matching_status', _row.matching_status,
    'approval_required', _row.approval_required,
    'journal', _journal_res);
END $$;

CREATE OR REPLACE FUNCTION public.post_delivery_note(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _items_count int;
  _journal_res jsonb;
  _stock_warnings int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'sales', 'edit') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.delivery_notes WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status NOT IN ('draft', 'in_transit') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  IF public.is_period_closed(_tenant, _row.delivery_date) THEN
    RETURN jsonb_build_object('success', false, 'error', 'period_closed');
  END IF;

  SELECT COUNT(*) INTO _items_count FROM public.delivery_note_items WHERE delivery_id = p_id;
  IF _items_count = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'no_items'); END IF;

  UPDATE public.delivery_notes
  SET status = 'delivered', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  WHERE id = p_id;

  -- Count negative-stock warnings logged by trigger
  SELECT COUNT(*) INTO _stock_warnings
  FROM public.sync_logs
  WHERE metadata->>'reference_id' = p_id::text
    AND created_at > now() - interval '5 seconds'
    AND level = 'warning';

  _journal_res := public.create_journal_for_delivery_note(p_id);

  INSERT INTO public.document_posting_log
    (tenant_id, document_type, document_id, document_number, journal_id, status, reason, total_amount, created_by)
  VALUES (_tenant, 'delivery_note', p_id, _row.delivery_number,
          (_journal_res->>'journal_id')::uuid,
          CASE WHEN (_journal_res->>'success')::boolean
               THEN CASE WHEN (_journal_res->>'skipped')::boolean THEN 'skipped' ELSE 'success' END
               ELSE 'failed' END,
          COALESCE(_journal_res->>'reason', _journal_res->>'error'),
          (_journal_res->>'total_cost')::numeric, auth.uid());

  RETURN jsonb_build_object('success', true, 'delivery_id', p_id,
    'items_processed', _items_count, 'stock_warnings', _stock_warnings,
    'journal', _journal_res);
END $$;