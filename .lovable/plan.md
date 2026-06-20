# Step 1 — Shared-Kernel Scaffolding (Ratified v3 — Final)

Approved for implementation. v3 folds in the four long-term hardening recommendations from review.

## Four Authorities

| Authority | Single Source | Active From |
|---|---|---|
| Time | `ClockPort` | Step 1 |
| Identity | `IdPort` | Step 1 |
| Retry Policy | `isRetryable()` | Step 1 |
| Transaction Boundary | `UnitOfWorkPort` | UX-2B |

Both Temporal and Identity Authority live in **ADR-0006** (extended), not a new ADR-0012. ADR-0006 sections: (a) Temporal Authority, (b) Identity Authority, including Rule R-0008 (Id opacity, no `as Id<T>` outside allowed boundaries).

## Scope

```
src/shared-kernel/
├── result/        Result<T,E>  — Operational Outcome
├── either/        Either<L,R>  — Algebraic ADT only (NOT for errors)
├── errors/        DomainError, ApplicationError,
│                  InfrastructureFailure{phase:'execution'|'commit'|'post-commit'},
│                  RepositoryFailure (union), isRetryable (SINGLE export)
├── time/          Instant (immutable, no zero-arg factory), ClockPort
├── identity/      Id<TBrand> (opaque branded VO), IdPort
├── events/        DomainEvent { id, occurredAt:Instant, type, payload,
│                                 metadata?: Readonly<{correlationId?, causationId?}> }
├── context/       RequestContext (Readonly: tenantId, userId, correlationId, locale)
├── base/          ValueObject, Entity (with version), AggregateRoot
├── pagination/    Page, PageRequest
└── index.ts       SOLE public surface (barrel)
```

Tests under `src/shared-kernel/__tests__/`.

## Contract refinements

**Result vs Either (contractual separation):**
- `Result<T, E>` — every use case, repository, port, and handler returns this.
- `Either<L, R>` — algebraic choice between two equally valid types; **MUST NOT** carry application errors. Allowed only inside shared-kernel for composite/mathematical models.
- Enforced (later) by a fitness rule banning `Either` in return positions of `application/**`, `domain/**` ports, and repositories.

**Aggregate Version (placeholder from day one):**
- `Entity` exposes `protected readonly version: number` (default `0`).
- `AggregateRoot.pullEvents()` returns frozen snapshot and clears buffer; bumping version is reserved for UX-2B (Optimistic Concurrency) — no logic added in Step 1.
- Reason: retrofitting `version` later mutates every aggregate signature.

**DomainEvent metadata (optional, reserved):**
- `metadata?: Readonly<{ correlationId?: string; causationId?: string }>` baked in from day one.
- Not consumed yet; reserves the interface shape for Saga / Outbox / Event Replay / distributed tracing without future breaking change.

**ValueObject:**
- Each VO declares identity fields explicitly (`protected identityFields()`).
- `equals()` compares only those fields, order-independent. No `JSON.stringify`.

**AggregateRoot:**
- `protected record(event)`, `public pullEvents(): readonly DomainEvent[]` (frozen, then cleared). No public getter/setter, no direct array access.

**Instant:**
- Equality by `epochMillis` only.
- Round-trip test: `Instant → epochMillis → Instant` is `equals` to original.

**Result — Monad law tests:**
- Left Identity, Right Identity, Associativity, `map` identity, `map` composition.

**RequestContext:**
- `Readonly`; `tenantId`, `userId`, `correlationId`, `locale` immutable post-construction.

**Id (Rule R-0008, into ADR-0006):**
- `Id<TBrand>` opaque branded VO. No `as Id<T>` assertions outside `shared-kernel/identity/**`, allow-listed repository deserialization boundaries (empty in Step 1), and `__tests__/**`.

## Fitness checks (`scripts/fitness/`)

**Active in Step 1 (4):**
- `check-temporal-authority` — forbids `Date.now`, `new Date(...)`, `performance.now`, `Intl.*` outside `shared-kernel/time/ClockPort.ts` and test fixtures.
- `check-identity-authority` — forbids `crypto.randomUUID`, `uuid()`, `Math.random`-based id generation, AND `as Id<...>` assertions outside allowed paths.
- `check-retryability-single-source` — exactly one exported `isRetryable` under `shared-kernel/errors/**`.
- `check-no-deep-imports` (NEW) — any import path matching `shared-kernel/*/...` outside `src/shared-kernel/**` is a violation. Only `from "@/shared-kernel"` (the barrel) is permitted.

**Pending (scaffolded, return `{ pending: true }`):**
`check-domain-purity`, `check-domain-service-purity`, `check-aggregate-boundaries`, `check-domain-events-immutable`, `check-error-mapping`, `check-repository-failure-taxonomy`, `check-handler-signature`, `check-ui-infrastructure-isolation`, `check-composition-root-uniqueness`, `check-transaction-finality`.

`scripts/fitness/run-all.ts` runs the full suite.

## Pre-flight

Re-run security scan to triage residual TOTP finding → `docs/security/totp-scan-followup.md`.
- **False Positive:** document and close. Step 2 may proceed.
- **Residual Read Path:** Step 2 (Domain) **blocked** until closed.

Does not block Step 1 start.

## Non-goals

No `domain/finance/**`, no `application/**`, no `infrastructure/**`, no edits to `src/integrations/supabase/**`, no UI changes.

## Exit criteria (Step 1 → UX-2A gate)

1. All shared-kernel modules compile under strict TS with zero React/Supabase imports.
2. Unit tests green: Result Monad laws, Instant equality + round-trip, RepositoryFailure exhaustiveness, isRetryable mapping, AggregateRoot record/pullEvents contract, ValueObject identity-field equality, Id branding + assertion prohibition, Entity.version default.
3. Four Active fitness checks pass (incl. `check-no-deep-imports`).
4. All Pending checks present and runnable.
5. `@/shared-kernel` is the sole import surface used anywhere outside `src/shared-kernel/**`.
6. TOTP scan triaged and documented.

## ADR follow-up

Extend **ADR-0006** with the Identity Authority section + Rule R-0008. No new ADR-0012.
