# ADR-0008 — Error Model, `Result`, and Transaction Finality

- **Status:** Accepted
- **Date:** 2026-06-19
- **Area:** `application/`, `infrastructure/unit-of-work/`, `shared-kernel/errors/`
- **UX Phase:** UX-2 / Step 0 (ADR-only)
- **Supersedes:** —

## Context

Use cases must return predictable, typed failures so the UI can render localized error states without inspecting exceptions. Transactions must have an unambiguous finality contract so retry policies (UX-2F) and event-dispatch failures cannot silently corrupt persisted state.

This ADR ratifies the error model and the `UnitOfWorkPort` finality contract **before** any handler is written.

## Problem

Define (a) where failures may be thrown vs. returned, (b) how three failure tiers map to `Result.err(...)`, and (c) what is and is not reversible once a commit succeeds — at a precision sufficient for AST-level enforcement.

## Options Considered

1. **Exceptions everywhere.** Rejected: hides failure types from the type system, makes UI error handling untestable.
2. **`Result` in handlers only, exceptions across the UoW boundary.** Rejected: introduces a mixed regime that adapters interpret inconsistently.
3. **`Result` end-to-end at the application boundary, exceptions allowed only inside infrastructure and mapped at the seam.** Selected.

## Decision

Adopt option 3 with three failure tiers and a hard **Transaction Finality** rule.

### Failure tiers

- `DomainError` — invariant violations raised by aggregates and domain services. Defined in `src/domain/**/errors/`.
- `ApplicationError` — use-case-level failures (authorization denied, precondition unmet, event-dispatch failure). Defined in `src/application/errors/`.
- `InfrastructureFailure` — I/O, serialization, transaction, network. Defined in `src/shared-kernel/errors/InfrastructureFailure.ts`. Carries a `phase: 'execution' | 'commit' | 'post-commit'` discriminator.

`RepositoryFailure` (ADR-0010) is a sub-shape of `InfrastructureFailure` used inside repository adapters.

### Handler signature (locked)

```ts
export interface UseCase<Req, Res> {
  execute(
    ctx: TenantContext,
    request: Req,
  ): Promise<Result<Res, DomainError | ApplicationError>>;
}
```

> **Rule R-0008-01.** Files under `src/application/**/handlers/**` MUST NOT contain the `throw` keyword. They MUST return `Result.err(...)` for every failure path. Enforced by `check-error-mapping` (`scripts/fitness/check-error-mapping.mjs`).

> **Rule R-0008-02.** Every exported handler MUST conform to `UseCase<Req, Res>` and return `Promise<Result<Res, DomainError | ApplicationError>>`. Enforced by `check-handler-signature`.

### `UnitOfWorkPort` contract

```ts
export interface UnitOfWorkPort {
  run<T>(
    ctx: TenantContext,
    fn: (uow: UnitOfWork) => Promise<Result<T, DomainError | ApplicationError>>,
  ): Promise<Result<T, DomainError | ApplicationError | InfrastructureFailure>>;
}
```

### Invariant 2 — Transaction Finality

> **Rule R-0008-03 (Commit irreversibility).** Once `UnitOfWorkPort.run` reports a successful commit, no code path MAY roll the transaction back, mark its persisted state invalid, or compensate it implicitly. Compensation requires an explicit new use case. Enforced by `check-transaction-finality` (`scripts/fitness/check-transaction-finality.mjs`).

> **Rule R-0008-04 (Commit-phase failure).** If the handler returned `Result.ok` but the underlying commit fails, UoW MUST return `Result.err(InfrastructureFailure { kind: 'Conflict' | 'Serialization' | 'Network' | 'Unknown', phase: 'commit' })`, MUST drop all queued domain events, and MUST NOT retry. Retry is a caller-level decision driven by `isRetryable` (ADR-0010, Invariant 3).

> **Rule R-0008-05 (Post-commit event dispatch).** Domain events are dispatched **after** commit succeeds, in declaration order, best-effort. Per-event dispatch failure MUST be reported via `LoggerPort` and surfaced as `ApplicationError.EventDispatchFailed { eventIds: string[] }`. Event-dispatch failure MUST NOT roll the committed transaction back and MUST NOT alter the persisted handler outcome. Event loss is an accepted failure mode at this layer; durable outbox is a UX-2F concern (RISK-009).

> **Rule R-0008-06 (Mid-handler failure).** If the handler throws or returns `Result.err` after writes have been staged, UoW MUST roll back the staged work, drop queued events, and return `Result.err(InfrastructureFailure { ..., phase: 'execution' })`.

> **Rule R-0008-07 (No public rollback after commit).** No file under `src/` MAY export a symbol named `rollbackAfterCommit`, `undoCommit`, or `revertCommit`. Commit/rollback internals MUST be encapsulated under `src/infrastructure/unit-of-work/**` and MUST NOT be imported elsewhere. Enforced by `check-transaction-finality`.

> **Rule R-0008-08 (Phase discriminator).** `InfrastructureFailure` MUST carry a non-optional `phase: 'execution' | 'commit' | 'post-commit'` field. Enforced by `tsc` and `check-transaction-finality`.

## Consequences

- Positive: typed failure surface end-to-end; deterministic retry decisions; impossible-by-construction post-commit rollback.
- Negative / accepted trade-offs: event loss between commit success and dispatch is possible until UX-2F adds a durable outbox.
- Affected files / contracts: `src/application/**`, `src/infrastructure/unit-of-work/**`, `src/shared-kernel/errors/**`, three fitness checks.
- Lifecycle impact: adding a fourth failure tier requires a superseding ADR; adding a new `phase` value updates this ADR.

## Rollback Plan

If `Result` end-to-end imposes >10% boilerplate cost across the first vertical slice (measured in LOC vs. an exception-based control), restrict `Result` to public handler signatures only and allow internal exceptions inside application services with a centralized translator. Trigger: vertical-slice review at end of UX-2C.

## References

- `.lovable/plan.md` — UX-2 roadmap v5, Invariant 2
- ADR-0006 — `ClockPort` consumed by handlers
- ADR-0010 — `RepositoryFailure` taxonomy and retryability
- ADR-0011 — Composition Root (only wiring site for `UnitOfWorkPort`)
- RISK-009 — Event-dispatch loss until durable outbox (UX-2F)
