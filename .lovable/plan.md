# F1 — Batched Execution Model (F1-A / F1-B / F1-C)

Restructures the 37 frozen F1 items into three governed batches instead of 37 tickets.
Scope stays frozen; only batch size grows.

- Frozen scope: `F1_SCOPE_001`, hash `2b4e37a030945bdbd922c8eb50a412e8fe1b95b512e4d3b86faf301d8ff652aa`
- Authorized: F1-A pages→repositories (4), F1-B components→repositories (33)
- Not authorized: F2 (58 supabase-client items), UI/design system, state, a11y, RTL, performance, PWA, BND-05, RLS, migrations, domain/finance, permissions, PRE-TS-001 containment files

## Scope-state change this batching introduces

The current frozen record marks 11 items READY and 26 BLOCKED, because Constraint 6 (`no target surface ⇒ STOP`) had no facade allowance. The new instructions authorize a **minimal pure re-export facade** when it is required to complete an approved redirect. That converts most blocked items into executable ones, so `F1_SCOPE_001` must be re-issued as a revision (`F1_SCOPE_001-R2`) before any mutation — same 37 IDs, same batches, updated `state`/`approvedTargetSurface`, new hash. The old hash is retained as predecessor. No item is added or removed.

Blocked items split into two kinds:

- **15 items use named repository imports.** Resolve each symbol against existing application/query facades first. Create one minimal facade only when no suitable existing facade exists. Multiple F1 edges MUST reuse the same facade where the capability is identical.
- **11 items use the barrel `@/lib/repositories/index`.** Per-symbol resolution to the owning facade(s).


Barrel items are still executable only when every imported symbol maps to an existing or newly created pure facade; otherwise that item stays BLOCKED and is reported, not forced. Never rewrite `@/lib/repositories` to `@/application/queries` mechanically — inspect symbols, resolve each symbol to its owning facade, then rewrite the import.

**First step is not code.** Issue `F1_SCOPE_001-R2` and compute the new hash before any source mutation. Status is APPROVED FOR R2 PREPARATION, not for source mutation; a scope-integrity stop follows R2.

### R2 integrity rule

`F1_SCOPE_001-R2` MUST preserve exactly the same 37 item IDs, files, batches, and current dependency edges as `F1_SCOPE_001`. Only `state` and `approvedTargetSurface` may change. No ID, file, batch, or `currentEdge` may be added, removed, renamed, merged, split, or reinterpreted. The predecessor hash stays recorded. If any `currentEdge` is materially different from the predecessor record, STOP and produce a Scope Drift Report — do not silently regenerate the scope.


## Scope unit = dependency edge, not file

The frozen unit is the dependency edge. If an approved F1 consumer file contains additional repository edges outside the 37, they remain untouched and are reported as out-of-scope observations.

## Facade rule

A minimal pure re-export facade is permitted only when required to remediate an approved F1 edge. Reuse order: existing application service/query facade → existing pure facade → one new minimal pure re-export facade. No facade-per-consumer, no facade-per-file, no speculative or duplicate facade. A facade may use `export *` or explicit named re-exports **only from an already-existing approved application-layer or repository capability per ADR-0028** — never from a consumer, page, component, or arbitrary module, and never as a new implementation surface. ADR-0028 itself is not modified.

## Batch F1-A — Pages → Application (4 edges)

Items: `PriceListsPage.tsx`, `QuotationDetailsPage.tsx`, `SupplierPaymentsPage.tsx`, `TasksPage.tsx`.

1. Inventory: record exact current import line, imported symbols, and resolved target facade per edge.
2. Resolve each symbol to an existing facade under `src/application/queries/**`; create a pure re-export facade only where required.
3. Apply import-only redirects. No logic, UI, signature, or behavior changes.
4. Checkpoint: all 4 approved edges eliminated; unrelated repository edges in the same files left untouched and reported only; no new F1 violations; `tsgo`, build, fitness, dep-graph, UI cycles 0.

## Batch F1-B — Components → Application (33 edges)

1. Full inventory of the 33 approved edges, grouped by repository/capability so one facade serves many consumers (never 33 facades).
2. Reuse order per the facade rule above.
3. Apply all redirects in one controlled pass. Register a new facade in `src/application/queries/index.ts` **only if the existing application-query import convention requires it** — no speculative barrel edits. Follow ADR-0028; do not modify it.
4. Checkpoint: 33/33 approved edges eliminated; unrelated edges unchanged and reported; no new page/component → supabase-client edges; no new cycles; `tsgo`, build, fitness, dep-graph.

## Batch F1-C — Consolidated Verification (no source mutation)

Verify the whole frozen F1 set and produce the evidence pack:

- scope integrity: every changed consumer dependency edge corresponds to an approved F1 item (a consumer file may hold multiple approved F1 edges and may therefore be changed once to remediate several of them, but no other dependency in that file may change); every newly created facade is directly required by one or more approved F1 items; every changed file has a documented F1 purpose; no file modified for unrelated cleanup or future work
- edge mapping: 37/37 verified — 4/4 F1-A and 33/33 F1-B remediated, unrelated edges unchanged
- dep-graph before/after: pages→repositories, components→repositories, pages→supabase-client, components→supabase-client, total cycles, UI cycles
- facade audit: every new facade is pure re-export only, with its re-export source proven to be an approved existing application/repository capability — zero logic, validation, mapping, transformation, caching, state, DB/Supabase calls, no new repository or query service, no new implementation surface

- negative verification: zero diff under BND-05 surfaces, RLS, migrations, finance/domain, permissions, sync, F2 files, PRE-TS-001, PRE-EXT-001
- `tsgo`, build, Vitest, `scripts/fitness/run-all.mjs`
- result classified `PASS` / `FAIL` / `BLOCKED`. Never `CERTIFIED`.

## Deliverables

- `docs/governance/F1_SCOPE_001_R2.md` + `scripts/audits/output/f1-scope-001-r2.json` (revised scope, new hash)
- `docs/architecture/F1_BATCH_A.md`, `docs/architecture/F1_BATCH_B.md`
- `docs/governance/F1_CONSOLIDATED_VERIFICATION.md` + `scripts/audits/output/f1-verification.json`
- Updated `PROGRESS_LOG.md`, `SCOREBOARD.md`

## Stop conditions

Any of these halts the batch and produces a Stop Report instead of a workaround: an item needing business logic, a new repository or query service, a domain/finance/RLS/migration/permission change, a Track A/B intersection, a behavior change, or a file outside the approved set.

## Operating rule adopted going forward

Architecturally homogeneous work ships as one batch of 20–50 changes with frozen scope, forbidden zones, definition of done, and automated verification. Work touching domain, finance, RLS, tenant, sync, or permissions reverts to small batches with more stop points.
