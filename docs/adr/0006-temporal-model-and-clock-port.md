# ADR-0006 — Temporal Model: `Instant` Value Object and `ClockPort` Authority

- **Status:** Accepted
- **Date:** 2026-06-19
- **Area:** `shared-kernel/time/`, `application/ports/ClockPort.ts`
- **UX Phase:** UX-2 / Step 0 (ADR-only)
- **Supersedes:** —

## Context

UX-1E proved the UI shell is contract-stable. UX-2 introduces the domain and application layers. Time is the first cross-cutting concern that touches every aggregate (audit, event ordering, fiscal-period boundaries) and every adapter (Memory, Mock, Fault-Injecting, Supabase). If wall-clock access is allowed anywhere outside a single authority, three classes of bug become inevitable: audit drift, non-deterministic tests, and fiscal-period miscalculation across time zones.

This ADR ratifies the temporal contract **before** any `src/shared-kernel/` or `src/domain/` source file is written.

## Problem

Define, with implementation-grade precision, **what represents time** and **who is allowed to read "now"**, such that the rule can be enforced by AST-level fitness checks without human interpretation during UX-2A coding.

## Options Considered

1. **Domain reads `Date.now()` directly.** Simplest. Rejected: non-deterministic tests, no time-travel for fiscal close, audit drift across nodes.
2. **`Clock` primitive in `shared-kernel/` exposing `now()`.** Convenient. Rejected: makes the shared kernel hold runtime authority, blurs the line between representation and side effect — violates "shared-kernel = framework-agnostic primitives only".
3. **`Instant` value object in `shared-kernel/` + `ClockPort` in `application/ports/`.** Selected. Separates representation from authority; only the application boundary may consult the clock.

## Decision

Adopt option 3 with a **Single Temporal Authority** invariant.

### Lock 1 — Instant semantics

`shared-kernel/time/Instant.ts` exports an immutable value object carrying `epochMillis: number` (UTC). It has comparison, arithmetic on durations, ISO-8601 serialization, and `fromEpochMillis(n)` / `toEpochMillis()`. It exports **no** zero-arg factory: there is no `Instant.now()`, no `Instant.create()`-without-args, no constant that captures the moment of module load.

`shared-kernel/time/Timestamp.ts` is a thin alias for legacy interop only and re-exports `Instant`. Calendar / timezone concerns (FiscalDate, BusinessDay) live in `domain/finance/shared-vo/` and operate on `Instant` inputs.

### Invariant 1 — Single Temporal Authority

> **Rule R-0006-01.** `ClockPort.now(): Instant` MUST be the sole source of the current moment in the system. Enforced by `check-temporal-authority` (`scripts/fitness/check-temporal-authority.mjs`).

> **Rule R-0006-02.** `Instant` instances MUST originate from exactly one of three boundaries: (a) `ClockPort.now()` at the application boundary; (b) the **deserialization boundary** inside `src/infrastructure/repositories/**` or `src/shared-kernel/time/**` reading a persisted `epochMillis` from storage or wire payload; (c) the **test boundary**, a `FakeClock` implementing `ClockPort`. Enforced by `check-temporal-authority`.

> **Rule R-0006-03.** Files under `src/domain/**`, `src/application/**` (except `src/application/ports/ClockPort.ts`), `src/ui/**`, and `src/composition/**` MUST NOT contain any of: `Date.now`, `new Date()` with zero arguments, `performance.now`, `process.hrtime`, `Intl.DateTimeFormat` used for current-time discovery, or any framework helper that reads the wall clock. The pattern `new Date(epochMillis)` with a numeric argument is permitted only inside `src/infrastructure/repositories/**` and `src/shared-kernel/time/**` for deserialization. Enforced by `check-temporal-authority`.

> **Rule R-0006-04.** `src/shared-kernel/time/Instant.ts` MUST NOT export any zero-arg factory function returning an `Instant`. Enforced by `check-temporal-authority`.

> **Rule R-0006-05.** Only `src/application/ports/ClockPort.ts` MAY declare a method whose signature returns `Instant` and takes no arguments under the name `now`. Enforced by `check-temporal-authority`.

### Adapter implementations

- `infrastructure/clock/SystemClock.ts` — production. Single permitted `Date.now()` call site in the whole codebase, fenced by the fitness allowlist.
- `infrastructure/clock/FakeClock.ts` — tests. Advances explicitly via `advance(ms)` / `set(instant)`.

## Consequences

- Positive: deterministic tests, audit consistency, time-travel for fiscal close, single fitness-check enforcement point.
- Negative / accepted trade-offs: every handler that needs "now" takes `ClockPort` as a constructor dependency; no convenience global.
- Affected files / contracts: `src/shared-kernel/time/**`, `src/application/ports/ClockPort.ts`, `src/infrastructure/clock/**`, `scripts/fitness/check-temporal-authority.mjs`.
- Lifecycle impact: any future "performance clock" or "monotonic clock" must be introduced as a separate port with its own ADR.

## Rollback Plan

If `ClockPort` injection causes unacceptable ergonomic friction across >20 handlers, downgrade to option 2 (`shared-kernel/Clock`) via a superseding ADR. Rollback trigger: developer-experience survey + handler-construction overhead >5% of handler LOC measured across the first vertical slice.

## References

- `.lovable/plan.md` — UX-2 roadmap v5, Invariant 1
- ADR-0008 (error mapping) — handlers that consume `ClockPort` return `Result`
- ADR-0010 (RepositoryFailure) — deserialization boundary that materializes `Instant` from storage
