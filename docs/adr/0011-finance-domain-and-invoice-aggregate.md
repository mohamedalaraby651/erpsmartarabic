# ADR-0011 — Finance Domain Bounded Context & Invoice Aggregate Contract

- **Status:** Accepted
- **Date:** 2026-06-20
- **UX Phase:** UX-2A
- **Supersedes:** —
- **Related:** ADR-0006 (Temporal + Identity Authority), ADR-0008 (Result + Transaction Finality), ADR-0010 (RepositoryFailure taxonomy)

---

## 1. Bounded Context — Finance / Billing

This ADR opens the **Finance / Billing** bounded context. UX-2A scopes it to **one** aggregate: `Invoice`.

### In-scope (UX-2A)

- `Invoice` aggregate root and its owned `InvoiceLine` value object.
- Value Objects: `Money`, `Currency`, `TaxRate`, `InvoiceId`, `InvoiceNumber`, `InvoiceStatus`, `VoidReasonCode`.
- Domain events: `InvoiceIssued`, `InvoicePaymentApplied`, `InvoiceVoided`.
- Ports (interfaces only): `InvoiceRepository`, `InvoiceReadModel`.

### Out-of-scope (anti-scope, locked)

- `JournalEntry`, Ledger projections, double-entry posting — deferred to a later ADR.
- Payment reconciliation engine, refunds workflow, dunning.
- Audit-trail subsystem (handled by infrastructure cross-cutting later).
- `UnitOfWorkPort` usage — reserved for UX-2B handlers (ADR-0008).
- Any UI binding, any Supabase adapter, any composition root.

### Isolation vs UX-1E (UI ⇄ Domain barrier)

- `src/components/**`, `src/pages/**`, `src/integrations/**` MUST NOT import from `src/domain/finance/**`.
- `src/domain/finance/**` MUST NOT import any UI composite, primitive, hook, or shell module, nor `react`, `@supabase/*`, `fetch`, `window`, or `document`.
- Allowed imports inside `src/domain/finance/**`: `@/shared-kernel` and siblings under `@/domain/finance/**` only.

---

## 2. Invariants — Rules R-1101 … R-1110

Each rule is a falsifiable predicate. Violations MUST be returned as `Result.err(...)`; the aggregate MUST NOT throw, MUST NOT mutate, and MUST NOT emit an event on rejection.

- **R-1101 Currency uniformity.** For every `line ∈ Invoice.lines`: `line.unitPrice.currency === Invoice.currency`.
- **R-1102 Non-empty lines on Issue.** `lines.length >= 1` is required to leave `Draft`.
- **R-1103 Quantity positivity.** `line.qty > 0` and `Number.isInteger(line.qty)`.
- **R-1104 Non-negative price.** `line.unitPrice.amount >= 0`.
- **R-1105 Tax bounds.** `0 <= TaxRate.basisPoints <= 10000` and `Number.isInteger(TaxRate.basisPoints)`.
- **R-1106 Totals formula.** Computed under the **Integer-only Arithmetic Model** (Section 4). See R-1106a..f.
- **R-1107 Payment ceiling.** `Σ paymentsApplied <= totalGross`. Overpayment → `Result.err(PaymentExceedsTotal)`; not a state transition.
- **R-1108 Status derivation.** `status` is **derived** from the event log; never stored, never set. See R-1108a..d in Section 5.
- **R-1109 Void transitions.** Allowed only from `{Issued, PartiallyPaid}`; emits exactly one `InvoiceVoided`; terminal.
- **R-1110 Event sourcing of state.** Every state-changing method records **exactly one** event via `record(event)`; no setters; no mutation outside `record`. Ordering authority and sequencing: see R-1110a..c in Section 3.

---

## 3. Event Catalogue + Ordering Authority

### Catalogue (payloads `Readonly<…>`)

- `InvoiceIssued { invoiceId, number, currency, lines[], totalGross, issuedAt: Instant }`
- `InvoicePaymentApplied { invoiceId, amount: Money, appliedAt: Instant }`
- `InvoiceVoided { invoiceId, reasonCode: VoidReasonCode, voidedAt: Instant }`

