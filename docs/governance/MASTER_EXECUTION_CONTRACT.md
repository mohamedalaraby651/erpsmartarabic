# Nazra — Master Execution Contract

**Version:** v1.0
**Status:** LOCKED
**Owner:** Human Governance (project owner)
**Applies to:** every change made to this repository, by any agent or human

---

## 1. Role and prohibitions

The implementing agent (Lovable) may **implement, verify, and report**. It may **not certify**.

```text
Implementation → Tests → Evidence → Gate Proposal → Human approval → Certified
```

Prohibited without an explicit instruction: self-certifying a gate, declaring a domain certified, widening a frozen scope, bundling unrelated changes into a scoped batch, re-analyzing the whole project outside the material-change triggers (§26).

## 2. Governing architecture

Modular monolith on Lovable Cloud. Four tiers plus cross-cutting layers:

```text
Presentation (pages, components, hooks)
Application  (command handlers, query facades)
Domain       (pure aggregates, value objects, events)
Infrastructure (repositories, codecs, Supabase adapters, edge functions)
Cross-cutting: kernel (pure), platform (ports/runtime/shell), ui (design system)
```

Microservices, Kubernetes, and system-wide CQRS are explicitly out of scope. Boundaries are governed, not distributed.

## 3. Strangler migration

New capability is built behind the layered architecture; legacy call sites are redirected to facades incrementally. Legacy code is never rewritten wholesale in the same change unit that redirects it.

## 4. The three states

```text
IMPLEMENTED ≠ VERIFIED ≠ CERTIFIED
```

- **Implemented** — code exists.
- **Verified** — fresh evidence exists for this commit (typecheck, build, lint, tests, fitness, audits).
- **Certified** — a human approved a Gate Proposal against that evidence.

## 5. Change classification (applies before any change)

| Class | Examples | Required controls |
|---|---|---|
| A — Trivial | copy, spacing, cosmetic UI, type annotation with no behavior change | isolated diff + typecheck |
| B — Low | presentation component, report formatting, dashboard visuals | tests where applicable + regression |
| C — Medium | contract-visible behavior, non-consequential workflow | contract + tests + evidence |
| D — High | ledger posting, payments, stock movement, sync semantics, tenant authority, permission model, RLS, migrations | ADR + contract + invariant + authority + failure + recovery + fitness + automated tests + evidence + gate |

Governance weight scales with consequence. No ADR ceremony on Class A/B work.

## 6. Architecture proportionality

Controls are added when a consequence justifies them, never pre-emptively in bulk. No mass build-out of ADRs, fitness checks, or gates ahead of the wave that needs them.

## 7. Risk budget

| Value | Risk | Action |
|---|---|---|
| High | Low | Build now |
| High | High | Close the risk first |
| Low | High | Reject |
| Low | Low | Backlog |

## 8. Smart freeze

Frozen until the owning domain is certified: ledger posting, payment execution, stock movement, sync semantics, tenant authority, permission model.

Always allowed (must not break an existing contract or invariant): UI improvements, reporting presentation, dashboard/search UX, accessibility, documentation, onboarding, non-consequential workflow, commercial preparation.

## 9. Enterprise boundary contract

Every boundary is described by: Input → Contract → Invariant → Authority → Evidence → Failure. The eight boundaries are catalogued in `BOUNDARY_CATALOG.md` (Phase 0, not yet created).

## 10. Tenant isolation

`tenant_id` is traceable through every layer: request → command → authority check → repository → RLS policy. No table policy may omit `tenant_id = get_current_tenant()`. Frontend tenant state is a hint; the database is the authority.

## 11. Authorization

A Policy Decision Point orchestrates authorization. A decision carries `effect, policyId, policyVersion, reason, code`. Frontend permission checks are UI hints only; RLS and SECURITY DEFINER RPCs are authoritative.

## 12. Consequential commands

A command is consequential when it moves money, stock, ledger state, tenancy, or permissions. Consequential commands run the full pipeline (§13) and are Class D.

## 13. Command pipeline

```text
Command → Authorization → Idempotency → Transaction → Result → Audit → Failure/Recovery
```

## 14. Idempotency

Every consequential command carries an idempotency key persisted server-side. A replay returns the original result; it never re-executes the effect.

## 15. UnknownOutcome is a state

```text
Pending → Submitted → UnknownOutcome → { Confirmed | Rejected | ReconciliationRequired }
```

Timeouts and lost responses resolve into `UnknownOutcome`, never into a silent success or a silent failure.

## 16. Audit as evidence

Audit records are evidence, not logging. They record who, what, when, on which tenant, under which policy decision, with which correlation id, and the before/after state for consequential changes.

## 17. Correlation

Every request carries a correlation id through UI → application → infrastructure → edge function → audit row.

## 18. Financial invariants

Money is integer minor units; no floats. Rounding happens only in scalar multiplication (HAFZ). Currency equality is strict. Totals are derived, never stored as authority. Financial entities are never hard-deleted; reversal is by compensating entry.

## 19. Offline failure matrix

