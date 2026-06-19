# ADR-0005 — Integration Spike Protocol (UX-1E)

- **Status:** Accepted
- **Date:** 2026-06-19
- **UX Phase:** UX-1E
- **Supersedes:** —

## Context

UX-1D froze the composition contracts (`CompositeEvent`, `DataGridContract`,
`FormContract`, `OverlaySpec`) and the 10 canonical composites. Before
re-architecting the data layer (UX-2), we must validate that the composites
can absorb realistic ERP-shaped inputs **without** changing their public API
and **without** smuggling data-layer concerns into the UI tree.

UX-1E is therefore an **Architecture Quality Gate**, not a feature phase.
Its output (snapshots, hashes, event recordings, performance matrix, coverage
matrix, regression lock, readiness score, success-criteria evaluation) is a
formal entry gate for UX-2.

## Decision

Adopt nine invariants (E1–E9) and a fixed deliverable set. The full plan
lives in `.lovable/plan.md` (UX-1E v3) and is mirrored by the artifacts under
`docs/architecture/ux1e-evidence/`.

### Invariants

| ID | Invariant | Enforced by |
|----|-----------|-------------|
| E1 | Mock domain has zero real-data-layer deps | `check-integration-scope` + adapter boundary tests |
| E2 | Composites/contracts unchanged during spike | git diff + UX-1D fitness suite |
| E3 | Spike never leaks to public surface | `check-integration-scope` |
| E4 | Harness is dev-only (route registered behind `import.meta.env.DEV`) | `check-integration-scope` |
| E5 | Mock data deterministic (no `Date.now` / `Math.random` / `crypto.randomUUID` under `mocks/**`) | `check-integration-scope` |
| E6 | Manifest schema + fingerprint locked (`manifestSchema: 1`, `fingerprint: "ux1e-v3"`) | `check-integration-scope` |
| E7 | Recorded events are immutable (`Object.freeze` + `structuredClone`) | Vitest assertions |
| E8 | Contract drift hash-detected (`*.contract.sha256` per composite) | `snapshot-contracts.mjs` + committed hashes |
| E9 | Regression lock — only gaps listed in `known-findings.json` are accepted; new findings fail CI | `check-regression-lock` |

### Scope

Allowed paths:
- `src/ui/__integration__/**`
- `scripts/fitness/check-integration-scope.mjs`
- `scripts/fitness/check-adapter-coverage.mjs`
- `scripts/fitness/check-regression-lock.mjs`
- `scripts/audits/snapshot-contracts.mjs`
- `scripts/audits/build-evidence-index.mjs`
- `scripts/audits/score-ux2-readiness.mjs`
- `docs/architecture/UX1E_INTEGRATION_READINESS.md`
- `docs/architecture/ux1e-evidence/**`
- `docs/risk-log/RISK-006-composite-integration-gaps.md`

Forbidden paths (zero diff):
- `src/ui/{tokens,layout,primitives,composites,contracts}/**`
- `src/ui/index.ts`
- `src/lib/{repositories,queries}/**`
- `src/integrations/supabase/**`
- `src/components/ui/**`

## Consequences

- Discovery cost for integration gaps is paid **before** UX-2 wiring.
- Any composite refactor must be done after closing UX-1E with a new ADR.
- A green UX-1E (`UX-2 READY` or `READY WITH RISKS`) is the formal entry
  precondition for UX-2.

## References

- ADR-0004 — Composition Contracts v1
- `docs/architecture/UX1E_INTEGRATION_READINESS.md`
- RISK-006 — Composite integration gaps