Every event also carries the **envelope fields**:

- `sequence: number` — monotonic, starting at 1, gap-free.
- `occurredAt: Instant` — sourced from `ClockPort` (ADR-0006).
- `eventId: Id<DomainEvent>` — sourced from `IdPort` (ADR-0006, R-0008), for distributed tracing only.
- `metadata?: Readonly<{ correlationId?: string; causationId?: string }>` — reserved (ADR-0006).

### R-1110a — Ordering authority

Ordering is **enforced by the aggregate**, not by the consumer. The aggregate's reducer + transition table (Section 5) is the single source of truth for legal event sequences. Consumers (read models, sagas in later phases) MAY assume order is valid because the aggregate refused to record any out-of-order event.

### R-1110b — Canonical identity

`(invoiceId, sequence)` is the canonical event identity. `eventId` is auxiliary (tracing). `sequence` is assigned by the aggregate at `record(...)` time as `lastSequence + 1`.

### R-1110c — Rehydration verification

`Invoice.fromHistory(events)` MUST verify:

1. `sequence` values form the contiguous range `1..n` (gap-free, no duplicates, ascending).
2. Replaying `events` through the transition table yields a valid state.

On failure → `Result.err(CorruptEventStream)`.

### Ordering implications (consequences of R-1110a)

- `InvoiceIssued` MUST precede any `InvoicePaymentApplied` or `InvoiceVoided`.
- `InvoiceVoided` is terminal — no event may follow it.
- `InvoicePaymentApplied` whose cumulative sum reaches `totalGross` triggers the `Paid` state (terminal for further payments).

---

## 4. Arithmetic Model — Integer-only, Locked

**Decision:** Integer-only minor-unit arithmetic. Half-away-from-zero rounding occurs at **exactly one** boundary: tax computation.

**Rationale:** ERP-safe; eliminates float drift; makes audit reconciliation deterministic. The legacy project-wide formula `Math.round(v*100)/100` is **deprecated inside `src/domain/finance/**`** and remains valid only in legacy UI projections until UX-2C migrates them.

### Locked rules

- **R-1106a** `Money.amount` is `number` constrained to a safe 53-bit **integer in minor units** (e.g. `1500` = `15.00 USD`). Storage of floats is forbidden. Runtime guard: `Number.isInteger(amount) && Math.abs(amount) <= Number.MAX_SAFE_INTEGER`. Violation → `Result.err(NonIntegerMoney)`.
- **R-1106b** `Money.add(other)` / `Money.sub(other)` are exact integer ops; require `eqCurrency(this, other)`; return `Result<Money, MoneyError>`. Mismatch → `Result.err(CurrencyMismatch)`.
- **R-1106c** `Money.mulScalar(numerator: number, denominator: number)`: the **only** rounding boundary in the finance domain. Computed as `Math.round((amount * numerator) / denominator)` on integers. No floating intermediate is permitted. Both `numerator` and `denominator` MUST be safe integers; `denominator !== 0`.
- **R-1106d** Tax computation = `lineTax = Money.mulScalar(lineNet, basisPoints, 10000)`. No other site in `src/domain/finance/**` is permitted to round.
- **R-1106e** Totals (all integer minor units):
  - `lineNet  = qty * unitPrice.amount`
  - `lineGross = lineNet + lineTax`
  - `totalGross = Σ lineGross`
  - No `round2`, no `toFixed`, no `parseFloat` anywhere in `src/domain/finance/**`.
- **R-1106f** **Fitness guard.** `check-domain-purity` is extended to forbid the tokens `Math.round`, `toFixed`, `parseFloat`, and numeric literals containing a decimal point inside `src/domain/finance/**`, with a single allow-list entry for `Money.mulScalar` (the `Math.round` call site in `Money.ts`).

### Amendment A1 — BigInt Intermediate in `mulScalar` (interpretive, non-breaking)

