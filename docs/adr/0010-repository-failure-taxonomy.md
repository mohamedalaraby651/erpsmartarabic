# ADR-0010 — `RepositoryFailure` Taxonomy and Retryability Classification

- **Status:** Accepted
- **Date:** 2026-06-19
- **Area:** `shared-kernel/errors/`, `infrastructure/repositories/**`
- **UX Phase:** UX-2 / Step 0 (ADR-only)
- **Supersedes:** —

## Context

Four repository adapters (Memory, Mock, Fault-Injecting, Supabase) must produce **identical** failure surfaces for identical fault scenarios; otherwise the 4-adapter contract suite cannot prove adapter parity and retry policies will diverge between development and production.

This ADR locks the failure shape and the retryability classifier **before** any adapter is written.

## Problem

Define (a) the canonical discriminated union returned by repository operations, (b) the canonical retryability classifier, and (c) the mapping-consistency obligation each adapter must satisfy — at a precision sufficient for AST-level enforcement.

## Options Considered

1. **Native exceptions per adapter.** Rejected: every call site must know each driver's error shape.
2. **Per-adapter retryability flag on each error instance.** Rejected: invites adapter drift (one adapter calls Conflict retryable, another does not).
3. **Canonical union + single derived classifier.** Selected.

## Decision

Adopt option 3 with a fixed union and a single exhaustive classifier.

### Canonical union

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
```

### Invariant 3 — Retryability Classification

> **Rule R-0010-01 (Canonical surface).** Every repository operation MUST return either `Result.ok(value)` or `Result.err(failure)` where `failure` conforms to `RepositoryFailure`. Adapters MUST NOT throw across their public boundary. Enforced by `check-repository-failure-taxonomy` (`scripts/fitness/check-repository-failure-taxonomy.mjs`).

> **Rule R-0010-02 (Single classifier).** Exactly one exported `isRetryable(f: RepositoryFailure): boolean` symbol MUST exist in `src/shared-kernel/errors/**`. Its implementation MUST be a `switch` over `f.kind` that is exhaustive (verified by a TypeScript `never` assertion in the default branch). Enforced by `check-retryability-single-source` (`scripts/fitness/check-retryability-single-source.mjs`).

> **Rule R-0010-03 (No re-implementations).** No file outside `src/shared-kernel/errors/**` MAY export an identifier matching `/^is(Retry|Retryable|Transient)/` whose first parameter type extends `RepositoryFailure`. Enforced by `check-retryability-single-source`.

> **Rule R-0010-04 (No retryability field on instances).** `RepositoryFailure` variants MUST NOT carry a `retryable` field. Retryability is derived from `kind` via `isRetryable`, never stored on the instance. Enforced by `check-retryability-single-source` (structural assertion on the type definition).

> **Rule R-0010-05 (Fail-closed default).** Any future `kind` added to `RepositoryFailure` MUST default to **non-retryable** in `isRetryable` unless a superseding ADR explicitly classifies it as retryable.

> **Rule R-0010-06 (Mapping consistency).** Every adapter MUST expose a pure function `mapToRepositoryFailure(nativeError: unknown): RepositoryFailure`. For each canonical fault scenario defined in the 4-adapter contract suite, all four adapters (Memory, Mock, Fault-Injecting, Supabase) MUST produce the same `kind` — and therefore the same `isRetryable` verdict. Enforced by the contract test suite under `src/infrastructure/repositories/__contract__/`.

### Canonical classifier

```ts
export const isRetryable = (f: RepositoryFailure): boolean => {
  switch (f.kind) {
    case 'Timeout':          return true;
    case 'Network':          return true;
    case 'Serialization':    return true;  // optimistic-concurrency retry safe
    case 'Conflict':         return false; // requires domain re-evaluation
    case 'DuplicateKey':     return false;
    case 'NotFound':         return false;
    case 'PermissionDenied': return false;
    case 'Unknown':          return false; // fail closed
  }
};
```

## Consequences

- Positive: identical retry behavior in dev and prod; impossible-by-construction adapter drift on retryability; new failure kinds are opt-in retryable.
- Negative / accepted trade-offs: every adapter ships an explicit `mapToRepositoryFailure`; adding a new `kind` is a multi-file change (union, classifier, four adapters, contract suite).
- Affected files / contracts: `src/shared-kernel/errors/RepositoryFailure.ts`, every file under `src/infrastructure/repositories/**`, the 4-adapter contract suite, two fitness checks.
- Lifecycle impact: `RepositoryFailure` is a frozen surface; changes require superseding ADR.

## Rollback Plan

If the canonical-classifier rule prevents legitimate adapter-specific retry hints (e.g. Supabase `Retry-After`), introduce a side-channel `RetryHint` value object via a superseding ADR — but never a per-instance `retryable` field on `RepositoryFailure`.

## References

- `.lovable/plan.md` — UX-2 roadmap v5, Invariant 3
- ADR-0008 — Caller-level retry decisions consume `isRetryable`
- RISK-008 — Adapter parity risk
