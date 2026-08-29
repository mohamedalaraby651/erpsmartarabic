# ADR-0031 — Enterprise Boundary Contract as an Operating Standard

- **Status:** Accepted
- **Date:** 2026-08-29
- **Area:** Cross-cutting architecture governance
- **UX Phase:** Phase 0 (post-`G0-NAZRA-001`)
- **Supersedes:** —

## Context

`BASELINE-NAZRA-002` measured 155 layer violations and 6 cycles. Batch B proved that
remediation works, but also proved the failure mode: boundaries that live only in prose
decay silently between waves. `DEPENDENCY_RULES.md` covers frontend layering only, and
says nothing about tenancy, permission, offline, or event boundaries.

Meanwhile `PRE-TS-001` recurred five times because no one owned an artifact. That is not a
TypeScript problem; it is an unowned-boundary problem.

## Problem

Decide whether a "boundary" in Nazra is a documentation concept or an operating contract
with a fixed, mandatory structure — and what makes a boundary claim admissible as evidence.

## Options Considered

1. **Prose architecture docs (status quo).** Cheap. Decays; unfalsifiable; produced the
   current 155 violations.
2. **Fitness checks only, no catalog.** Mechanical but blind: checks encode what someone
   happened to automate, not what actually must hold. No ownership, no recovery path.
3. **Boundary Contract standard (chosen).** Every boundary is a record with a fixed
   7-part contract and a mandatory enforcement chain; the catalog is the register.

## Decision

Every architectural boundary in Nazra MUST be expressed as a **Boundary Contract**:

```text
Boundary
  ├── Contract    — the only legal crossing surface
  ├── Invariant   — the property that must hold at every crossing
  ├── Authority   — who decides, at runtime, that a crossing is legal
  ├── Scope       — the paths governed
  ├── Evidence    — the artifact proving the invariant holds now
  ├── Failure     — the observable behaviour when it is violated
  └── Recovery    — the defined path back to a valid state
```

Rules (binding):

- **R-BND-1.** A boundary is admissible only when registered in
  `docs/architecture/BOUNDARY_CATALOG.md` with all **16 fields** populated. A missing
  field invalidates the row.
- **R-BND-2.** Every invariant MUST declare the full chain
  `Invariant → Fitness Rule → Automated Test → CI Evidence`.
  Declaring the chain is Phase 0 work; *implementing* the fitness rule belongs to a later
  authorized scope. Undeclared chains are inadmissible.
- **R-BND-3.** RAG grading is mechanical, not editorial:
  🟢 = all four chain links exist and CI evidence is fresh;
  🟡 = rule declared, enforcement incomplete;
  🔴 = documented only.
- **R-BND-4.** `Authority` names exactly one runtime authority. Client-side state is never
  an authority for security, tenancy, permission, or financial decisions.
- **R-BND-5.** Every boundary has exactly one accountable `Owner`. Shared ownership is
  rejected.
- **R-BND-6.** Exit criteria MUST be measurable (a count, a proof, a passing gate). Prose
  such as "improve coverage" is rejected.
- **R-BND-7.** **Documentation is not enforcement.** No boundary may be described as
  "enforced", "certified", or "done" without CI evidence generated on the revision being
  judged. Agents may never self-certify.
- **R-BND-8.** Changing a Boundary ID, invariant, or authority requires a superseding ADR;
  editing the catalog alone is insufficient.

## Consequences

- Positive: boundaries become falsifiable; violations become countable; ownership becomes
  addressable; the Smart Freeze list gains objective release conditions.
- Negative / accepted: the catalog is deliberately unflattering — 0 of 8 boundaries are
  certified at Phase 0, and 🔴 rows are published rather than softened. Every future
  boundary change costs an ADR.
- Affected: `docs/architecture/BOUNDARY_CATALOG.md`, `docs/architecture/DEPENDENCY_RULES.md`
  (now one boundary among eight), all future fitness checks.
- Lifecycle: `DEPENDENCY_RULES.md` remains canonical for BND-01..BND-03 layering detail and
  is referenced, not replaced.

## Rollback Plan

If the standard produces documentation churn without measurable violation reduction across
two consecutive waves, supersede this ADR, demote the catalog to an advisory register, and
retain only the mechanical fitness suite. Trigger signal: no reduction in total layer
violations while catalog edit volume grows.

## References

- `docs/architecture/BOUNDARY_CATALOG.md`
- `docs/architecture/DEPENDENCY_RULES.md`
- `docs/architecture/baseline/BASELINE-NAZRA-002.md`
- `docs/governance/G0_EVIDENCE_INTEGRITY_RECORD.md`
- ADR-0013 (baseline immutability), ADR-0014 (platform charter)
