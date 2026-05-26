
# SmartERP — Accounting / Finance / General Ledger Architecture Audit

> Reference document for the engineering advisor.
> Scope: current state of the GL/Accounting subsystem as it exists in `main` today (no proposed changes — diagnostic only).

---

## 1. Accounting Components & File Map

### 1.1 Frontend — Pages
| Path | LOC | Responsibility |
|---|---|---|
| `src/pages/accounting/ChartOfAccountsPage.tsx` | 396 | CRUD + tree view for Chart of Accounts |
| `src/pages/accounting/JournalEntriesPage.tsx` | 298 | List, create, post, drill into journals |
| `src/pages/accounting/PostingLogPage.tsx` | 168 | Read-only viewer for `document_posting_log` |

### 1.2 Frontend — Components
| Path | LOC | Responsibility |
|---|---|---|
| `src/components/accounting/AccountFormDialog.tsx` | 295 | Create/edit a single COA account (code, name, type, parent, normal balance) |
| `src/components/accounting/JournalFormDialog.tsx` | 335 | Manual journal entry editor with debit/credit line grid |
| `src/components/accounting/JournalDetailDialog.tsx` | 217 | Read-only journal viewer + post action |

### 1.3 Financial Engine Library
| Path | LOC | Responsibility |
|---|---|---|
| `src/lib/financial-engine/index.ts` | 5 | Barrel exports |
| `src/lib/financial-engine/posting.rules.ts` | 170 | Declarative posting rules (5 events) + balance check |
| `src/lib/financial-engine/journal.service.ts` | 84 | `createJournalFromEvent()` — bridges rules → `create-journal` Edge Function |
| `src/lib/financial-engine/ledger.service.ts` | 100 | Read-side ledger queries |
| `src/lib/financial-engine/period.service.ts` | 47 | Fiscal period helpers |
| `src/lib/financial-engine/reconciliation.service.ts` | 52 | Reconciliation skeleton |

### 1.4 Edge Functions
| Function | Role |
|---|---|
| `supabase/functions/create-journal` | Atomic insert of journal + entries with idempotency key |
| `supabase/functions/approve-invoice` | Marks invoice approved (does **not** currently call posting engine end-to-end) |
| `supabase/functions/approve-expense` | Same pattern for expenses |
| `supabase/functions/process-payment` | Customer payment handler |
| `supabase/functions/event-dispatcher` | Generic event router (underused by accounting) |

### 1.5 Dedicated Hooks
**None.** There is no `useJournals`, `useChartOfAccounts`, or `useFiscalPeriods` hook — pages query Supabase directly via inline `useQuery`. This is an inconsistency vs. the rest of the codebase (Sales/Procurement all have repository + hook layers).

### 1.6 Repository Layer
**Missing.** There is no `accountingRepository.ts` / `journalRepository.ts` under `src/lib/repositories/`. Every other domain (invoices, quotations, purchase orders, credit notes, payments…) has one.

---

## 2. Database Schema & Supabase Finance Layer

### 2.1 Tables
| Table | Key Columns | Notes |
|---|---|---|
| `chart_of_accounts` | `code`, `name`, `name_en`, `account_type` (enum), `parent_id`, `normal_balance` (enum), `current_balance`, `is_active`, `tenant_id` | Self-referential hierarchy. `current_balance` is a denormalized cache — **no trigger maintains it**. |
| `journals` | `journal_number`, `journal_date`, `fiscal_period_id`, `description`, `is_posted`, `posted_at`, `posted_by`, `total_debit`, `total_credit`, `source_type`, `source_id`, `tenant_id` | Header table; totals auto-computed by trigger. |
| `journal_entries` | `journal_id`, `account_id`, `line_number`, `debit_amount`, `credit_amount`, `memo`, `tenant_id` | Lines. No cost-center / project / currency columns. |
| `journal_reversals` | `original_journal_id`, `reversal_journal_id`, `reason`, `reversed_by` | Append-only reversal audit. |
| `fiscal_periods` | `name`, `start_date`, `end_date`, `is_closed`, `closed_at`, `closed_by`, `tenant_id` | Closure flag exists; **not enforced on journal insert** (see §4). |
| `posting_account_map` | tenant-scoped mapping table for posting events → accounts | Read-by-tenant, write-by-admin. |
| `document_posting_log` | `document_type`, `document_id`, `document_number`, `journal_id`, `status`, `reason`, `total_amount`, `created_by`, `tenant_id` | Audit trail of auto-postings. |
| `bank_accounts` | `bank_name`, `account_name`, `account_number`, `iban`, `current_balance`, `is_active`, `tenant_id` | Operational, **not linked** to COA. |

