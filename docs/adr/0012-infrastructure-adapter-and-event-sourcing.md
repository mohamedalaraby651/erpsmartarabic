# ADR-0012 — Infrastructure Adapter & Event-Sourced Persistence (Finance / Invoice)

**Status:** **Accepted** (UX-2B Wave 2B — 2026-06-30). Contracts locked
in Wave 1.5; Adapter / Codec / Rehydrator delivered in Wave 2A;
Migration, RLS, Composition Root, integration suite, and ordering /
metadata addenda delivered in Wave 2B.

**Supersedes / extends:** ADR-0010 (Repository Failure Taxonomy),
ADR-0011 (Finance Domain & Invoice Aggregate, Amendments A2-bis / A5).

---

## 1. Context

Wave 1 produced the Application layer with `InvoiceApplicationError` as the
sole boundary error. Wave 1.5 finalises every *contract* the Infrastructure
adapter will have to honour, **without** writing the adapter itself. The
deliberate separation lets a CI failure in Wave 2 be attributed to the local
Adapter (2A) or to the database/composition wiring (2B) — never to a contract
drift.

## 2. Decisions

### D-0012-01 — `RepositoryFailure` split: `Serialization` vs `CorruptedPersistenceData`

Two distinct kinds, with distinct retry semantics:

| Kind | Meaning | Retryable? |
|---|---|---|
| `Serialization` | Wire-/parse-level: invalid JSON, undecodable shape, unknown `type` discriminator. A replica may return a healthy payload. | **Yes** |
| `CorruptedPersistenceData` | Semantic invariant broken at-rest: negative `sequence`, missing payload fields, type known but data violates the domain contract. The row itself is bad. | **No** |

`isRetryable()` remains the single classifier (ADR-0010 Rule R-0010-03);
`CorruptedPersistenceData` joins the non-retryable group.

### D-0012-02 — `RepositoryFailure.Conflict` does *not* require `actualVersion`

`actualVersion` stays **optional**. Adapters that would need an extra
`SELECT MAX(sequence)` round trip to populate it MAY omit it. The application
boundary already handles this — `InvoiceApplicationError.ConcurrencyConflict`
forwards both fields as optional. Forcing every adapter to perform a second
read just to fill an informational field is rejected as a contract cost with
no caller benefit.

### D-0012-03 — Application Surface = Manifest, not raw hash

The application barrel `src/application/finance/index.ts` is snapshotted as a
**logical Manifest** (sorted, classified groups), not as a hash of
`Object.keys`. The manifest carries `schemaVersion`, `generatorVersion`,
`module`, `groups`, and a content hash computed over those four fields only;
`generatedAt` is excluded from the hash.

Classification rules are heuristic (suffix-based), so new ports / interfaces
do not require touching the snapshotter:

```
*Command          → commands
*Input            → commandInputs
*Result           → results
*HandlerDeps      → handlerDeps        (matched before *Handler)
*Handler          → handlers
*ApplicationError → errors
ALL_CAPS_UNDERSCORE → errorFactories
otherwise         → other
```

`"other"` gate semantics: empty → PASS; non-empty matching the prior baseline
→ WARN; *new* symbols vs baseline → FAIL (requires explicit baseline update
or a new classification rule).

### D-0012-04 — Bidirectional Adapter ↔ Application boundary

Enforced by `check-adapter-error-boundary`:

* **Infra → App** (forbidden): no import from `@/application/**`, no mention
  of `InvoiceApplicationError` / `fromRepositoryFailure`, no re-implementation
  of `isRetryable`, no `throw`.
* **App → Infra** (forbidden, Wave 1.5 refinement): no import from
  `@/infrastructure/**` / `src/infrastructure/**`, no `@supabase/*`, no
  `pg` / `postgrest-js` / `kysely` / `drizzle-orm`, no textual reference to
  adapter symbols (`SupabaseInvoiceRepository`, `EventCodec`, `PostgrestError`).

### D-0012-05 — `EventCodec` lives inside Infrastructure, only

`encode(event) → { type, payload }` and `decode(row) → Result<event,
RepositoryFailure>`. BigInt is stringified at the wire boundary
(`check-domain-bigint-boundary` already enforces this on the domain side).
Round-trip tests are required in **both** directions:
`decode(encode(event)) ≡ event` **and** `encode(decode(row)) ≡ row` against
frozen fixtures. Drift in either direction fails CI.

### D-0012-06 — Composition Root is the only tri-layer importer

`src/composition/**` is the sole location permitted to import from `@/domain/**`,
`@/application/**`, **and** `@/infrastructure/**` in the same file. Enforced by
the existing `check-composition-root-uniqueness` plus a `check-tri-import-exclusivity`
gate (added in Wave 2B alongside the first Composition Root file).

### D-0012-07 — Wave 2B integration scenarios (registered now, executed in 2B)

