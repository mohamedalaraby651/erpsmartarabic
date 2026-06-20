# Step 2 — UX-2A: Finance Domain (Invoice) — Plan v3

Incorporates the pre-approval audit. Two mandatory fixes (arithmetic model lock, explicit state machine) and one clarification (event ordering authority) are now embedded as **first-class requirements of ADR-0011**, not implementation details.

Execution remains gated in two phases. No `src/**` code in Phase A.

---

## Phase A — ADR-0011 Only (Contract Lock)

Single deliverable: `docs/adr/0011-finance-domain-and-invoice-aggregate.md` + `docs/adr/INDEX.md` row. Zero `src/**` changes. Zero tests. Zero scripts. Zero migrations.

### Audit fixes — locked into ADR-0011

#### FIX 1 — Arithmetic Model (resolves R-1106 ambiguity)

**Decision: Option A — Integer-only minor-unit arithmetic. Locked. Half-away-from-zero rounding occurs at exactly one boundary: tax computation.**

Rationale: ERP-safe, eliminates float drift, makes audit reconciliation deterministic. Aligns with the project-wide "Financial Precision" rule (`Math.round(v*100)/100` is the *legacy* formula and is explicitly **deprecated inside `domain/finance/**`**; it remains valid only in legacy UI projections until UX-2C migrates them).

Locked rules added to ADR-0011:
- **R-1106a** `Money.amount` is `number` constrained to a safe 53-bit integer in **minor units** (e.g. 1500 = 15.00 USD). Floats are forbidden as storage; runtime guard: `Number.isInteger(amount) && Math.abs(amount) <= Number.MAX_SAFE_INTEGER`.
- **R-1106b** `Money.add` / `Money.sub` are exact integer ops; require equal `currency`; return `Result<Money, MoneyError>`.
- **R-1106c** `Money.mulScalar(numerator, denominator)`: the **only** rounding boundary. Computed as `Math.round((amount * numerator) / denominator)` on integers. No floating intermediate.
- **R-1106d** Tax computation = `lineTax = mulScalar(lineNet, basisPoints, 10000)`. No other site is permitted to round.
- **R-1106e** Totals: `lineNet = qty * unitPrice.amount` (integer); `lineGross = lineNet + lineTax` (integer); `totalGross = Σ lineGross` (integer). No `round2` anywhere in `domain/finance/**`.
- **R-1106f** Fitness guard: `check-domain-purity` is extended to forbid `Math.round`, `toFixed`, `parseFloat`, and `.` numeric literals containing a decimal point inside `src/domain/finance/**` outside `Money.mulScalar`.

#### FIX 2 — Invoice State Machine (resolves R-1108 ambiguity)

**Decision: explicit finite state machine, encoded as a transition table inside ADR-0011 and mirrored 1:1 by `InvoiceStatus.ts` in Phase B.**

States: `Draft | Issued | PartiallyPaid | Paid | Void`.

Transition table (locked):

