# Phase 3 — Automated Posting Pipeline

Connect Sales / Procurement / Logistics documents to the verified GL through a single atomic DB engine and a thin Edge-Function dispatcher. No breaking changes — current code paths keep working until the new RPC is invoked.

## 1. Database — `post_document_atomic` RPC (migration)

`public.post_document_atomic(p_event text, p_source_type text, p_source_id uuid, p_context jsonb) returns uuid`

- `SECURITY DEFINER`, `SET search_path=public`, `EXECUTE` revoked from `PUBLIC`/`anon`, granted to `authenticated` + `service_role`.
- Resolves `tenant_id` from `get_current_tenant()` (or `p_context->>'tenant_id'` when called from service-role Edge Functions).
- Enforces `check_section_permission(auth.uid(),'accounting','create')` when invoked by an end-user.

Transaction body (single BEGIN/EXCEPTION block):

1. **Idempotency** — `SELECT journal_id FROM document_posting_log WHERE tenant_id=? AND document_type=p_source_type AND document_id=p_source_id AND reason=p_event AND status='posted'`. If found, return it (no-op).
2. **Rule lookup** — read declarative rules from a new seed table `posting_rules_registry(event, side, account_key, amount_path, memo)` *or* (lighter) accept the lines array inside `p_context->'lines'` produced by `posting.rules.ts`. Plan choice: pass `lines` from app to keep one source of truth.
3. **Account resolution** — for each line:
  - `SELECT account_id FROM posting_account_map WHERE tenant_id=? AND posting_key=line.account_code`.
  - Fallback: `SELECT id FROM chart_of_accounts WHERE tenant_id=? AND code=line.account_code`.
  - Raise `check_violation` with Arabic message if neither resolves.
4. **Rounding & balance** — `round(amount::numeric, 2)`; assert `sum(debits)=sum(credits)` to 0.01, else raise.
5. **Insert** `journals` header (status='posted', source_type, source_id, event, journal_date from context, fiscal_period auto-resolved by existing trigger) → returns `journal_id`.
6. **Insert** `journal_entries` rows (debit/credit, memo, line_no).
7. **Audit success** — insert `document_posting_log(status='posted', reason=p_event, journal_id, total_amount)`.
8. **EXCEPTION WHEN OTHERS** — `ROLLBACK` implicit, then in a fresh autonomous insert (via `pg_background` not available → use `INSERT … ON CONFLICT DO NOTHING` after re-raising? — actual choice: log failure via SECURITY DEFINER helper `log_posting_failure(...)` declared `volatile` and called from the EXCEPTION block, which uses a SAVEPOINT pattern so the failure row survives). Re-raise so the caller sees the error.

Companion helpers:

- `log_posting_failure(tenant uuid, doc_type text, doc_id uuid, event text, reason text)` — minimal insert, used inside EXCEPTION block.
- Reuse existing `enforce_fiscal_period_open` trigger from Phase 1.

## 2. Application layer

### `src/lib/financial-engine/posting.rules.ts`

Add three new declarative rules (no logic change to existing ones):

- `goods_receipt.posted` — DR `INVENTORY` / CR `GR_IR_CLEARING` (new constant `'1250'`).
- `purchase_invoice.posted` — DR `GR_IR_CLEARING` + DR `TAX_INPUT` (new `'1290'`) / CR `ACCOUNTS_PAYABLE`.
- `inventory.adjustment` — DR/CR `INVENTORY` ↔ `INVENTORY_ADJUSTMENT` (`'5100'`).

Migration also seeds the new COA codes per tenant (idempotent `INSERT … ON CONFLICT DO NOTHING`).

### New helper `src/lib/financial-engine/dispatcher.ts`

`postDocument(event, sourceType, sourceId, ctx)` — resolves rule → builds `lines[]` with rounded amounts → calls `supabase.rpc('post_document_atomic', {...})` → returns `journal_id`. Centralises error mapping to Arabic toasts via `mapRepoError`.

### Edge-function wiring (idempotent, additive)

- `supabase/functions/approve-invoice/index.ts` — after status flips to `approved`, call `post_document_atomic` with `event='invoice.approved'` and `lines` built server-side (subtotal/tax/total). Existing direct `journals` insert (if any) gated by `if (!alreadyPostedViaRpc)` to avoid double posting during rollout.
- `supabase/functions/process-payment/index.ts` — on successful capture, fire `payment.received` with `amount`, debit account = `BANK` if `payment_method='bank'` else `CASH`.
- `supabase/functions/approve-expense/index.ts` — fire `expense.approved`.
- `_shared/posting.ts` — thin Deno helper that mirrors `dispatcher.ts` so both browser and edge use the same payload shape.

No existing function signatures change; only an extra RPC call is appended.

## 3. Tests

