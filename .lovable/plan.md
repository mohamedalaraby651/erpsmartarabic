# UX-2 — Data & Application Layer Re-architecture (v5, semantic-lock patch)

Conditional approval acknowledged. Three semantic invariants must be patched into the Step 0 ADR drafts **before** the ADR-only PR is written. Everything else from v4 is retained.

## Semantic Lock Patch (added to Step 0 — ADR text only, no source code)

### Invariant 1 — Temporal Authority Rule (patches ADR-0006)

Add a normative subsection: **"Single Temporal Authority"**.

- **`ClockPort` is the sole source of "now"** in the entire system. No other module — domain, application, infrastructure, UI, composition — may read wall-clock time.
- **`Instant` is a representation, not an authority.** It carries an `epochMillis` value; it does not produce one.
- Every `Instant` instance in the running system MUST originate from exactly one of three boundaries:
  1. `ClockPort.now()` at the application boundary (handlers, sagas),
  2. **Deserialization boundary** (repository adapter reading a persisted `epochMillis` from storage / wire payload),
  3. **Test boundary** (a `FakeClock` implementing `ClockPort`).
- Forbidden everywhere else: `new Date()`, `Date.now()`, `performance.now()`, `Intl.*` for current time, `process.hrtime`, any framework helper that reads the clock.
- AST-verifiable rules (extend `check-domain-purity` + new `check-temporal-authority`):
  - `src/domain/**`, `src/application/**` (except `ports/ClockPort.ts`), `src/ui/**`, `src/composition/**` — zero matches for `/\bDate\.now\b|\bnew Date\b(?!\s*\(\s*\d)|\bperformance\.now\b|\bIntl\.DateTimeFormat\b/`. (Explicit `new Date(epochMillis)` for deserialization is allowed only inside `infrastructure/repositories/**` and `shared-kernel/time/**`.)
  - `shared-kernel/time/Instant.ts` exports no zero-arg factory (no `Instant.now()`).
  - Only `application/ports/ClockPort.ts` may declare a `now(): Instant` method signature.

Rationale: prevents temporal divergence between audit timestamps, event ordering, and fiscal-period boundaries.

### Invariant 2 — Transaction Finality Rule (patches ADR-0008)

Add a normative subsection: **"Transaction Finality"**.

Locks the four edge cases the reviewer flagged:

1. **Commit success is irreversible.** Once `UnitOfWorkPort` reports a successful commit, no code path may roll the transaction back, compensate it implicitly, or mark the persisted state invalid. Compensation requires an explicit new use case.
2. **Commit-phase failure** (handler returned `Result.ok` but the underlying commit throws):
   - UoW returns `Result.err(InfrastructureFailure { kind: 'Conflict' | 'Serialization' | 'Network' | 'Unknown', phase: 'commit' })`.
   - Queued domain events are **dropped** (never dispatched).
   - UoW does NOT retry; retry is a caller-level decision driven by `RepositoryFailure.retryable` (Invariant 3).
3. **Post-commit event dispatch is a non-transactional side effect.**
   - Dispatched after commit succeeds, in order, best-effort.
   - Per-event dispatch failure is reported via `LoggerPort` and surfaced as `ApplicationError.EventDispatchFailed { eventIds: [...] }`.
   - Event-dispatch failure NEVER rolls back the committed transaction and NEVER changes the persisted handler outcome.
   - Event loss is an accepted failure mode at this layer; durable outbox is a UX-2F concern (RISK-009 update).
4. **Mid-handler failure** (handler throws after a write has been staged): UoW rolls back the staged work, drops queued events, returns `Result.err(InfrastructureFailure { phase: 'execution' })`.

AST-verifiable rules:
- New fitness `check-transaction-finality`:
  - `UnitOfWorkPort` interface MUST expose `commit` semantics through a single `run(ctx, fn): Promise<Result<T, InfrastructureFailure>>` method — no separate public `rollbackAfterCommit`, `undoCommit`, `revertCommit` symbol may exist anywhere in `src/`.
  - No file outside `src/infrastructure/unit-of-work/**` may import the internal commit/rollback symbols.
- The `InfrastructureFailure` type MUST carry a `phase: 'execution' | 'commit' | 'post-commit'` discriminator (enforced by `tsc`).

### Invariant 3 — Repository Retryability Semantics (patches ADR-0010)

Add a normative subsection: **"Retryability Classification"**.

Retryability is a **derived, contract-level** property — not a stored flag on individual error instances, and not a per-adapter heuristic.