| From            | Trigger              | Guard                                                 | To              | Event emitted             |
|-----------------|----------------------|-------------------------------------------------------|-----------------|---------------------------|
| Draft           | `issue()`            | `lines.length >= 1` ∧ R-1101..R-1105 hold             | Issued          | `InvoiceIssued`           |
| Issued          | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p < totalGross`                | PartiallyPaid   | `InvoicePaymentApplied`   |
| Issued          | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p == totalGross`               | Paid            | `InvoicePaymentApplied`   |
| PartiallyPaid   | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p < totalGross`                | PartiallyPaid   | `InvoicePaymentApplied`   |
| PartiallyPaid   | `applyPayment(p)`    | `p > 0` ∧ `paidSoFar + p == totalGross`               | Paid            | `InvoicePaymentApplied`   |
| Issued          | `void(reason)`       | reason ∈ `VoidReasonCode`                             | Void            | `InvoiceVoided`           |
| PartiallyPaid   | `void(reason)`       | reason ∈ `VoidReasonCode`                             | Void            | `InvoiceVoided`           |
| *any other*     | *any trigger*        | —                                                     | **rejected**    | none — `Result.err(InvalidTransition{from, trigger})` |

Locked rules:
- **R-1108a** Every invalid (from, trigger) combination MUST return `Result.err(InvalidTransition)`. Aggregate MUST NOT throw, MUST NOT mutate, MUST NOT emit an event on rejection.
- **R-1108b** `status` is **derived** from the event log via a pure reducer `statusOf(events): InvoiceStatus`. It is never a stored field on `Invoice`. The transition table is the spec of this reducer.
- **R-1108c** Overpayment (`paidSoFar + p > totalGross`) is rejected per R-1107 with `Result.err(PaymentExceedsTotal)`. Not a state transition.
- **R-1108d** Terminal states (`Paid`, `Void`) accept no triggers — all yield `InvalidTransition`.

#### CLARIFICATION 3 — Event Ordering Authority (point 4 of audit)

Locked in ADR-0011:
- **R-1110a** Ordering is **enforced by the aggregate**, not by the consumer. The aggregate's reducer + transition table is the single source of truth for legal sequences. Consumers (read models, sagas in later phases) MAY assume order is valid because the aggregate refused to record any out-of-order event.
- **R-1110b** Each event carries `sequence: number` (monotonic, starting at 1, gap-free, assigned by the aggregate at `record(...)` time). `occurredAt: Instant` comes from `ClockPort`. `(invoiceId, sequence)` is the canonical event identity; `eventId: Id<DomainEvent>` is provided by `IdPort` for distributed tracing only.
- **R-1110c** Rehydration: `Invoice.fromHistory(events)` MUST verify `sequence` is `1..n` gap-free and that the resulting state matches the transition table; otherwise returns `Result.err(CorruptEventStream)`.

### ADR-0011 — final section list

1. Bounded Context (Finance / Billing) + scope/anti-scope (unchanged from v2).
2. Invariants **R-1101..R-1110** with the R-1106a..f and R-1108a..d sub-rules above.
3. Event Catalogue with **R-1110a..c** ordering authority + `sequence`/`eventId` fields.
4. **Arithmetic Model — Integer-only, Locked** (FIX 1, full text).
5. **Invoice State Machine — Transition Table** (FIX 2, full text).
6. Aggregate Boundary (Invoice root; InvoiceLine VO owned).
7. Ports — exact signatures (Repository + ReadModel, `Result<…, RepositoryFailure>`).
8. Explicit Prohibitions (no react, no `@supabase/*`, no `fetch`, no `Math.round` outside `Money.mulScalar`, no `UnitOfWorkPort`, no handlers, no orchestration).
9. Verification Hooks — each rule mapped to its fitness check (incl. the extended `check-domain-purity` guard from R-1106f).
10. Isolation vs UX-1E (UI ⇄ domain barrier).

### Phase A exit criteria
- ADR-0011 merged with all 10 sections including the locked Arithmetic Model and State Machine tables.
- `docs/adr/INDEX.md` updated.
- No file changes outside `docs/adr/**`.

**STOP. Await ratification before Phase B.**

---

## Phase B — Implementation (only after ADR-0011 ratified)

Scope and folder layout unchanged from v2, with these v3 deltas driven by the audit fixes:

### Code deltas vs v2

- `Money.ts` exposes `add`, `sub`, `mulScalar(num, den)`, `eqCurrency`. No `mul(scalar: number)` with float. No `round2`. Constructor validates `Number.isInteger(amount)`.
- `InvoiceStatus.ts` exports the union `'Draft'|'Issued'|'PartiallyPaid'|'Paid'|'Void'` and `statusOf(events)` pure reducer mirroring the ADR table 1:1.
- `Invoice.ts` exposes behavior methods `issue()`, `applyPayment(p)`, `void(reason)`. Each consults the transition table; on miss → `Result.err(InvalidTransition)`. On hit → constructs event with `sequence = lastSequence + 1` and `occurredAt = clock.now()`, then `record(event)`.
- `Invoice.fromHistory(events)` performs R-1110c verification.
- `events/`: payloads `Readonly<…>` and include `sequence: number`, `occurredAt: Instant`, `eventId: Id<DomainEvent>`, optional `metadata`.
- `errors/InvoiceDomainError.ts` union includes: `InvalidTransition`, `PaymentExceedsTotal`, `EmptyInvoiceLines`, `CurrencyMismatch`, `NegativePrice`, `TaxRateOutOfRange`, `CorruptEventStream`, `NonIntegerMoney`.

### Fitness checks — flip 10 from `pending` to Active (unchanged from v2)

Plus **extension** to `check-domain-purity` per R-1106f: ban `Math.round`, `toFixed`, `parseFloat`, and decimal numeric literals inside `src/domain/finance/**`, with a single allow-list entry for `Money.mulScalar`.

### Tests (raised targets to cover the new rules)

- **Money**: integer-guard rejection, `add`/`sub` currency mismatch, `mulScalar` rounding edges (0.5 boundary, negative, large), no float leakage.
- **State Machine**: one test per legal row + one per representative illegal (from, trigger) combination; terminal-state rejection; overpayment rejection.
- **Event ordering**: `sequence` monotonic; `fromHistory` accepts gap-free, rejects gaps / out-of-order / type mismatch.
- **Aggregate invariants**: R-1101..R-1110 exhaustive.
- **Port contract**: type-level `expectType<…>` only.
- Target: **≥ 75 new tests** green (raised from ≥ 60 to cover state-machine matrix + Money edges), `src/domain/finance/**` coverage ≥ 95%.

### Phase B exit (UX-2A → UX-2B gate)
1. Strict TS compile clean.
2. Imports in `domain/**` limited to `@/shared-kernel` + siblings.
3. All 4 prior Active + 10 flipped checks pass; extended `check-domain-purity` (R-1106f) passes.
4. ≥ 75 tests green; coverage ≥ 95%.
5. No additions under `src/application/**`, `src/infrastructure/**`, `src/integrations/supabase/**`, `src/components/**`, `src/pages/**`, `supabase/migrations/**`.

---

**Awaiting approval to execute Phase A (ADR-0011 only) with the two mandatory fixes and ordering clarification locked in.**
