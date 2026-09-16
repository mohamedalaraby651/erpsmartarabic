# OPA-JRN-001 — Journey Verification + Blocker Remediation

- Unit ID: `OPA-JRN-001`
- Type: Execute & Verify (journey verification + direct-blocker remediation only)
- Verdict: **EXECUTED — PASS (with recorded findings)** · NOT CERTIFIED
- Smart Freeze: ACTIVE — no mutation executed on inventory, ledger, payments, tenancy, RLS, migrations
- Evidence method: live browser session (real authenticated user) + read-only database queries

---

## 1. Rules applied

- Per step: Precondition → User Action → Handler/Backend Operation → Expected State Transition → Persisted State → UI Confirmation → Evidence.
- Failure rule: BLOCKER? Yes → fix strictly inside scope → retest. No → log finding, no scope expansion.
- 4.3 Inventory and 4.5 Finance: READ / VERIFY ONLY. No synthetic movements, no posting, no payment/journal/period mutation.
- Contradictory numbers between reports are recorded as separate observations, never merged.

---

## 2. Journey 4.1 — Sales

Verified chain (pre-existing records, no mutation):
`QTN-20250305-0007 → SO-20250220-0006 → INV-20250101-0009 → PAY (7,130)`

| Step | Expected state transition | Persisted state (DB) | UI confirmation | Result |
|---|---|---|---|---|
| Customer | customer exists and is referenced downstream | `customers` = 15; 0 orphan invoice→customer | customer "فاطمة عبد الرحمن" shown on all three documents | PASS |
| Product | item carried through the chain | same item/price on quotation, order, invoice | "شاشة سامسونج 27 بوصة" 1 × 6,200 on all three | PASS |
| Quotation | quotation persisted with totals | subtotal 6,200 + tax 930 = 7,130 | quotation detail shows 7,130 | PASS |
| Approval | approved quotation feeds order | `sales_orders.quotation_id` set; 0 orphan links; 0 customer mismatch | order detail shows "من عرض سعر: QTN-20250305-0007" | PASS |
| Sales Order | order reflects the quotation | totals identical (7,130) | deal path widget shows QTN → SO → INV | PASS |
| Invoice | invoice reflects the order | `invoices.order_id` set; 0 orphan links; 0 total mismatch (22/22 invoices) | invoice detail shows source sales order + 7,130 | PASS |
| Payment | payment reduces the outstanding balance | payments 7,130 = `paid_amount` 7,130 | "نسبة السداد 100% · المتبقي 0" | PASS |
| Print | print surface reachable from the real record | — | "طباعة" available on quotation/order/invoice detail | PASS (full print fidelity deferred to Phase 6) |
| Notification | notifications persist | `notifications` = 250 rows | notification counter rendered in the shell | PASS |
| Report | report screen renders real figures | invoices read successfully | screen was stuck loading → **blocker fixed**, now renders KPIs, tabs and charts | PASS after fix |

Aggregate read-only integrity (whole tenant):
- invoice total = subtotal − discount + tax: 0 mismatches out of 22
- invoice → sales order → quotation customer consistency: 0 mismatches
- payments referencing a missing invoice row: 0

## 3. Journey 4.2 — Purchasing

| Step | Result | Evidence |
|---|---|---|
| Supplier | PASS | 27 suppliers, 0 orphan purchase-order → supplier links |
| Purchase Order | PASS | 7 orders render with supplier, totals, status |
| Goods Receipt | **UNVERIFIED — NO DATA** | `goods_receipts` = 0 rows; creating one is a stock movement under Smart Freeze → requires independent authorization |
| Purchase Invoice | **UNVERIFIED — NO DATA** | `purchase_invoices` = 0 rows; creating one is a finance posting under Smart Freeze |
| Supplier Payment | PARTIAL | 5 supplier payments persisted, but cannot be tied to a receipt/invoice because those tables are empty |