```ts
// src/shared-kernel/errors/RepositoryFailure.ts
export type RepositoryFailure =
  | { kind: 'Timeout';          operation: string; timeoutMs: number }
  | { kind: 'Conflict';         aggregate: string; id: string; expectedVersion?: number }
  | { kind: 'NotFound';         aggregate: string; id: string }
  | { kind: 'DuplicateKey';     aggregate: string; key: string }
  | { kind: 'Serialization';    operation: string; cause: string }
  | { kind: 'Network';          operation: string; cause: string }
  | { kind: 'PermissionDenied'; operation: string; reason: string }
  | { kind: 'Unknown';          operation: string; cause: string };

// Single canonical classifier — defined alongside the union, exhaustive over `kind`.
export const isRetryable = (f: RepositoryFailure): boolean => {
  switch (f.kind) {
    case 'Timeout':          return true;
    case 'Network':          return true;
    case 'Serialization':    return true;   // optimistic-concurrency retry safe
    case 'Conflict':         return false;  // requires domain re-evaluation
    case 'DuplicateKey':     return false;
    case 'NotFound':         return false;
    case 'PermissionDenied': return false;
    case 'Unknown':          return false;  // fail closed
  }
};
```

Normative rules:

1. **`isRetryable` is the single classifier.** No adapter, handler, or UI module may re-implement retry classification. Future retry policy (UX-2F) consumes this function only.
2. **Mapping consistency across adapters** — every adapter's `mapToRepositoryFailure(nativeError): RepositoryFailure` is unit-tested AND exercised by the 4-adapter contract suite: for each canonical fault scenario, all 4 adapters MUST produce the same `kind` and therefore the same `isRetryable(...)` verdict.
3. **No retryability field on instances.** `RepositoryFailure` instances carry no `retryable` boolean — the classifier is derived to keep the wire shape canonical and prevent adapter drift.
4. **Fail-closed default.** Any new `kind` added later MUST default to non-retryable until an ADR explicitly classifies it.

AST-verifiable rules:
- New fitness `check-retryability-single-source`:
  - exactly one exported `isRetryable` symbol in `src/shared-kernel/errors/**`,
  - zero re-implementations elsewhere (forbid identifiers matching `/^is(Retry|Retryable|Transient)/` outside that file),
  - the `switch` in `isRetryable` is exhaustive over `RepositoryFailure['kind']` (TypeScript `never` exhaustiveness check enforced at build time).

## Updated execution sequence

```text
Step 0  ADR-only PR — ratify:
        ├─ ADR-0006 (+ Lock 1: Instant semantics, + Invariant 1: Temporal Authority)
        ├─ ADR-0008 (+ Lock 2: Error mapping, + Invariant 2: Transaction Finality)
        └─ ADR-0010 (+ Lock 3: RepositoryFailure taxonomy, + Invariant 3: Retryability)
        Acceptance: each ADR section written in "implementation-grade contract spec"
        wording so the linked fitness checks (below) can be authored directly from
        ADR text without human interpretation.
Step 1  shared-kernel scaffolding (time/, errors/, base classes, events, result, context)
Step 2  domain/finance aggregates
Step 3  Gate 2A→2B fitness suite green
```

## Fitness suite — final delta for UX-2A gate

Carried from v4:
- `check-domain-purity`, `check-aggregate-boundaries`, `check-domain-events-immutable`,
  `check-domain-service-purity`, `check-handler-signature`, `check-error-mapping`,
  `check-repository-failure-taxonomy`, `check-ui-infrastructure-isolation`,
  `check-composition-root-uniqueness`.

Added in v5:
- **`check-temporal-authority`** (Invariant 1)
- **`check-transaction-finality`** (Invariant 2)
- **`check-retryability-single-source`** (Invariant 3)

Total: 12 architectural fitness checks must pass before UX-2A → UX-2B.

## ADR wording convention (locked at v5)

Every normative paragraph in ADR-0006 / 0008 / 0010 MUST use the form:

> **Rule R-NNNN.** `<subject>` MUST/MUST NOT `<verb>` `<object>` `<scope>`. Enforced by `<fitness check name>` (`scripts/fitness/<file>.mjs`).

This convention makes the ADR text directly mappable to AST checks — eliminating interpretive drift during UX-2A coding.

## Carried forward unchanged from v4

- 5 amendments (shared-kernel, aggregates, TenantContext, application ports, repository contract tests).
- 10 reviewer refinements R1–R10.
- 3 Step-0 contract locks (Instant semantics, error mapping, failure taxonomy).
- Phase map UX-2A → UX-2F.
- Aggregates: Account / Customer / JournalEntry+JournalLine / FiscalPeriod.
- Vertical slice: `GetChartOfAccounts`.
- Risks: RISK-007 (shadow repos), RISK-008 (adapter parity), RISK-009 (extended: event-dispatch loss until durable outbox in UX-2F).

## Approval requested

Approve v5 so the ADR-only Step 0 PR can be drafted, with the three new invariants embedded in their respective ADRs using the locked **Rule R-NNNN** wording convention. No source code under `src/shared-kernel/` or `src/domain/` will be written until that PR is ratified.