### 2.2 RLS Policies (current)
All accounting tables have `tenant_id = get_current_tenant()` as the base predicate. Permission layering:

| Table | View | Insert | Update | Delete |
|---|---|---|---|---|
| `chart_of_accounts` | `check_section_permission('accounting','view')` | **no WITH CHECK** (open insert if tenant matches) | `check_section_permission(...,'edit')` | `check_section_permission(...,'delete')` |
| `journals` | `...'view'` | **no WITH CHECK** | `...'edit'` | `...'delete'` |
| `journal_entries` | `...'view'` | **no WITH CHECK** | `...'edit'` | `...'delete'` |
| `fiscal_periods` | `...'view'` | **no WITH CHECK** | `...'edit'` | `...'delete'` |
| `bank_accounts` | `has_role(admin)` OR `has_role(accountant)` | only admin | only admin | only admin |
| `posting_account_map` | tenant read | admin-only ALL | — | — |
| `document_posting_log` | tenant read | open insert | — | — |
| `journal_reversals` | tenant read | — | — | — |

**Observation:** INSERT policies on the four core accounting tables have a `<nil>` `WITH CHECK` clause in pg_policies output, meaning any authenticated user inside the tenant can insert as long as they pass the implicit USING — this is the strongest weakness in the current security posture (see §4).

### 2.3 Triggers
| Trigger | Table | Function | Purpose |
|---|---|---|---|
| `auto_journal_number` (BEFORE INSERT) | `journals` | `generate_journal_number()` | Assigns `JRN-YYYYMMDD-####` from `journal_seq` |
| `update_journal_totals_trigger` (AFTER INS/UPD/DEL) | `journal_entries` | `update_journal_totals()` | Recomputes `total_debit/credit` on header |
| `validate_journal_before_post` (BEFORE UPDATE) | `journals` | `validate_journal_balance()` | Blocks post if debit≠credit or totals=0; stamps `posted_at` |
| `trg_prevent_posted_journal_mutation` | `journals` | `prevent_posted_journal_mutation()` | Once posted: blocks DELETE & blocks UPDATE of amounts/date/period/source/`is_posted` |
| `trg_prevent_posted_journal_entry_mutation` | `journal_entries` | `prevent_posted_journal_entry_mutation()` | Blocks edit/delete of lines on posted journals; allows inserts only within a 5s grace window |
| `trg_protect_posted_journal` / `trg_protect_posted_journal_lines` | `journals` / `journal_entries` | `protect_posted_journal*` | Redundant secondary guard (overlap with the one above) |
| `audit_track_changes` + `log_*_changes` | journals, journal_entries, chart_of_accounts | `track_changes()`, `log_activity()` | Audit log writes |
| `trg_set_tenant_id` | journals, journal_entries | `set_tenant_id_default()` | Auto-fills tenant_id from JWT |
| `trg_posting_map_updated_at` | `posting_account_map` | `update_updated_at_column()` | Timestamp maintenance |

### 2.4 Stored Functions (accounting domain)
- `generate_journal_number()`
- `validate_journal_balance()`
- `update_journal_totals()`
- `prevent_posted_journal_mutation()`
- `prevent_posted_journal_entry_mutation()`
- `protect_journal_reversals_append_only()`
- `protect_posted_gr()`, `protect_posted_dn()`, `protect_posted_pinv()` (logistics-side posting protection)

---

## 3. Calculation Logic & Mathematical Safeguards