No alternative path was invented; the chain beyond the purchase order is recorded as unverified rather than assumed.

## 4. Journey 4.3 — Inventory (READ / VERIFY ONLY)

- `product_stock` = 20 rows, `stock_movements` = 15 rows, 0 orphan product references, 0 null tenant.
- Movement types present: `in` (5 via purchase_order, 1 without reference), `out` (4 via invoice), `transfer` (3), `adjustment` (2).
- Inventory screen renders stock per warehouse with correct low-stock flags (e.g. UPS 3 < 10, راوتر 0 < 8).
- Finding INV-OBS-001 (P3, not fixed): 6 movements carry no `reference_type`, so "Expected Stock = Recorded Movement Result" cannot be fully reconstructed from movements alone for those rows. No mutation performed.

## 5. Journey 4.4 — HR

- Employees screen loads 6 employees with department, title and status.
- Payroll: **UNAVAILABLE / OUT OF SCOPE** — no payroll module exists in the codebase. No substitute path invented.

## 6. Journey 4.5 — Finance (Operational Read-Only)

- Chart of accounts, journals (42 rows) and the accounting posting log render without errors.
- `/accounting` now resolves (fixed earlier under `OPA-P1-NAZRA-001`).
- Posting log is empty ("no journal entries generated yet") — consistent with the absence of goods receipts / purchase invoices.

Findings (recorded, **not** fixed — Smart Freeze):
- **FIN-OBS-001 (P1, finance consistency):** 3 invoices show `paid_amount = 0` while payments exist against them — `INV-20250215-0006` (payments 20,000), `INV-20250225-0008` (15,000), `INV-20250120-0013` (2,000). Requires independent authorization before any ledger/balance correction.
- **FIN-OBS-002 (informational):** 6 payments have no `invoice_id` (on-account payments). The UI renders them with "-" in the invoice column; treated as a legitimate feature, not a defect.

---

## 7. Blockers fixed inside scope

| ID | Severity | Blocker | Fix |
|---|---|---|---|
| RPT-001 | P1 | Reports screen never left its loading state, blocking the Report step of the sales journey. The date range was rebuilt on every render, changing the data query keys continuously. | `src/pages/reports/ReportsPage.tsx`: the range is now stable across renders. Retested live — KPIs, tabs and charts render. |
| QTN-STAT-001 | P2 (direct journey evidence) | Quotation status `completed` had no label, so a completed quotation showed an empty status cell — the journey's final state was not visible. | Added the `مكتمل` label/colour in `QuotationsPage.tsx` and `QuotationDetailsPage.tsx`. |

No other product source files were modified. No repository, migration, RLS, permission, posting or architecture change.
Separate DELTA: PRE-TS-001 recurrence #15 contained in the platform-owned `src/integrations/supabase/previewAuthStorage.ts` (type annotations only, no behaviour change).

## 8. Findings deferred (no scope expansion)

| ID | Severity | Finding |
|---|---|---|
| FIN-OBS-001 | P1 | Invoice `paid_amount` out of sync with recorded payments (3 invoices) — Smart Freeze, needs independent authorization |
| INV-OBS-001 | P3 | 6 stock movements without `reference_type` |
| PUR-OBS-001 | P2 | Goods receipt / purchase invoice steps unverifiable — no data, creation blocked by Smart Freeze |
| UI-OBS-001 | P3 | Breadcrumb shows raw route segments on accounting sub-pages ("accounting / posting-log") |
| UI-OBS-002 | P3 | Console warnings on every page: React `forwardRef` warning at `App`/`QueryClientProvider`, and CSP `frame-ancestors` delivered via `<meta>` (ignored by the browser) |

## 9. Quality gates after execution

- `scripts/audits/typecheck-app.mjs`: total=0 platform=0 project=0 → PASS
- `scripts/fitness/run-all.mjs`: active=33 pending=9 failures=0

---

**Verdict: EXECUTED — PASS.** Certification remains a separate human governance decision.
