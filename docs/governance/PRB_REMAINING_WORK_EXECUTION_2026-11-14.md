# Approved remaining work — execution evidence

## Implemented scope
- Presentation-only configurable RTL tables in suppliers, payments, expenses, products and purchase invoices; existing data ownership and permissions retained.
- Mobile expandable cards, amount formatting and incremental list exposure; no new virtualization.
- Supplier/payment query cache includes cumulative page size. Product list requests cumulative rows. Expenses/purchase invoices reveal already-fetched rows locally, not server pagination.
- Payment form reference reads moved from presentation into repository/query hooks; customer summary consumes the masked customer view.
- Local form experience in payment/journal/sales-order/quotation forms: existing lifecycle retained, tenant/user/document draft keys, seven-day retention, restore/discard, guarded close, Ctrl+S and first invalid field focus. Existing financial validation was not relaxed.
- Draft autosave does not overwrite an unresolved prior draft or save pristine forms. Concurrent submissions share a write lock.
- Shared Excel export adds company header, optional logo, extraction date, related-column resolution and selected-column ordering, retaining numeric values.

## Verification
- Full Vitest run: 176 files passed, 1 file skipped; 1717 tests passed, 5 skipped.
- Focused final run: 35 tests passed after final form/table adjustments.
- Latest automatic preview check: build OK at 01:44:34 UTC.
- Authenticated browser: desktop 1280×1800 and mobile 393×708; populated suppliers (25→27), payments (21), expenses (12), products (18); no page-level horizontal overflow or page errors.
- Purchase invoices contained no rows: only empty-state rendering verified; populated interactions are not claimed.
- Supplier short-height table: scrollTop=200, header top unchanged at 489.5; hiding phone column persisted after reload. Test preferences restored.
- Payment form: typed local notes, closed through unsaved confirmation, reopened and restored exact notes through UI; Ctrl+S revealed required-field errors. Test draft discarded; no payment created.
- Real payment Excel download: 37,273 bytes; workbook contains embedded company-logo PNG and worksheet drawing relationship. Native Excel/LibreOffice rendering not verified.

## Explicitly unfinished
- Purchase-order, expense, credit-note and logistics form integration; remaining list surfaces, report/statements/audit generalization, print contexts and broader mobile workflows.
- Financial reversal, discount/overdraft approval consumption and rounding ledger. Authorization and backup confirmation exist, but implementation must preserve original payments and avoid duplicate balance reversal from DELETE triggers. Closed original period must block reversal until its reopening is approved. No financial schema/business-rule change made in this execution.
- Owner decisions 361–363 remain unresolved; no answers inferred.
- New sales-order/quotation/journal form integrations have focused regression coverage, not successful financial write/read-back browser proof.

These changes are implemented and verified only to the limits above; this record is not closure of the full eight-stage plan.