Every offline-capable action declares its behavior for: queued, conflicting, expired, rejected, and unknown outcomes. No silent local success.

## 20. Fitness check lifecycle

```text
Proposed → Report-only → Enforced → Retired (with ADR)
```

A fitness check is a **rule enforcer**. An inventory or audit script is an **observer**. The two are never conflated, and observers are never wired into gates.

## 21. Inventory authority rule

> **Inventory observes the system; it does not certify the system or authorize architectural decisions.**

The inventory reports what exists, what connects to what, what is exposed, where the hotspots are, and what violations are observed. It never reports that an architecture is acceptable, that a budget breach is a violation of record, that a domain is certified, or that a gate passed. **Inventory observes; Governance decides.**

## 22. Inventory generation vs codebase health

These are reported separately:

```text
Inventory: GENERATED | FAILED
Codebase Health: PASS | KNOWN FAILURE
```

A pre-existing typecheck, lint, or test failure does not block an inventory wave and does not change its scope. Only a failure that prevents generating the inventory blocks it.

## 23. Backend discovery honesty

Backend surface derived from repository files is labelled **repository-observed backend surface**, with `discoverySource` on every entry. It is never presented as the complete live backend. Live verification belongs to the Tenant/Security phases.

## 24. Evidence rules

Every evidence artifact records:

```text
Evidence ID · Snapshot ID · Baseline ID · Parent Baseline · Git Commit ·
Generated At · Environment · Command · Result · Artifact Hash · Owner · Validity
```

Generated reports additionally record: **Source Artifacts**, **Generator Version**, **Schema Version**, Dependency Lock Hash, Build Hash.

Stale or commit-mismatched evidence fails Gate G0 and blocks every downstream gate. Historical results from an earlier commit are never accepted as current evidence.

## 25. Baseline integrity

Baselines are sealed with a fingerprint over the governing artifacts. Waves advance the chain:

```text
BASELINE-NAZRA-001 → Wave 1 → BASELINE-NAZRA-002 → Phase 0 → BASELINE-UX4-001 → Phase 1 → BASELINE-UX4-002
```

Every later wave works from **Baseline + Delta + Evidence**.

## 26. Material change and full re-analysis

Full re-analysis may be triggered ONLY by:

1. Major architecture strategy change
2. Database/schema restructuring
3. New consequential domain
4. Major authentication/tenant model change
5. Large-scale migration invalidating dependency evidence
6. Baseline corruption or evidence-integrity failure
7. Explicit Governance decision

A material change to RLS, auth, tenant, finance, repositories, sync, idempotency, audit, PDP, DB migrations, or edge functions moves the affected domain to `REVIEW REQUIRED`. Passing tests is not sufficient to keep certification.

## 27. Domain certification and unfreeze

Certification is per domain, against a **Domain Certification Profile** — uniform in principle, domain-specific in requirements (Finance requires Financial Integrity and Idempotency as REQUIRED; Reporting may mark Idempotency N/A but requires Data Correctness and Audit for exports).

Each domain record carries: Certified At, Baseline, Certified Commit, Dependencies, Material Changes, Re-certification Trigger. Certifying a domain triggers its **Domain Unfreeze Gate**.

## 28. Exception governance

Any deviation from a rule is registered in `EXCEPTION_REGISTER.md` with an owner and an expiry. An unregistered deviation is a defect.

## 29. Backlog model

Three backlogs — Risk (P0/P1), Product, Commercial — merged into one sprint plan under the risk budget (§7).

## 30. Execution protocol (A–J)

```text
A Read scope        F Verify (typecheck/build/lint/tests/fitness/audits)
B Plan + present    G Record evidence
C Await review      H Update Progress Log
D Execute in scope  I Update Scoreboard
E Stop on drift     J Gate Proposal (never self-certify)
```

Class D work stops at C for human review before execution.

## 31. Scope control

One scope → one intent → one evidence set → one decision. A change unit never bundles a second intent, however small. Unrelated fixes discovered mid-batch are registered, not fixed.

## 32. Stop conditions

Stop and report on: unexpected architectural change, unexpected business-behavior change, a Class D change surfacing inside a lower-class batch, a target unreachable within the frozen scope, or evidence that contradicts the batch's premise.

## 33. Stop report

Use `STOP_REPORT_TEMPLATE.md`. A stop is a valid, expected outcome — not a failure.

## 34. Progress log

`PROGRESS_LOG.md` is append-only. Every wave records Status, Verification, Certification, Evidence, and Decisions.

## 35. Scoreboard

`SCOREBOARD.md` per baseline: Product Completion, Architecture Health, P0 Risk Closure, Certified Domains (n/7), Commercial Readiness.

## 36. Per-batch response format

Every batch closes with: Scope · What changed · Evidence (fresh, commit-stamped) · Before/After · Deviations · Stop conditions hit · Gate Proposal.

## 37. Absolute priority ordering

```text
Correctness → Tenant isolation → Authorization → Financial integrity →
Auditability → Reliability → Performance → Developer convenience
```