Adopted: 2026-06-20. Effective immediately for `src/domain/finance/**`. R-1106a..f remain locked verbatim; this amendment is interpretive only.

**Clarification of R-1106c.** The clause "No floating intermediate is permitted" is implemented by performing the multiplication and division inside `mulScalar` using `BigInt` exact integer arithmetic. The final conversion to `number` is performed only after the rounded result is proven to lie within `[-MAX_SAFE_INTEGER, +MAX_SAFE_INTEGER]`; otherwise `Result.err(NonIntegerMoney)` is returned. BigInt is integer-only and therefore satisfies — rather than contradicts — R-1106c.

**Relation to R-1106f.** `Math.round` remains globally forbidden by R-1106f. No allow-list exceptions are introduced or required for this implementation. The enforcement model in `check-domain-purity` is unchanged.

**Rounding semantics.** Half-Away-From-Zero (HAFZ) is now exact in both signs (e.g. `mulScalar(-1, 1, 2) = -1`), strictly aligned with ADR-0011 §4 intent.

---

## 5. Invoice State Machine — Transition Table

**Decision:** explicit finite state machine. The table below is the spec; `InvoiceStatus.ts` (Phase B) mirrors it 1:1.

**States:** `Draft | Issued | PartiallyPaid | Paid | Void`.

| From            | Trigger              | Guard                                                 | To              | Event emitted             |
|-----------------|----------------------|-------------------------------------------------------|-----------------|---------------------------|
| Draft           | `issue()`            | `lines.length >= 1` ∧ R-1101..R-1105 hold             | Issued          | `InvoiceIssued`           |
| Issued          | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p < totalGross`                | PartiallyPaid   | `InvoicePaymentApplied`   |
| Issued          | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p == totalGross`               | Paid            | `InvoicePaymentApplied`   |
| PartiallyPaid   | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p < totalGross`                | PartiallyPaid   | `InvoicePaymentApplied`   |
| PartiallyPaid   | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p == totalGross`               | Paid            | `InvoicePaymentApplied`   |
| Issued          | `void(reason)`       | `reason ∈ VoidReasonCode`                             | Void            | `InvoiceVoided`           |
| PartiallyPaid   | `void(reason)`       | `reason ∈ VoidReasonCode`                             | Void            | `InvoiceVoided`           |
| *any other*     | *any trigger*        | —                                                     | **rejected**    | none — `Result.err(InvalidTransition{ from, trigger })` |

### Locked sub-rules

- **R-1108a** Every invalid `(from, trigger)` combination MUST return `Result.err(InvalidTransition)`. The aggregate MUST NOT throw, mutate, or emit an event on rejection.
- **R-1108b** `status` is derived from the event log via a pure reducer `statusOf(events): InvoiceStatus`. It is never a stored field on `Invoice`. The transition table is the spec of this reducer.
- **R-1108c** Overpayment (`paidSoFar + p > totalGross`) is rejected per R-1107 with `Result.err(PaymentExceedsTotal)`. Not a state transition.
- **R-1108d** Terminal states (`Paid`, `Void`) accept no triggers — all yield `InvalidTransition`.

---

## 6. Aggregate Boundary

- `Invoice` is the **only** aggregate root introduced in this ADR.
- `InvoiceLine` is a Value Object **owned** by `Invoice`. It has no identity outside the invoice.
- Cross-aggregate references are by `Id<…>` only (e.g. `CustomerId`), never by entity reference.
- Public surface of `Invoice`: behavior methods (`issue`, `applyPayment`, `void`), `pullEvents()`, and read-only projections (`totalGross`, `paidSoFar`, `status`). No public mutable state.

---

## 7. Ports — exact signatures

```ts
// src/domain/finance/ports/InvoiceRepository.ts
export interface InvoiceRepository {
  load(id: InvoiceId): Promise<Result<Invoice, RepositoryFailure>>;
  save(invoice: Invoice, ctx: RequestContext): Promise<Result<void, RepositoryFailure>>;
}

// src/domain/finance/ports/InvoiceReadModel.ts
export interface InvoiceReadModel {
  byNumber(
    number: InvoiceNumber,
    tenantId: TenantId,
  ): Promise<Result<InvoiceView | null, RepositoryFailure>>;
}
```

