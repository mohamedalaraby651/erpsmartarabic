
# UX-2B Waves 2A + 2B — Final v3 (4 reviewer refinements absorbed)

All four points accepted. Diffs vs. v2 below; everything else (registry codec, rehydrator split, `tenant_id` + `current_tenant()`, `metadata`, `schema_version`, FinanceModule, manifest lock, 4 integration scenarios, `PROJECT_MAP.md` with DEPENDENCY/FITNESS sections) is unchanged.

---

## Reviewer refinements — adopted

### R1. Drop `InvariantViolation`; reuse `CorruptedPersistenceData` with `cause` discriminator
- **Reverted from v2:** no new variant in `RepositoryFailure`.
- `EventStreamRehydrator` catches `Invoice.fromHistory` failures and returns:
  ```ts
  { kind: "CorruptedPersistenceData",
    message: "rehydration invariant violation",
    aggregateId, sequence,
    cause: { reason: "InvariantViolation", domainError } }
  ```
- Decode failures use the same kind with `cause: { reason: "DecodeFailure", … }`.
- `isRetryable` already returns `false` for `CorruptedPersistenceData` → no kernel change.
- `InvoiceApplicationError.fromRepositoryFailure` is unchanged; the `cause.reason` literal is for diagnostics only and is **not** part of the public Application surface.
- **Net kernel diff in Wave 2: zero.** The kernel stays exactly at its Wave 1.5 lock.

### R2. `schema_version` is owned by the Codec, not the Repository
- `EventCodec.encode(event) → { type, schemaVersion, payload, metadata }`.
- `EventCodec.decode(row) → Result<DomainEvent, RepositoryFailure>` — Codec selects the per-version decoder by `row.schemaVersion`.
- `SupabaseInvoiceRepository` is a pure transport: it never reads `schema_version`, never inspects `type`, never branches on payload. It only:
  - on append: takes the Codec output and inserts the four columns + `tenant_id`, `aggregate_id`, `sequence`, `event_id`, `occurred_at`;
  - on load: selects rows ordered by `(aggregate_id, sequence)` and hands each row to `EventCodec.decode`.
- Adding a v2 of any event = one new file in `codec/codecs/`, one `register()` call. Zero Repository changes. Zero migration.
- Forbidden-pattern rule added to `check-application-purity` / infra checks: `schemaVersion`/`schema_version` literals MUST NOT appear in `SupabaseInvoiceRepository.ts` (asserted by a tiny grep test in the unit suite, not a fitness check — too narrow to warrant one).

### R3. `FinanceModule.queries` is an open object, not `Record<string, never>`
```ts
export interface FinanceModule {
  commands: {
    issueInvoice:        IssueInvoiceHandler["execute"];
    applyInvoicePayment: ApplyInvoicePaymentHandler["execute"];
    voidInvoice:         VoidInvoiceHandler["execute"];
  };
  queries: {
    invoice?: InvoiceReadModel;     // populated in a future wave
  };
  repositories: {
    invoice: InvoiceRepository;
  };
}
```
- `queries.invoice` is `?` so today's composition leaves it `undefined`; the manifest snapshot records the **shape**, not the runtime presence — adding the projection later is additive.
- The composition surface snapshot (Wave 2B) classifies `queries` as a present-but-possibly-empty namespace; no `Record<string, never>` anywhere.

### R4. Infrastructure ↔ UI isolation — extend `check-adapter-error-boundary`
- New forbidden patterns inside `INFRA_BANS`:
  ```
  from "@/components/**"   • from "@/pages/**"   • from "@/features/**"
  from "@/hooks/**"        • from "@/ui/**"
  + relative variants
  + symbol-level: useState/useEffect/React/JSX in non-test infra files
  ```
- Scope stays `src/infrastructure/**` production files only (tests excluded as today).
- Combined with the existing `check-ui-infrastructure-isolation` (UI → infra direction), the Infrastructure layer is now **bidirectionally sealed against UI** in addition to the existing seal against Application.

---

## Final layered import matrix (locked at end of Wave 2B)

```text
                       imports →
                Domain  Application  Infrastructure  UI  Composition
Domain            ✓         ✗            ✗            ✗      ✗
Application       ✓         ✓            ✗            ✗      ✗
Infrastructure    ✓         ✗            ✓            ✗      ✗
UI                ✗         ✗            ✗            ✓      ✓
Composition       ✓         ✓            ✓            ✗      ✓
```
Every cell is enforced by at least one fitness check; the table is the authoritative section of `PROJECT_MAP.md → DEPENDENCY RULES`.

---

## Updated file inventory (delta from v2)

**Removed (R1):**
- ~~`src/shared-kernel/errors/errors.ts` edit (+InvariantViolation)~~
- ~~`src/shared-kernel/errors/isRetryable.ts` edit~~
- ~~`src/shared-kernel/__tests__/RepositoryFailure.test.ts` edit~~
- ~~`InvoiceApplicationError.ts` translator arm edit~~

**Changed (R2):**
- `EventCodec` interface gains `schemaVersion` in its output type.
- `SupabaseInvoiceRepository` shrinks: pure transport, no version-awareness.
- Unit test `SupabaseInvoiceRepository.purity.test.ts` asserts no `schemaVersion` / `schema_version` literals in the file.

**Changed (R3):**
- `src/composition/finance.ts`: `queries: { invoice?: InvoiceReadModel }`.

**Changed (R4):**
- `scripts/fitness/check-adapter-error-boundary.mjs`: `INFRA_BANS` extended with UI-layer paths and React/JSX symbols.

Everything else from v2 (codec registry, `EventStreamRehydrator`, migration with `tenant_id` + `metadata` + `schema_version` + `current_tenant()`, four integration scenarios incl. Gap Detection, `check-tri-import-exclusivity`, `PROJECT_MAP.md` with DEPENDENCY RULES + FITNESS RULES, 100% branch coverage on `pgErrorMap`, two lock files, ADR-0012 → Accepted at end of 2B) stands as written.

---

## Milestones (final)

1. **M2A-1** Codec registry + 3 codecs (each carrying its own `schemaVersion`) + bidirectional round-trip tests + frozen fixtures.
2. **M2A-2** `EventStreamRehydrator` + `SupabaseInvoiceRepository` (pure transport) + `pgErrorMap` with 100% branch coverage + purity test forbidding version literals in the repo file.
3. **M2A-3** Extended `check-adapter-error-boundary` (UI bans) green; `tsconfig.infrastructure.json` 0 errors; Wave 2A lock written.
4. **M2B-1** Single migration: `invoice_events` (with `tenant_id`, `schema_version`, `metadata`, `occurred_at`, `created_at`, unique `(aggregate_id, sequence)`) + `public.current_tenant()` security-definer + GRANTs + RLS policies.
5. **M2B-2** `FinanceModule` (with open `queries`) + `check-tri-import-exclusivity` green.
6. **M2B-3** Four integration scenarios green under `INTEGRATION=1`: Concurrency, Rehydration, Tenant RLS, Gap Detection.
7. **M2B-4** ADR-0012 flipped to **Accepted**, `INDEX.md` row added, `PROJECT_MAP.md` published with DEPENDENCY + FITNESS sections, `ux2b-wave2b-lock.json` written.

---

## Out of scope (unchanged)

`InvoiceReadModel` implementation; outbox to `domain_events`; UI wiring; data backfill; event v2 schemas.

---

If you approve, I will execute **Wave 2A end-to-end**, write its lock, then proceed to **Wave 2B** in the same flow without further plan revisions unless a documented Contract Gap surfaces.