### 3.1 Backend (PostgreSQL — authoritative)
- **Balance validation:** `validate_journal_balance()` runs on `BEFORE UPDATE` of `journals` and rejects posting (`is_posted` flip from false→true) when `total_debit ≠ total_credit` or both are zero. Uses exact `numeric` comparison (no epsilon needed — Postgres numeric).
- **Totals integrity:** `update_journal_totals()` reaggregates `SUM(debit_amount)` / `SUM(credit_amount)` from lines after every INSERT/UPDATE/DELETE on `journal_entries`. The header totals cannot drift from line data.
- **Posted-immutability:** Two layered triggers (`prevent_posted_journal_mutation` + `protect_posted_journal`) refuse mutations to posted journals; reversal is the only way to correct, recorded in `journal_reversals` (append-only).
- **Precision:** `numeric` columns (no explicit `(p,s)` constraint visible — relies on application-side `Math.round(x*100)/100` standard, per project memory).
- **Sequence:** `journal_seq` provides monotonic suffix per day. **No gapless guarantee** — rollbacks burn numbers.

### 3.2 Frontend (TS)
- `resolvePosting(event, ctx)` in `posting.rules.ts` enforces balance with `Math.abs(totalDebit - totalCredit) < 0.01` (cent-tolerance epsilon).
- `JournalFormDialog.tsx` displays a live debit/credit summary but the actual post submission relies on the DB trigger as the source of truth.
- Edge Function `create-journal` constructs the header + lines atomically inside one RPC call.

### 3.3 Idempotency
`journal.service.ts` derives a stable idempotency key: `${source_type}:${source_id}:${event}` and passes it via `buildRequestHeaders` → prevents double-posting if the dispatcher re-fires the same event.

---

## 4. Structural Gaps, Flaws & Missing Capabilities

### 4.1 Architectural Gaps
1. **No repository / hooks layer for accounting** — pages query `supabase` directly, violating the project's repository-first pattern (see all other modules). Refactor target: `src/lib/repositories/journalRepository.ts`, `src/lib/repositories/coaRepository.ts`, `src/hooks/accounting/useJournals.ts`, etc.
2. **`createJournalFromEvent` is only referenced by tests.** No sales/procurement code path actually calls it — auto-posting is **not wired up**. The infrastructure exists but is dormant.
3. **`event-dispatcher` Edge Function is not subscribed to `invoice.approved` / `payment.received` / `credit_note.approved` / `supplier_payment.made` / `expense.approved` for journal creation.** Posting rules exist; the trigger to fire them does not.
4. **Logistics-side posting** (`protect_posted_gr/dn/pinv`) exists but its forward-posting path (GR/IR clearing → AP) is not bridged with the JS posting engine — two parallel systems are partially built.

### 4.2 Security / Data-Integrity Flaws
5. **Open INSERT policies on `chart_of_accounts`, `journals`, `journal_entries`, `fiscal_periods`** — `WITH CHECK` is `NULL`. Any authenticated tenant user can insert. Should be gated by `check_section_permission(..., 'create')`.
6. **`document_posting_log` INSERT is unrestricted** — any tenant user can forge a posting-log record. Should be restricted to `SECURITY DEFINER` RPCs only.
7. **`fiscal_periods.is_closed` is not enforced.** No trigger refuses a journal whose `journal_date` falls in a closed period. The flag is decorative.
8. **`chart_of_accounts.current_balance` has no maintenance trigger** — the cached balance will drift the moment any journal posts. UI showing balances from this column is misleading; real balance must be computed from `journal_entries`.
9. **Bank accounts are decoupled from COA** (no FK to `chart_of_accounts`). Cash/bank movements cannot reconcile against the GL.
10. **Duplicate protection triggers** (`prevent_posted_*` and `protect_posted_*`) — overlapping logic that risks divergence; consolidate.

