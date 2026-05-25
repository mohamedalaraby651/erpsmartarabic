## Architectural Hotfix — Sales & Procurement (Phases 1–3)

### Phase 1 — RLS Hardening on `quotes`, `quote_items`, `credit_notes`, `credit_note_items`

Create a migration that drops the existing tenant‑only write policies and recreates them with section‑permission gates on top of tenant isolation. Reads stay tenant‑only.

```text
quotes / quote_items        → section='sales'    actions: create | edit | delete
credit_notes / cn_items     → section='invoices' actions: create | edit | delete
```

Pattern (per table):

```sql
DROP POLICY ... ON public.quotes;

CREATE POLICY "tenant_quotes_insert" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant()
    AND check_section_permission(auth.uid(), 'sales', 'create')
  );

CREATE POLICY "tenant_quotes_update" ON public.quotes
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant())
  WITH CHECK (
    tenant_id = get_current_tenant()
    AND check_section_permission(auth.uid(), 'sales', 'edit')
  );

CREATE POLICY "tenant_quotes_delete" ON public.quotes
  FOR DELETE TO authenticated
  USING (
    tenant_id = get_current_tenant()
    AND status = 'draft'                                  -- preserve current safety rule
    AND check_section_permission(auth.uid(), 'sales', 'delete')
  );
```

Repeat for `quote_items` (split the current `tenant_qitems_all` into 4 commands), `credit_notes`, and `credit_note_items` (use `'invoices'` section).

Harden conversion RPCs (`convert_quote_to_order`, `convert_order_to_invoice`, `convert_invoice_to_delivery`):