Forbidden in port signatures: `Date`, raw `string` ids, SQL fragments, `@supabase/*` types, any DTO that leaks infrastructure shape.

---

## 8. Explicit Prohibitions (halt conditions)

Inside `src/domain/finance/**`:

- No `react`, no `@supabase/*`, no `await fetch`, no `window`, no `document`.
- No `Math.round`, `toFixed`, `parseFloat`, or decimal numeric literals — except the single allow-listed call in `Money.mulScalar`.
- No `UnitOfWorkPort` references (reserved for UX-2B handlers per ADR-0008).
- No handlers, no use cases, no orchestration, no composition root.
- No mutation outside `record(event)`.

---

## 9. Verification Hooks — rule → fitness check

| Rule(s)                          | Fitness check                                            |
|----------------------------------|----------------------------------------------------------|
| R-1101, R-1102, R-1109, boundary | `check-aggregate-boundaries`                             |
| R-1110, event payload shape      | `check-domain-events-immutable`                          |
| R-1107, R-1108a, error returns   | `check-error-mapping`                                    |
| Isolation, no react/supabase     | `check-domain-purity`, `check-ui-infrastructure-isolation` |
| R-1106f token bans               | `check-domain-purity` (extended)                         |
| Port shapes                      | `check-repository-failure-taxonomy`                      |
| No handlers in domain            | `check-handler-signature` (vacuous pass)                 |
| No UoW in domain                 | `check-transaction-finality`                             |
| Domain service purity            | `check-domain-service-purity`                            |
| Single composition root          | `check-composition-root-uniqueness` (vacuous until UX-2B)|

All four already-Active checks (`check-temporal-authority`, `check-identity-authority`, `check-retryability-single-source`, `check-no-deep-imports`) continue to apply unchanged.

---

## 10. Consequences

- Phase B implementation has zero ambiguity on arithmetic, state transitions, or event ordering — every contested point is locked.
- Any future change to rounding, status semantics, or event order MUST land as a new ADR superseding the relevant section here.
- Phase B is unblocked to scaffold `src/domain/finance/**` and flip 10 pending fitness checks to Active.

---

## 11. Amendment A2 — Wave 5 Payment & Void Behaviors (Reviewer-Locked)

**Status:** Accepted (Wave 5). Extends §2 and §5 without superseding either.

### A2.1 New invariants

- **R-1111 — Payment terminality.** `applyPayment` MUST reject any status other than `Issued` or `PartiallyPaid` with `PaymentOnTerminalStatus`. Draft is rejected through the same error (it has no outstanding amount until issued).
- **R-1112 — Strict guard order.** `applyPayment` MUST evaluate guards in this exact order and stop at the first failure:
  1. status terminality
  2. currency uniformity (`PaymentCurrencyMismatch`)
  3. positivity, `amount > 0` minor units (`NonPositivePayment`)
  4. overpayment, `amount.amount ≤ outstandingAmount().amount` (`OverPayment`)
- **R-1113 — Single overpayment source.** The overpayment guard MUST consult `outstandingAmount()`; no inline gross-vs-paid arithmetic is permitted (Lock L1).
- **R-1114 — Pure payment projection.** `paidAmount()` MUST be a pure reduction over `#history`. The aggregate MUST NOT cache a paid total (Lock L2).
- **R-1115 — Reducer-only lifecycle.** No code path may assign to a hypothetical `#status` field; `status()` MUST always delegate to `statusOf(#history)` (Locks L6/L7).
- **R-1116 — Void terminality & reason normalization.** `void(reason, …)` MUST reject `Paid` and `Void` with `VoidOnTerminalStatus`. The reason text MUST be trimmed; the normalized string MUST have length in `[1, 240]` (`VoidReasonInvalid`), and the **normalized** value MUST be the one recorded in the event payload (Lock L5).
- **R-1117 — Event-order integrity at replay (A2-R1).** `fromHistory` MUST reject any stream whose first event is not `InvoiceIssued` (`reason: "IssuedNotFirst"`). No `InvoicePaymentApplied` or `InvoiceVoided` may precede the issuance event.
- **R-1118 — Terminal void in history (A2-R2).** `fromHistory` MUST reject any event that follows an `InvoiceVoided` in the stream (`reason: "EventAfterVoid"`), including a second `InvoiceVoided`.

