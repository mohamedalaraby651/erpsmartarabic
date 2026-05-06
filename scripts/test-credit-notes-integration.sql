-- ============================================================================
-- Integration tests for Credit Note confirm/cancel + pre-flight validation
-- Run with:  psql -f scripts/test-credit-notes-integration.sql
-- All blocks ROLLBACK at the end — no data is persisted.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
\pset format aligned

BEGIN;

-- ── 0. Setup: pick a real tenant + warehouse + product, then act as admin
DO $$
DECLARE
  v_tenant uuid;
  v_admin  uuid;
  v_cust   uuid;
  v_prod   uuid;
  v_wh     uuid;
  v_inv    uuid;
  v_inv_item uuid;
  v_cn1    uuid;
  v_cn2    uuid;
  v_cn3    uuid;
  v_other_inv uuid;
  v_other_inv_item uuid;
  v_validation jsonb;
  v_result jsonb;
  v_err text;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants LIMIT 1;
  SELECT user_id INTO v_admin FROM public.user_roles WHERE role = 'admin' AND tenant_id = v_tenant LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT user_id INTO v_admin FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;
  IF v_tenant IS NULL OR v_admin IS NULL THEN
    RAISE NOTICE '⏭  No tenant/admin available — skipping integration test';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('app.current_tenant_id', v_tenant::text, true);

  -- Reuse first available product/warehouse for tenant, else create
  SELECT id INTO v_prod FROM public.products WHERE tenant_id = v_tenant AND is_active = true LIMIT 1;
  SELECT id INTO v_wh   FROM public.warehouses WHERE tenant_id = v_tenant AND is_active = true LIMIT 1;
  IF v_prod IS NULL OR v_wh IS NULL THEN
    RAISE NOTICE '⏭  Tenant lacks product/warehouse — skipping';
    RETURN;
  END IF;

  -- Test customer
  INSERT INTO public.customers (name, customer_type, tenant_id, is_active, current_balance)
    VALUES ('TEST CN Customer', 'individual', v_tenant, true, 0)
    RETURNING id INTO v_cust;

  -- Test invoice with one item (qty=10 @ 100)
  INSERT INTO public.invoices (
    invoice_number, customer_id, total_amount, paid_amount,
    status, payment_status, tenant_id, created_by
  )
  VALUES ('TEST-INV-CN-001', v_cust, 1000, 0, 'approved', 'pending', v_tenant, v_admin)
  RETURNING id INTO v_inv;

  INSERT INTO public.invoice_items (invoice_id, product_id, quantity, unit_price, total_price, tenant_id)
  VALUES (v_inv, v_prod, 10, 100, 1000, v_tenant)
  RETURNING id INTO v_inv_item;

  -- Second unrelated invoice (used for wrong-linkage test)
  INSERT INTO public.invoices (
    invoice_number, customer_id, total_amount, paid_amount,
    status, payment_status, tenant_id, created_by
  )
  VALUES ('TEST-INV-CN-OTHER', v_cust, 500, 0, 'approved', 'pending', v_tenant, v_admin)
  RETURNING id INTO v_other_inv;

  INSERT INTO public.invoice_items (invoice_id, product_id, quantity, unit_price, total_price, tenant_id)
  VALUES (v_other_inv, v_prod, 5, 100, 500, v_tenant)
  RETURNING id INTO v_other_inv_item;

  RAISE NOTICE '✅ Setup OK  tenant=%  invoice=%  item=%', v_tenant, v_inv, v_inv_item;

  -- ────────────────────────────────────────────────────────────────────────
  -- TEST 1: Validation rejects credit note with NO items and NO amount
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.credit_notes (credit_note_number, invoice_id, customer_id, amount, status, tenant_id, created_by)
    VALUES ('TEST-CN-EMPTY', v_inv, v_cust, 0, 'draft', v_tenant, v_admin)
    RETURNING id INTO v_cn1;

  v_validation := public.validate_credit_note_before_confirm(v_cn1);
  ASSERT (v_validation->>'ok')::boolean = false,
    'TEST 1 FAILED — empty credit note should not validate. Got: ' || v_validation::text;
  RAISE NOTICE '✅ TEST 1: empty credit note correctly rejected (errors=%)', v_validation->'errors';

  -- ────────────────────────────────────────────────────────────────────────
  -- TEST 2: Validation rejects item linked to a DIFFERENT invoice
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.credit_notes (credit_note_number, invoice_id, customer_id, amount, status, tenant_id, created_by)
    VALUES ('TEST-CN-WRONGINV', v_inv, v_cust, 100, 'draft', v_tenant, v_admin)
    RETURNING id INTO v_cn2;

  -- Bypass the BEFORE INSERT trigger to seed bad data on purpose
  ALTER TABLE public.credit_note_items DISABLE TRIGGER trg_validate_credit_note_item;
  INSERT INTO public.credit_note_items (credit_note_id, invoice_item_id, product_id, quantity, unit_price, total_price, tenant_id)
    VALUES (v_cn2, v_other_inv_item, v_prod, 1, 100, 100, v_tenant);
  ALTER TABLE public.credit_note_items ENABLE TRIGGER trg_validate_credit_note_item;

  v_validation := public.validate_credit_note_before_confirm(v_cn2);
  ASSERT (v_validation->>'ok')::boolean = false,
    'TEST 2 FAILED — wrong-invoice linkage should be rejected. Got: ' || v_validation::text;
  RAISE NOTICE '✅ TEST 2: wrong-invoice linkage correctly rejected';

  -- ────────────────────────────────────────────────────────────────────────
  -- TEST 3: Trigger blocks INSERT exceeding returnable quantity
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.credit_notes (credit_note_number, invoice_id, customer_id, amount, status, tenant_id, created_by)
    VALUES ('TEST-CN-OVERDRAW', v_inv, v_cust, 1100, 'draft', v_tenant, v_admin)
    RETURNING id INTO v_cn3;

  BEGIN
    INSERT INTO public.credit_note_items (credit_note_id, invoice_item_id, product_id, quantity, unit_price, total_price, tenant_id)
      VALUES (v_cn3, v_inv_item, v_prod, 11, 100, 1100, v_tenant);  -- 11 > sold 10
    RAISE EXCEPTION 'TEST 3 FAILED — overdraw insert should have raised';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err NOT ILIKE '%exceeds returnable%' AND v_err NOT ILIKE 'TEST 3 FAILED%' THEN
      RAISE EXCEPTION 'TEST 3 FAILED — wrong error: %', v_err;
    END IF;
    IF v_err LIKE 'TEST 3 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE '✅ TEST 3: overdraw INSERT correctly blocked (%)', v_err;
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- TEST 4: Happy path — valid items pass validation, amount auto-recomputed
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.credit_note_items (credit_note_id, invoice_item_id, product_id, quantity, unit_price, total_price, tenant_id)
    VALUES (v_cn3, v_inv_item, v_prod, 3, 100, 300, v_tenant);

  v_validation := public.validate_credit_note_before_confirm(v_cn3);
  ASSERT (v_validation->>'ok')::boolean = true,
    'TEST 4 FAILED — valid CN should pass validation. Got: ' || v_validation::text;
  -- Header amount (1100) ≠ items total (300) → expect a warning
  ASSERT jsonb_array_length(v_validation->'warnings') > 0,
    'TEST 4 FAILED — expected amount-mismatch warning';
  RAISE NOTICE '✅ TEST 4: validation OK with mismatch warning (warnings=%)', v_validation->'warnings';

  -- Confirm via RPC — must succeed and rewrite amount to 300
  v_result := public.confirm_credit_note(v_cn3);
  ASSERT (v_result->>'success')::boolean = true,
    'TEST 4 FAILED — confirm should succeed. Got: ' || v_result::text;
  ASSERT (v_result->>'amount')::numeric = 300,
    'TEST 4 FAILED — amount should be recomputed to 300. Got: ' || v_result::text;
  RAISE NOTICE '✅ TEST 4: confirm succeeded, amount recomputed to %', v_result->>'amount';

  -- Invoice paid_amount must now be 300
  ASSERT (SELECT paid_amount FROM public.invoices WHERE id = v_inv) = 300,
    'TEST 4 FAILED — invoice.paid_amount should be 300';
  RAISE NOTICE '✅ TEST 4: invoice.paid_amount updated to 300';

  -- Customer balance must be -300
  ASSERT (SELECT current_balance FROM public.customers WHERE id = v_cust) = -300,
    'TEST 4 FAILED — customer balance should be -300';

  -- ────────────────────────────────────────────────────────────────────────
  -- TEST 5: Cannot re-confirm an already-confirmed CN
  -- ────────────────────────────────────────────────────────────────────────
  BEGIN
    PERFORM public.confirm_credit_note(v_cn3);
    RAISE EXCEPTION 'TEST 5 FAILED — re-confirm should have raised';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 5 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE '✅ TEST 5: re-confirm correctly rejected (%)', v_err;
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- TEST 6: Cancel reverses balance + paid_amount
  -- ────────────────────────────────────────────────────────────────────────
  v_result := public.cancel_credit_note(v_cn3);
  ASSERT (v_result->>'success')::boolean = true,
    'TEST 6 FAILED — cancel should succeed. Got: ' || v_result::text;

  ASSERT (SELECT current_balance FROM public.customers WHERE id = v_cust) = 0,
    'TEST 6 FAILED — customer balance should return to 0';
  ASSERT (SELECT paid_amount FROM public.invoices WHERE id = v_inv) = 0,
    'TEST 6 FAILED — invoice paid_amount should return to 0';
  ASSERT (SELECT status FROM public.credit_notes WHERE id = v_cn3) = 'cancelled',
    'TEST 6 FAILED — CN status should be cancelled';
  RAISE NOTICE '✅ TEST 6: cancel reversed balance, paid_amount, and status';

  -- ────────────────────────────────────────────────────────────────────────
  -- TEST 7: After cancellation, returnable quantity is restored
  -- ────────────────────────────────────────────────────────────────────────
  ASSERT public.get_invoice_item_returnable(v_inv_item) = 10,
    'TEST 7 FAILED — returnable should be back to 10 after cancel';
  RAISE NOTICE '✅ TEST 7: returnable quantity restored to 10 after cancel';

  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE '🎉 ALL CREDIT-NOTE INTEGRATION TESTS PASSED';
  RAISE NOTICE '════════════════════════════════════════════';
END $$;

ROLLBACK;