- Replace each function body with `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER` that first calls `check_section_permission(auth.uid(), 'sales', 'create')` (and `'edit'` on the source row's status flip) and `RAISE EXCEPTION 'PERMISSION_DENIED'` if false. Preserve existing logic verbatim below the guard.

### Phase 2 — Atomic `save_invoice_with_items` RPC

New migration adding a single PL/pgSQL RPC that wraps header upsert + item replace inside one transaction:

```sql
CREATE OR REPLACE FUNCTION public.save_invoice_with_items(
  p_id uuid,                 -- null = create
  p_header jsonb,
  p_items  jsonb             -- array of {product_id, quantity, unit_price, discount_percentage, total_price, ...}
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_tenant uuid := get_current_tenant();
BEGIN
  IF NOT check_section_permission(auth.uid(),'invoices', CASE WHEN p_id IS NULL THEN 'create' ELSE 'edit' END) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO invoices SELECT * FROM jsonb_populate_record(NULL::invoices, p_header || jsonb_build_object('tenant_id',v_tenant))
    RETURNING id INTO v_id;
  ELSE
    UPDATE invoices SET ... FROM jsonb_populate_record(NULL::invoices, p_header) src
      WHERE invoices.id = p_id AND invoices.tenant_id = v_tenant
    RETURNING id INTO v_id;
    DELETE FROM invoice_items WHERE invoice_id = v_id;
  END IF;

  INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percentage, total_price, tenant_id)
  SELECT v_id, (it->>'product_id')::uuid, (it->>'quantity')::numeric,
         (it->>'unit_price')::numeric, COALESCE((it->>'discount_percentage')::numeric,0),
         (it->>'total_price')::numeric, v_tenant
  FROM jsonb_array_elements(p_items) it;

  RETURN v_id;
END $$;
```

Refactor `src/lib/services/invoiceService.ts → saveInvoiceWithItems` to call `supabase.rpc('save_invoice_with_items', { p_id, p_header, p_items })` and return `data as string`. Remove the 3‑step repository sequence. Keep existing exports/signatures so callers (`InvoiceFormDialog`, etc.) don't change. Delete the obsolete `verifyPermissionOnServer` call there — permission is now enforced DB‑side.

### Phase 3 — Unify Quotation Calculation Surface

Two legitimate persistence tables remain (`quotations` legacy + `quotes` sales‑cycle); we don't merge the tables here, we merge the **calculation contract**.

1. **Upgrade** `useQuotationItems` (`src/components/quotations/useQuotationItems.ts`):
  - Add `vatEnabled: boolean` + `vatRate = 0.14` inputs.
  - Apply strict rounding helper `r2(n) = Math.round(n*100)/100` to `total_price`, `subtotal`, `discount`, `tax`, `total`.
  - Expose computed `taxAmount`, `totalAfterDiscount`, `grandTotal`.
  - Add `validate()` that returns errors for missing product, qty≤0, negative discount, discount%>100.
2. **Refactor** `QuotationFormDialog` to consume the new fields (replace local `subtotal - discountAmount + taxAmount`, drop the free‑form `tax_amount` input, replace with a VAT 14% switch bound to the hook). Block `mutation.mutate` when `validate()` returns errors.
3. **Refactor** `QuoteNewPage` to:
  - Drop the inline `total = items.reduce(...)`.
  - Reuse `useQuotationItems` (passing a products list it already needs to fetch) and the same VAT toggle + validator.
  - Submit with `subtotal`, `discount_amount`, `tax_amount`, `total_amount` filled — extend `QuotationDraft` / `useCreateQuote` payload to carry them; map to `quotes` columns inside `quotationRepository.create`.
4. **Guardrail**: add a server‑side `BEFORE INSERT/UPDATE` trigger on both `quotations` and `quotes` that rejects rows where `ABS(total_amount - (subtotal - discount_amount + tax_amount)) > 0.01` → prevents inconsistent header metrics regardless of which form was used.

### Verification

- Run targeted suites: `bunx vitest run src/lib/services src/components/quotations src/hooks/sales-cycle src/lib/repositories`.
- Then full run: `bunx vitest run`. Target: all green (current baseline 307).
- Manual smoke (Lovable preview): create quote from both entry points, edit invoice, attempt delete as a no‑permission user → expect `PERMISSION_DENIED`.

### Out of scope (called out, not done here)

- Adding a real `tax_rate` column to `invoices`/`quotes` (audit Item 8) — separate migration.
- Stock reservation on invoice approval (audit Item 9).
- Merging `quotations` and `quotes` tables — requires data migration plan.
- Act as a Principal Software Architect and Database Administrator. We need to implement a critical Architectural Hotfix across Phases 1, 2, and 3 for our Sales & Procurement modules. Follow these specifications exactly while maintaining our passing test baseline (307 tests):

### Phase 1 — RLS Hardening & Conversion Guards

1. Database Migration: Drop existing tenant-only write policies for `quotes`, `quote_items`, `credit_notes`, and `credit_note_items`. Recreate them with combined tenant isolation AND section-permission gates (`check_section_permission(auth.uid(), section, action)`).

   - `quotes` / `quote_items` -> section='sales', actions: INSERT ('create'), UPDATE ('edit'), DELETE ('delete' + preserve `status = 'draft'`).

   - `credit_notes` / `credit_note_items` -> section='invoices', actions: create | edit | delete.

   - Read policies remain broadly tenant-isolated.

2. Harden RPC Functions: Update `convert_quote_to_order`, `convert_order_to_invoice`, and `convert_invoice_to_delivery` to be `SECURITY DEFINER`. Inject a permission check at the very top using `check_section_permission(auth.uid(), 'sales', 'create')` (and check 'edit' for source row status transitions). RAISE EXCEPTION 'PERMISSION_DENIED' if unauthorized.

&nbsp;

### Phase 2 — Atomic save_invoice_with_items RPC

1. Database Migration: Create the `public.save_invoice_with_items(p_id uuid, p_header jsonb, p_items jsonb)` PL/pgSQL function as specified. It must perform permission checks, upsert the invoice header, wipe old items (on edit), bulk insert item rows, inject `tenant_id`, and run as a single atomic transaction.

2. Refactor Service: Update `src/lib/services/invoiceService.ts` -> `saveInvoiceWithItems` to exclusively call `supabase.rpc('save_invoice_with_items', ...)`. Remove the obsolete 3-step repository round-trips and delete the redundant `verifyPermissionOnServer` call (now secured database-side). Maintain backward-compatible signatures.

&nbsp;

### Phase 3 — Unify Quotation Calculation Surface

1. Upgrade `useQuotationItems` (`src/components/quotations/useQuotationItems.ts`):

   - Add `vatEnabled: boolean` and `vatRate = 0.14` inputs.

   - Apply a strict rounding helper `r2(n) = Math.round(n * 100) / 100` to `total_price`, `subtotal`, `discount`, `tax`, and `total`.

   - Expose computed reactive values: `taxAmount`, `totalAfterDiscount`, `grandTotal`, and a `validate()` function (flags product missing, qty <= 0, negative discount, discount% > 100).

2. Refactor UI Surfaces:

   - Update `QuotationFormDialog.tsx`: Consume the upgraded hook, swap the free-form `tax_amount` input with a premium 14% VAT switch bound to `vatEnabled`. Block mutation if `validate()` yields errors.

   - Update `QuoteNewPage.tsx`: Drop inline calculation loops. Reuse the upgraded `useQuotationItems` hook with the same VAT toggle and validator. Ensure the `useCreateQuote` mutation payloads now fully carry `subtotal`, `discount_amount`, `tax_amount`, and `total_amount` mapped to quotes columns via `quotationRepository.create`.

3. Database Invariant Guardrail: Add a server-side `BEFORE INSERT/UPDATE` trigger on both `quotations` and `quotes` tables that mathematically rejects any row where `ABS(total_amount - (subtotal - discount_amount + tax_amount)) > 0.01` to guarantee absolute data health regardless of the entry point.

&nbsp;

Run targeted and full test suites to verify that our 307 test baseline remains brilliantly green.

&nbsp;