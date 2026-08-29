# ADR-0044 — Modular Monolith, with Measurable Service-Extraction Conditions

- **Status:** Accepted
- **Date:** 2026-08-29
- **Area:** System topology
- **UX Phase:** Phase 0 (post-`G0-NAZRA-001`)
- **Supersedes:** —

## Context

Nazra is a multi-tenant Arabic ERP whose consequential logic (ledger posting, payments,
stock movement, tenant isolation) is PostgreSQL-native and transactionally coupled. The
enterprise gap analysis raised distribution as an option. The measured reality at
`BASELINE-NAZRA-002` is that intra-process boundaries are not yet enforced: 155 layer
violations, 98 direct DB accesses from UI, 0 of 8 boundaries certified.

Distributing unenforced boundaries converts compile-time coupling into network coupling and
converts ACID transactions into distributed-transaction problems. That is a strict
regression.

## Problem

Fix the system topology, and define — measurably — the only conditions under which a module
may be extracted out of the monolith.

## Options Considered

1. **Microservices now.** Independent scaling and deploys. Requires distributed
   transactions across ledger/payment/stock, cross-service tenant propagation, and an
   operations capability the team does not have. Rejected.
2. **Modular monolith (chosen).** One deployable, one database, hard internal boundaries
   enforced per ADR-0031. Extraction stays possible but must be earned.
3. **Ad-hoc extraction when convenient.** Rejected: produces a distributed monolith, the
   worst of both.

## Decision

**Nazra is a Modular Monolith.** One deployable frontend, one Supabase/PostgreSQL backend,
edge functions as in-boundary compute — not as services. Modules are separated by the
boundary contracts in `BOUNDARY_CATALOG.md`, not by process or network.

Extraction of any module into an independently deployed service is **prohibited** unless
**all four Preconditions** and **at least two Triggers** are demonstrated with evidence, and
an extraction ADR superseding this one is accepted.

### Preconditions (all four mandatory)

| # | Precondition | Measurement |
|---|---|---|
| P1 | The module's boundary is 🟢 in `BOUNDARY_CATALOG.md` | all four chain links + fresh CI evidence |
| P2 | Zero cross-boundary DB coupling | no shared table written by another module; joins across the boundary = 0 |
| P3 | Module owns its transactional consistency | no write path requires a cross-module ACID transaction |
| P4 | Single accountable owning team | one owner, on-call capable |

### Triggers (at least two required)

| # | Trigger | Measurable threshold |
|---|---|---|
| T1 | Isolation requirement | a contractual/regulatory requirement mandates separate data residency or separate blast radius for that module |
| T2 | Scaling divergence | the module's resource profile diverges from the monolith by ≥ 10× sustained, and vertical scaling is exhausted |
| T3 | Deployment contention | module release cadence is blocked by unrelated changes measurably (≥ 30% of its releases delayed over 2 quarters) |
| T4 | Operational ownership divergence | a separate team owns its SLA/on-call with a distinct error budget |
| T5 | Failure-domain independence | module downtime must not degrade the rest of the system, proven as a required behaviour, not a preference |

### Explicitly rejected justifications

Team preference · technology fashion · "prepare for scale" · resume-driven design ·
hypothetical future load · code-size discomfort.

### Rule

> Extraction is a **consequence** of an enforced boundary, never a substitute for one.

Until the conditions are met, the correct response to coupling pain is to strengthen the
boundary in-process (ports, façades, fitness checks), not to distribute it.

## Consequences

- Positive: one transaction boundary; RLS remains the single tenancy authority; no
  distributed-transaction complexity; boundary work compounds toward extraction readiness.
- Negative / accepted: single deploy unit; no independent per-module scaling; a large
  repository requiring disciplined internal boundaries.
- Affected: all boundaries in `BOUNDARY_CATALOG.md`, deployment topology, all future
  capacity planning.

## Rollback Plan

Reversal means accepting an extraction: it requires a new ADR that cites the evidence for
P1–P4 and the two triggers, names the strangler sequence, and defines the data-ownership
split. Extraction without that ADR is a contract violation, not a technical decision.

## References

- `docs/architecture/BOUNDARY_CATALOG.md`
- ADR-0031 (Enterprise Boundary Contract)
- `docs/architecture/baseline/BASELINE-NAZRA-002.md`