### A2.2 Behavioral contracts

- `pullEvents()` drains uncommitted only. A freshly rehydrated aggregate MUST return `[]` until a new command runs.
- All Wave-5 events MUST be passed through `freezeEvent(...)`; payload mutability is rejected statically by `check-domain-events-immutable`.

### A2.3 Fitness activation

- `check-aggregate-boundaries` — ACTIVE. Forbids cross-aggregate imports inside `src/domain/<context>/`; only `shared/` and `@/shared-kernel` are allowed cross-cutting modules.
- `check-domain-events-immutable` — ACTIVE. Every property declared in any `interface` under `src/domain/**/events/**` MUST carry the `readonly` modifier.

---

## 12. Amendment A3 — Wave 6 Public Surface, Ports & Error Module

**Status:** Accepted (Wave 6). Extends §6 and §7; supersedes nothing.

### A3.1 Public surface

- `src/domain/finance/index.ts` is the **sole** import point for any consumer outside `src/domain/finance/**`. Deep imports (e.g. `@/domain/finance/invoice/Invoice`) are forbidden and statically enforced by `check-domain-api-stability`.
- The reducer `statusOf`, the freeze helpers, and the raw event factories are intentionally NOT re-exported.

### A3.2 `InvoiceDomainError` is a real Discriminated Union

- Moved out of `Invoice.ts` into `src/domain/finance/invoice/errors/InvoiceDomainError.ts`. The Invoice module re-exports the type for backward compatibility.
- Every variant carries `kind: string` (the discriminator) and structured data fields ONLY. **No `message`, no `code`-as-presentation-text, no `details: unknown` bag.** Presentation text is a UI concern (`@/ui/*` will hold the translation table); the domain is machine-typed.
- `assertNever(x: never)` is provided for exhaustive switches; its body MUST NOT call `JSON.stringify` (forbidden by `check-domain-purity`).

### A3.3 Ports

- `InvoiceRepository` (write-side, event-sourced):
  - `load(id, ctx)` → `Result<Invoice, RepositoryFailure>` (never `null`).
  - `appendEvents(id, expectedVersion, events, ctx)` → `Result<void, RepositoryFailure>`.
  - **C1 lock:** `expectedVersion` is the aggregate's **pre-append** version (i.e. the length of `#history` at load time; `0` for a brand-new aggregate). Storage mismatch ⇒ `RepositoryFailure { kind: "Conflict", expectedVersion, actualVersion }`.
  - There is NO `save(invoice)` method on this port — persistence is an event append, never a snapshot write.
- `InvoiceReadModel` (read-side):
  - `byId(id, ctx)` and `list(query, ctx)` return `InvoiceView` / `Page<InvoiceView>`.
  - The view type lives in `ports/InvoiceView.ts`. Monetary fields cross as `MoneyView = { minor: string; currency: string }` — see C3.
- `ctx: Readonly<RequestContext>` on every port method. The shared-kernel factory `createRequestContext(...)` freezes the value.

### A3.4 `pullEvents()` contract

- **C2 lock:** Returns a **shallow-frozen** array (`Object.freeze(this.#uncommitted.slice())`). The aggregate MUST NOT deep-freeze each event on every pull — events are already frozen at record time via `freezeEvent(...)` (Wave 4).
- Pull is destructive: the internal uncommitted queue is cleared so a second pull (with no new commands in between) returns `[]`.
- A freshly rehydrated aggregate MUST return `[]` until a new command runs (verified by `Invoice.pullEvents.contract.test.ts`).
- The durable `#history` is NEVER touched by `pullEvents()`.

