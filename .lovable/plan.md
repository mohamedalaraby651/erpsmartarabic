# UX-2B Wave 2B — Persistence, Composition Root & Integration (final v2, 3 reviewer addenda absorbed)

All five Wave-2B gates (G-IDEM, G-PLAN, G-GAP, G-VER, G-THIN) stand as previously approved. This revision integrates the three final addenda and records explicit migration approval.

---

## Three reviewer addenda — adopted

### A1 — `sequence` is the SOLE ordering authority
Locked into **ADR-0012 §D-0012-08 (new)**:
- `sequence` is the only field that determines event order during rehydration.
- `occurred_at` and `created_at` are **observational** (audit, debugging, monitoring). They MUST NOT be read by `EventStreamRehydrator`, `Invoice.fromHistory`, or any reducer.
- If `occurred_at` ever disagrees with `sequence`, **`sequence` wins** without exception (clock skew, network reorder, retried writes).
- Enforcement: the rehydrator already orders rows by `sequence` only. A new unit test `EventStreamRehydrator.ordering.test.ts` feeds rows whose `occurred_at` is in REVERSE chronological order but whose `sequence` is 1..N ascending, and asserts the aggregate rebuilds correctly with no error.

### A2 — `metadata` is operational, never a domain input
Locked into **ADR-0012 §D-0012-09 (new)**:
- `metadata` is reserved for tracing (`correlationId`, `causationId`), audit (actor, request id), and integration plumbing (outbox, retry counters).
- **NO** domain code may read `metadata` to make a business decision. Business truth lives exclusively in `payload`.
- Enforcement:
  - Extend `scripts/fitness/check-domain-purity.mjs` (or add a focused `check-metadata-non-domain.mjs` if cleaner) to ban the identifier `metadata` inside `src/domain/finance/**` outside the `DomainEvent` type re-export. Allowed sites: kernel type definitions only.
  - Round-trip codec tests assert `metadata` is preserved verbatim but the aggregate's `pullEvents()` reducers never branch on it (covered by existing reducer tests being `metadata`-agnostic; a one-line test sets a junk `metadata` blob and verifies the resulting state hash is identical to the empty-metadata run).

### A3 — Negative RLS scenario: user with NO tenant
Adds a fifth integration scenario:
- `src/infrastructure/finance/invoice/__integration__/TenantOrphan.integration.test.ts`
- Setup: authenticate a user that has **zero rows** in `user_tenants`. `public.current_tenant()` returns `NULL`.
- Assertions:
  - `SELECT` against `invoice_events` returns **0 rows** (RLS `USING tenant_id = current_tenant()` filters everything when `current_tenant()` is NULL — `NULL = NULL` is false in SQL).
  - `INSERT` is **rejected** by the RLS `WITH CHECK` clause (returns `RepositoryFailure.PermissionDenied`, not a silent insert).
  - Repository never throws; both calls produce typed `Result.err` values.
- This catches the failure mode where a partially-provisioned account could otherwise see or write cross-tenant data while `user_tenants` is empty.

The integration suite now has **5 scenarios**: Concurrency, Rehydration, TenantIsolation, **TenantOrphan (new)**, GapAfterRace.

---

## Migration — explicit approval recorded
Per your message, the migration is approved subject to all five conditions, every one of which was already in the plan and is now restated as a hard invariant of the migration file:
1. **Idempotent** — every DDL guarded by `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS` before `CREATE POLICY` (G-IDEM).
2. **Scope-limited** — creates `public.invoice_events` only; `public.domain_events` is **not touched** (no `ALTER`, no policy edits, no GRANT changes).
3. **`current_tenant()` is safe** — `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, reads `public.user_tenants` for `auth.uid()`, returns `uuid` (nullable for orphan users — covered by A3).
4. **RLS after table** — strict order: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY (per the public-schema-grants rule).
5. **Zero data mutation** — DDL only; no `INSERT` / `UPDATE` / `DELETE` against any existing table.

The migration will be surfaced via the migration tool with the description and SQL as specified; your approval here pre-authorises the *content* but the tool will still present it for the standard one-click confirmation when execution time comes.

---

## Updated file inventory (delta vs. v1)

**ADR**
- `docs/adr/0012-infrastructure-adapter-and-event-sourcing.md` → flipped to **Accepted**, gains:
  - §D-0012-08 — Sequence as sole ordering authority (A1).
  - §D-0012-09 — Metadata is operational-only (A2).
  - Amendment A2 (Wave 2B): five reviewer gates (G-IDEM/G-PLAN/G-GAP/G-VER/G-THIN) + addenda A1/A2/A3.

**Tests added beyond v1**
- `src/infrastructure/finance/invoice/rehydrator/__tests__/EventStreamRehydrator.ordering.test.ts` (A1 — reverse `occurred_at`, ascending `sequence` ⇒ correct rebuild).
- `src/infrastructure/finance/invoice/codec/__tests__/EventCodec.metadataPassthrough.test.ts` (A2 — junk metadata preserved, state hash unchanged).
- `src/infrastructure/finance/invoice/__integration__/TenantOrphan.integration.test.ts` (A3).

**Fitness**
- `scripts/fitness/check-metadata-non-domain.mjs` (A2) — wired into `run-all.mjs`. Brings the active count to **22 checks** (was 21 with G-THIN).

**Lock file additions**
- `ux2b-wave2b-lock.json` records: ADR-0012 status `Accepted`, sequence-authority rule hash, metadata-rule hash, 5 integration scenarios passed, idempotency second-run no-op proof, EXPLAIN plan id, fitness count 22, repository file SHA unchanged.

Everything else from v1 (single migration, thin `FinanceModule`, EXPLAIN gate, version-routing fixture, `PROJECT_MAP.md` with DEPENDENCY + FITNESS sections, `INDEX.md` row) stands as written.

---

## Execution order (unchanged, with A3 folded into step 4)

1. **M2B-1** Migration: `invoice_events` + `current_tenant()` + GRANTs + RLS (idempotent).
2. **M2B-2** Migration & RLS verified standalone: second-run no-op (G-IDEM) + EXPLAIN proves index usage (G-PLAN).
3. **M2B-3** `src/composition/finance.ts` — thin `createFinanceModule(...)`; `check-composition-thinness.mjs` green (G-THIN).
4. **M2B-4** Run all **5** integration scenarios under `INTEGRATION=1`: Concurrency, Rehydration, TenantIsolation, **TenantOrphan**, GapAfterRace (G-GAP).
5. **M2B-5** Codec version-routing fixture (G-VER) + repository file SHA unchanged proof.
6. **M2B-6** ADR-0012 → **Accepted** (with §D-0012-08/09), `INDEX.md` updated, `PROJECT_MAP.md` published, `ux2b-wave2b-lock.json` written.

---

## Out of scope (unchanged)
`InvoiceReadModel` implementation, outbox dispatch to `domain_events`, UI wiring, data backfill, real v2 event schemas (the V2 fixture in G-VER is test-only).

---

On your approval I will execute Wave 2B end-to-end in the order above and write the lock file at the end.