- `src/__tests__/unit/financial-engine/dispatcher.test.ts` — pure unit: rule lookup, rounding, balance assertion, unknown event throws.
- `src/__tests__/unit/financial-engine/posting.rules.test.ts` — adds cases for the 3 new rules (balance equality).
- `src/__tests__/integration/automated-posting.test.ts` — full lifecycle against the test Supabase project:
  1. seed COA + posting_account_map for a test tenant
  2. create invoice → call `approve-invoice` → assert `journals` + 3 `journal_entries` + 1 `document_posting_log(status=posted)`
  3. re-invoke same event → assert idempotency (no duplicate journal)
  4. create payment → call `process-payment` → assert DR Bank / CR AR balanced
  5. attempt posting in a **closed** fiscal period → expect `check_violation` and `document_posting_log(status=failed)`
  6. RLS negative: anon role cannot insert into `document_posting_log` directly.

Target: **1170 → ~1185 green**. Run `bunx vitest run` at the end.

## 4. Rollout safety

- All migrations are additive (new function, new COA rows, no column drops).
- Old code paths remain; new RPC is opt-in per edge function and protected by idempotency key.
- Failure path always writes a `document_posting_log` row, so observability is preserved.
- Linter expected to stay flat (no new RLS surface beyond the existing `document_posting_log` service-role policy from Phase 1).

## Execution order

1. Migration: `post_document_atomic` + `log_posting_failure` + seed new COA codes.
2. Update `posting.rules.ts` + new `dispatcher.ts` + shared Deno helper.
3. Wire `approve-invoice`, `process-payment`, `approve-expense`.
4. Add unit + integration tests.
5. `bunx vitest run` → confirm green, then hand back for Phase 4 signal.
6. Act as a Principal Database Architect and Senior Edge-Functions Developer. Phase 2 (Repositories & Hooks) is fully complete with 1170/1170 passing tests. We are now executing "Phase 3: Automated Posting Pipeline" to connect Sales, Procurement, and Logistics documents to our General Ledger atomically.

Please safely implement the following updates:

&nbsp;

1. Database Layer (PostgreSQL Migration):

- Create a SECURITY DEFINER function `public.post_document_atomic(p_event text, p_source_type text, p_source_id uuid, p_context jsonb)` returning `uuid`. Revoke EXECUTE from PUBLIC/anon; grant to authenticated + service_role.

- Inside a single atomic transaction block:

  a. Idempotency: Return existing journal_id if a matching `posted` trail exists in `document_posting_log` for this document, event, and tenant.

  b. Resolve `account_id` from `posting_account_map` based on `line.account_code`, fallback to `chart_of_accounts.code`, or raise a descriptive Arabic check_violation.

  c. Assert total debits strictly equal total credits to 0.01 precision after rounding amounts via `round(amount::numeric, 2)`.

  d. Insert into `journals` header and bulk insert `journal_entries` lines. Write a success row to `document_posting_log` with status='posted'.

- In the EXCEPTION block, use a SAVEPOINT pattern to roll back the broken ledger mutations while safely preserving a failure audit row via a dedicated helper `log_posting_failure(...)` into `document_posting_log` with status='failed'. Then, re-raise the exception.

- Idempotently seed the new COA rows ('1250' GR/IR, '1290' Tax Input, '5100' Inventory Adjustment) via `INSERT ... ON CONFLICT DO NOTHING`.

&nbsp;

2. Application Layer & Rules Expansion:

- Extend `src/lib/financial-engine/posting.rules.ts` to include the three new declarative rules: `goods_receipt.posted`, `purchase_invoice.posted`, and `inventory.adjustment` with balanced debit/credit constants.

- Create helper `src/lib/financial-engine/dispatcher.ts` exposing `postDocument(...)` to build payloads, invoke the RPC, and route errors cleanly via `mapRepoError` into Arabic toasts.

- Create a mirrored thin Deno helper in `supabase/functions/_shared/posting.ts`.

&nbsp;

3. Edge Functions Integration:

- Update `supabase/functions/approve-invoice/index.ts` to call `post_document_atomic` upon moving to approved. Gate legacy inline journals insert behind an `if (!alreadyPostedViaRpc)` conditional to ensure zero double-posting.

- Update `supabase/functions/process-payment/index.ts` to fire `payment.received` assigning debit to Bank/Cash based on payment method.

- Update `supabase/functions/approve-expense/index.ts` to fire `expense.approved`.

&nbsp;

4. Test Suite Implementation:

- Add unit tests in `src/__tests__/unit/financial-engine/dispatcher.test.ts` and `posting.rules.test.ts`.

- Create a complete lifecycle integration test `src/__tests__/integration/automated-posting.test.ts` to simulate: Invoice creation -> approve-invoice execution -> verifying balanced GL states -> verifying idempotency -> asserting fiscal closure rejection -> testing RLS negative boundaries.

&nbsp;

Execute `bunx vitest run` at the end to confirm our test baseline scales flawlessly to green (~1185/1185)!

&nbsp;