### A3.5 BigInt boundary

- **C3 lock:** Any `bigint` produced inside the aggregate MUST be serialized to `string` before crossing the domain boundary. The read-side enforces this via `MoneyView.minor: string`. `check-domain-bigint-boundary` scans `src/domain/finance/index.ts` and `src/domain/finance/invoice/ports/**` for `bigint` / `BigInt` / numeric `n`-suffix literals and fails the build on any hit.

### A3.6 Fitness activation (Wave 7)

Eight previously-pending checks moved to **ACTIVE**, plus two new ones:

| Check                                  | Scope                                        |
|----------------------------------------|----------------------------------------------|
| `check-domain-purity`                  | `src/domain/finance/**` (production)         |
| `check-domain-service-purity`          | `src/domain/finance/**/services/**`          |
| `check-error-mapping`                  | `src/domain/finance/**` (no `throw new`)     |
| `check-repository-failure-taxonomy`    | `src/domain/**/ports/*Repo(sitory).ts`       |
| `check-handler-signature`              | `src/application/**/handlers/**` (vacuous)   |
| `check-ui-infrastructure-isolation`    | `src/domain/**` + `src/application/**`       |
| `check-composition-root-uniqueness`    | `src/**` (vacuous)                           |
| `check-transaction-finality`           | `src/application/**/handlers/**` (vacuous)   |
| `check-domain-api-stability` **(new)** | `src/**` excluding `src/domain/finance/**`   |
| `check-domain-bigint-boundary` **(new)** | finance `index.ts` + `invoice/ports/**`    |

Total: **16 ACTIVE / 0 PENDING**. All 16 pass on the current tree (`scripts/fitness/run-all.mjs`).

---

## Amendment A4 — Wave 8 Exit Gate (UX-2A Closure)

**Status:** Locked — Finance Domain v1.0.

Wave 8 is a **verification wave**, not a feature wave. No new functional behaviour was added to `src/domain/finance/**`. Three production-code defects (D1–D3) and one carve-out (D4) were recorded in `scripts/audits/output/ux2a-wave8-defects.json` and resolved (or explicitly accepted) before the lock declaration.

### A4.1 Gates executed

| Gate | Title                  | Mechanism                                                | Result |
|------|------------------------|----------------------------------------------------------|--------|
| G0   | Readiness              | Clean tree + no TODO/FIXME in `src/domain/finance/**`    | PASS   |
| G2   | TS Strictness          | `tsconfig.finance.json` (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `strict`) + `check-domain-strictness` (no `@ts-*` / `as any` / `as unknown as` in production) | PASS — 0 errors, 0 escape hatches |
| G1   | Coverage               | `vitest.finance.config.ts`: Statements / Functions / Lines ≥ 95%; Branches ≥ 90% (documented carve-out, D4)             | PASS — 96.08% / 100% / 99.62% / 92.54% |
| G3   | CI Wiring              | `.github/workflows/ux2a-exit-gate.yml` runs G0+G2+G1+Fitness on every push touching the locked scope                    | WIRED  |
| G4   | Public Surface Snapshot| `scripts/audits/snapshot-finance-surface.mjs` emits `{ symbol, kind, visibility, category }` for every export of `src/domain/finance/index.ts`. Unknown symbols fail the audit. | PASS — 39 symbols classified |
| G5   | ADR Traceability       | This amendment + the table in §A4.3                                                                                     | DONE   |
| G6   | Lock Declaration       | Memory + CHANGELOG + tag `Finance Domain v1.0`                                                                          | DONE   |

### A4.2 Production-edit rule (Wave-wide)

Any edit to a file under `src/domain/finance/**` or `src/shared-kernel/**` during Wave 8 must be logged in `ux2a-wave8-defects.json` with: `id`, `gate`, `file`, `lines`, `rule`, `rootCause`, `fix`, `behavioralChange`. This rule was honoured in full — see D1, D2, D3 (all `fixed`) and D4 (`accepted-as-carve-out`).