### 4.3 Missing Capabilities
11. **No cost-center / project / department dimension** on `journal_entries` (no `cost_center_id`, `project_id`, `department_id`, `analytic_tag` columns). Reporting at any cut other than account+period is impossible.
12. **No multi-currency.** No `currency_code`, `exchange_rate`, `functional_amount` columns on lines or headers. No `currencies` or `exchange_rates` tables exist.
13. **No tax-detail table.** Posting rules credit `TAX_PAYABLE` as a single bucket; there is no per-rate / per-jurisdiction breakdown for VAT filings.
14. **No bank reconciliation tables.** `bank_accounts.current_balance` is unmaintained; no `bank_statements`, `bank_transactions`, or `reconciliation_matches`.
15. **No opening balances workflow.** No formal mechanism to seed prior-period balances when onboarding a tenant.
16. **No trial balance / P&L / Balance Sheet views or materialized views.** Reports must scan `journal_entries` ad-hoc.
17. **Gapless numbering not guaranteed** for legal/audit jurisdictions that require it (Egypt e-invoice scenario).
18. **No journal templates / recurring entries** (depreciation, accruals, payroll allocation).
19. **No period-end closing procedure** (revenue/expense → retained earnings).
20. **No accountant-only `app_role`-gated UI** — the `accountant` role exists in `bank_accounts` policy but is not used elsewhere; section permissions are the only gate.

### 4.4 UI / UX Gaps
21. `JournalFormDialog` has no inline balance indicator chip (debit vs credit running totals + delta).
22. No keyboard shortcut to add a balancing line (one-click "balance to debit/credit").
23. `ChartOfAccountsPage` tree does not show roll-up balances; flat-list only.
24. `PostingLogPage` is read-only with no filter by document type / status / date range.
25. No "View Source Document" deep-link from a posted journal back to invoice/payment.
26. No "Reverse Journal" action wired in the UI despite `journal_reversals` table being ready.
27. RTL Arabic error strings from triggers surface to users (good), but no toast-level mapping for `check_violation` ERRCODE.

### 4.5 Required Work to Reach Full Auto-Posting from Sales/Procurement
A. Add `WITH CHECK` policies (gate inserts by `check_section_permission(...,'create')`) — close §4.2 #5–#6.
B. Add `enforce_fiscal_period_open()` BEFORE-INSERT trigger on `journals` — close §4.2 #7.
C. Replace `chart_of_accounts.current_balance` with a view `v_account_balances` or a maintained trigger — close §4.2 #8.
D. Build `accountingRepository` + hooks layer (parity with other modules).
E. Wire `event-dispatcher` Edge Function to fan out `invoice.approved`, `payment.received`, `credit_note.approved`, `supplier_payment.made`, `expense.approved`, `goods_receipt.posted`, `purchase_invoice.posted` → call `createJournalFromEvent`.
F. Insert dispatcher calls into existing Edge Functions: `approve-invoice`, `process-payment`, credit-note approval RPC, supplier-payment RPC, GR/PINV posting RPCs.
G. Extend `posting.rules.ts` to cover procurement events (GR/IR clearing, supplier invoice posting, three-way match variance, inventory revaluation).
H. Add `cost_center_id` (nullable) to `journal_entries` + dimension tables.
I. Add multi-currency columns (`currency`, `fx_rate`, `functional_debit`, `functional_credit`) and an `exchange_rates` table.
J. Build trial balance + P&L + BS materialized views with `pg_cron` refresh (consistent with project's `mv-resilience-strategy` memory).
K. Consolidate the two posted-mutation trigger pairs into one canonical function.
L. Add UI reversal action + journal source-document deep links.

---

## Appendix — Quick Code Pointers
- Posting rules registry: `src/lib/financial-engine/posting.rules.ts:43`
- Journal creation API: `src/lib/financial-engine/journal.service.ts:24`
- Edge function: `supabase/functions/create-journal/index.ts`
- Validation trigger: `validate_journal_balance()` (DB)
- Immutability trigger: `prevent_posted_journal_mutation()` (DB)
- Integration test reference: `src/__tests__/integration/accounting-workflow.test.ts`
- Posted-immutability test: `src/__tests__/security/posted-journal-immutability.test.ts`

---

*End of audit. No code changes were made; this document is for advisory review. Approve this plan to have the report saved to `/mnt/documents/accounting-architecture-audit.md` as a downloadable artifact.*