The integration suite, gated behind `INTEGRATION=1`, MUST cover three
scenarios because they exercise the three storage risks independently:

1. **Concurrency** — two concurrent `appendEvents` with the same
   `expectedVersion` produce exactly one `Conflict`.
2. **Re-hydration** — after a successful append, `load()` returns events in
   identical order, with gap-free sequence 1..N.
3. **Tenant isolation (RLS)** — a user from tenant B cannot observe events
   for tenant A under any code path.

---

## 3. Out of scope for Wave 1.5

The actual `SupabaseInvoiceRepository`, `EventCodec` implementation, SQL
migration, RLS policies, `composition/finance.ts`, and the lock to
`Accepted` — all land in Waves 2A and 2B.

## 4. Lock artefacts (Wave 1.5)

* `scripts/audits/output/ux2b-wave1_5-surface.manifest.json` (+ `.sha256`)
* `scripts/audits/output/fitness/check-application-surface.json`
* `scripts/audits/output/fitness/check-adapter-error-boundary.json`
* `scripts/audits/output/ux2b-wave1_5-lock.json`

---

## 5. Wave 2B addenda (Accepted 2026-06-30)

### D-0012-08 — `sequence` is the SOLE ordering authority

Event rehydration MUST depend only on `(aggregate_id, sequence)`. The
columns `occurred_at` and `created_at` are observational data (audit,
debugging, dashboards) and MUST NOT influence reducers, `fromHistory`,
or the rehydrator's row ordering. If `occurred_at` ever disagrees with
`sequence` (clock skew, network reorder, retried writes), `sequence`
wins without exception.

Enforced by:
* `EventStreamRehydrator.ordering.test.ts` — feeds rows whose
  `occurred_at` is in reverse chronological order along ascending
  `sequence` and asserts the rebuild matches the well-ordered baseline.
* The `(aggregate_id, sequence)` unique constraint at the DB layer.

### D-0012-09 — `metadata` is operational only

`metadata` is reserved for tracing (`correlationId`, `causationId`),
audit (actor / request id), and integration plumbing (outbox, retries).
**No domain code may read `metadata` to make a business decision.**
Business truth lives exclusively in `payload`.

Enforced by:
* `scripts/fitness/check-metadata-non-domain.mjs` — bans the bare
  identifier `metadata` inside `src/domain/finance/**` outside the
  kernel type re-export (active in `run-all.mjs`).
* `EventCodec.metadataPassthrough.test.ts` — rebuilds the aggregate
  twice (with empty metadata and with arbitrary noisy metadata) and
  asserts the resulting state is identical.

### Amendment A2 — Wave 2B verification gates

| Gate     | What it proves                                                                                  | Artefact                                                                  |
|----------|-------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| G-IDEM   | Migration is idempotent (second run is a no-op)                                                 | `supabase/migrations/*invoice_events*.sql` (DO/IF-NOT-EXISTS guards)      |
| G-PLAN   | Read path uses the `(aggregate_id, sequence)` index                                             | `EXPLAIN` snapshot taken in CI integration job                            |
| G-GAP    | Five integration scenarios pass against a live DB                                               | `src/infrastructure/finance/invoice/__integration__/*.integration.test.ts`|
| G-VER    | Codec version routing: encode picks latest, decode dispatches by `(type, schema_version)`       | `Codec.roundtrip.test.ts` + registry list assertions                      |
| G-THIN   | Composition Root is the ONLY file importing domain + application + infrastructure together     | `check-composition-root-uniqueness.mjs`                                  |

### Integration suite (replaces §D-0012-07's three scenarios)

The integration suite, gated behind `INTEGRATION=1`, now covers FIVE
scenarios:

1. **Concurrency** — two parallel `appendEvents@v=0` produce exactly one
   `Conflict`.
2. **Rehydration** — `load()` returns events ordered 1..N gap-free.
3. **TenantIsolation** — tenant B cannot observe tenant A rows under any
   code path.
4. **TenantOrphan (A3)** — a user with zero rows in `user_tenants` (so
   `current_tenant()` returns `NULL`) sees zero rows and is rejected on
   insert. Catches partially-provisioned accounts.
5. **GapAfterRace** — after a Conflict, the losing writer leaves no
   phantom row at the next slot; sequences remain contiguous.

## 6. Lock artefacts (Wave 2B)

* `supabase/migrations/<timestamp>_*invoice_events*.sql`
* `src/composition/finance.ts` (sole tri-layer importer)
* `scripts/fitness/check-metadata-non-domain.mjs`
* `src/infrastructure/finance/invoice/__tests__/rehydrator/EventStreamRehydrator.ordering.test.ts`
* `src/infrastructure/finance/invoice/__tests__/codec/EventCodec.metadataPassthrough.test.ts`
* `src/infrastructure/finance/invoice/__integration__/InvoiceEvents.integration.test.ts`
* `scripts/audits/output/ux2b-wave2b-lock.json`