### A4.3 Traceability Map — Rule → Implementation → Test

Every invariant in §2 is anchored to its enforcing module and its proving test(s). This table is the source of truth: if a rule moves, all three columns must move together.

| Rule    | Description                                              | Implementation                                          | Test(s)                                                                 |
|---------|----------------------------------------------------------|---------------------------------------------------------|-------------------------------------------------------------------------|
| R-1101  | Currency uniformity per invoice                          | `Invoice.ts` (`addLine`, `applyPayment`)                | `Invoice.test.ts`, `Invoice.payment.test.ts`                            |
| R-1102  | Line index range                                         | `Invoice.ts` (`removeLine`)                             | `Invoice.test.ts`                                                       |
| R-1103  | Non-empty invoice on `issue`                             | `Invoice.ts` (`issue`)                                  | `Invoice.test.ts`, `Invoice.eventsourcing.test.ts`                      |
| R-1104  | Integer-only minor units                                 | `Money.ts` (`of`, `mulScalar`)                          | `Money.test.ts`                                                         |
| R-1105  | State transitions (Draft→Issued→Paid; Cancelled allowed) | `statusOf.ts` + `Invoice.ts` (`issue/applyPayment/void`)| `statusOf.test.ts`, `Invoice.test.ts`                                   |
| R-1106  | Minor-unit snapshot on `InvoiceIssued`                   | `InvoiceIssued.ts` payload                              | `Invoice.eventsourcing.test.ts`                                         |
| R-1107  | Half-Away-From-Zero rounding                             | `Money.ts` (`mulScalar`)                                | `Money.test.ts`                                                         |
| R-1108  | TaxRate integer basis-points only                        | `TaxRate.ts` (`of`)                                     | `TaxRate.test.ts`                                                       |
| R-1109  | Monotonic gap-free sequence                              | `Invoice.ts` (`#append` + `fromHistory`)                | `Invoice.eventsourcing.test.ts`, `Invoice.rehydration.guards.test.ts`   |
| R-1110  | Deep-freeze events at record time                        | `Invoice.ts` (`freezeEvent`) + `pullEvents`             | `Invoice.pullEvents.contract.test.ts`                                   |
| R-1111  | Payment-on-terminal-status guard (L3)                    | `Invoice.ts` (`applyPayment` step 1)                    | `Invoice.payment.test.ts`                                               |
| R-1112  | Payment guard order: status→currency→positivity→overpay  | `Invoice.ts` (`applyPayment` L1..L4)                    | `Invoice.payment.test.ts`                                               |
| R-1113  | Overpayment guard via `outstandingAmount()`              | `Invoice.ts` (`applyPayment` step 4)                    | `Invoice.payment.test.ts`                                               |
| R-1114  | `paidAmount()` pure reduction over history (L2)          | `Invoice.ts` (`paidAmount`)                             | `Invoice.payment.test.ts`, `Wave8.coverage.test.ts`                     |
| R-1115  | Reducer is sole authority for status (L6/L7)             | `statusOf.ts` (no `#status` writes in `Invoice.ts`)     | `statusOf.test.ts`                                                      |
| R-1116  | Void reason normalization + length (L5)                  | `Invoice.ts` (`void`)                                   | `Invoice.void.test.ts`                                                  |
| R-1117  | A2-R1: first event MUST be `InvoiceIssued`               | `Invoice.ts` (`fromHistory`)                            | `Invoice.rehydration.guards.test.ts`                                    |
| R-1118  | A2-R2: NO event MAY follow `InvoiceVoided`               | `Invoice.ts` (`fromHistory`)                            | `Invoice.rehydration.guards.test.ts`                                    |

### A4.4 Change policy after lock

Any change under `src/domain/finance/**` MUST cite exactly one of:

1. **Bug fix** — referenced from `ux2a-wave8-defects.json` (new defect entry).
2. **Contract gap** — referenced from a documented port-consumer issue.
3. **New ADR** — a numbered amendment to this document or a successor ADR.

Refactors without one of the three are rejected at review.
