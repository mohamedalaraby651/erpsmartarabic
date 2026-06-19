# UX-1E — Integration Readiness Report

**Phase:** UX-1E (Integration Spike → Architecture Quality Gate)
**Manifest:** `ux1e-v3` (schema 1)
**ADR:** [ADR-0005](../adr/0005-integration-spike-protocol.md)
**Verdict:** **UX-2 READY**
**Overall score:** **97.4 / 100**

> Machine-readable mirrors of this report live under
> `docs/architecture/ux1e-evidence/`. The CI source of truth for status is
> `ux2-readiness.json`; this document is the human-readable summary.

---

## 1. Executive Summary

UX-1E exercised the 10 canonical composites against a deterministic mock
domain layer covering 8 scenarios (`happy`, `empty`, `error`, `slow`,
`large`, `duplicateIds`, `nullFields`, `unicode`). Every composite met its
documented success criterion without any change to its public surface, and
every recorded event satisfied the `CompositeEvent` envelope **and** the
immutability invariant (E7).

- Contracts/composites unchanged — git diff = ∅ inside the frozen surface.
- All 18 fitness checks (UX-1A → UX-1E) green.
- 21 Vitest cases green across adapter, scenario, edge, and coverage tests.
- 2 minor findings logged in `known-findings.json` and deferred to UX-1F / UX-2.

---

## 2. Architecture Validation (E1 – E9)

| ID | Invariant | Status |
|----|-----------|--------|
| E1 | Mock domain has zero real-data-layer deps | PASS |
| E2 | Composites/contracts unchanged | PASS |
| E3 | Spike never leaks to public surface | PASS |
| E4 | Harness is dev-only (gated by `import.meta.env.DEV`) | PASS |
| E5 | Mock data deterministic | PASS |
| E6 | Manifest schema + fingerprint locked | PASS |
| E7 | Recorded events immutable | PASS |
| E8 | Contract drift hash-detected | PASS |
| E9 | Regression lock enforced | PASS |

---

## 3. Scenario Matrix

| Scenario | Complexity | Rows | RTL | Nullable | Duplicate Keys | Outcome |
|---|---|---|---|---|---|---|
| happy | normal | 200 | no | no | no | render OK |
| empty | empty | 0 | no | no | no | EmptyState OK |
| error | error | 0 | no | no | no | ErrorState OK |
| slow | slow | 200 | no | no | no | LoadingState → render OK |
| large | large | 5000 | no | no | no | render OK |
| duplicateIds | edge | 10 | no | no | yes | DataGrid stable with composite `getRowId` |
| nullFields | edge | 10 | no | yes | no | no crashes |
| unicode | edge | 3 | yes | yes | no | RTL + mixed scripts render |

---

## 4. Per-Composite Success Criteria

Single source of truth: `ux1e-evidence/success-criteria.json` (10/10 met).

| Composite | Success Definition | Met |
|---|---|---|
| DataGrid | No contract change; every event conforms to `CompositeEvent`; renders 5000 rows; sort/selection/density UI-state only. | ✓ |
| Form | Supports happy/error/slow with no prop changes; lifecycle phase emitted; never references a data layer. | ✓ |
| FormDialog | Emits `OverlaySpec` only; owns zero overlay runtime state. | ✓ |
| PageHeader | Consumes derived aggregates as plain props; no data-source coupling; RTL OK. | ✓ |
| StatGrid | Pure presentation of primitive aggregates. | ✓ |
| DescriptionList | Pure presentation; no domain coupling. | ✓ |
| EmptyState | Renders under empty scenario without prop drift. | ✓ |
| ErrorState | Renders under error scenario without prop drift. | ✓ |
| LoadingState | Renders under slow scenario; uses `aria-busy`. | ✓ |
| Pagination | Pure UI controller; emits `grid.page.change`; no server-paging knowledge. | ✓ |

---

## 5. Composite Matrix (engagement summary)

| Composite | Adapter-driven | Event-emitting | Coverage entry |
|---|---|---|---|
| DataGrid | `useMockList` | yes | `happy`, `error` (+ edge scenarios in tests) |
| Form | `useMockForm` | yes | `happy`, `error` |
| FormDialog | `useMockOverlay` | yes (via OverlaySpec) | `happy` |
| PageHeader | aggregates | no | `happy` |
| StatGrid | aggregates | no | `happy` |
| DescriptionList | aggregates | no | `happy` |
| EmptyState | scenario | no | `happy` |
| ErrorState | scenario | no | `happy` |
| LoadingState | scenario | no | `happy` |
| Pagination | `useMockList` | yes | `happy` |

---

## 6. Performance Matrix

Probes (`firstRender`, `sort`, `selectionToggle`, `dialogOpen`) are captured
per scenario from the harness. Each export embeds environment metadata
(`node`, `userAgent`, `seed`) so values remain comparable over time. Values
collected interactively are exported to `ux1e-evidence/perf.*.json` (these
artifacts are produced on-demand from the dev harness; the harness button
"Export perf" writes one file per scenario).

| Scenario | First render budget | Notes |
|---|---|---|
| happy / empty / error / slow / unicode / duplicateIds / nullFields | < 50 ms | well under spike budget |
| large (5000 rows, non-virtualized) | tracked under RISK-006-01 | flagged minor — virtualization deferred to UX-1F |

---

## 7. Event Matrix

- 11 event types are permitted (5 grid + 4 form + 2 overlay).
- All recorded events pass shallow-payload validation in
  `scenarios.test.tsx`.
- All recorded events are frozen (`Object.isFrozen` true) and deep-cloned
  at record time — proved by a mutation-after-record test (E7).

---

## 8. State Isolation

- Adapters expose only contract-shaped state (no domain objects leak into
  composite props).
- Composites store no module-level mutable state; selection / sort /
  density are controlled by callers (verified by the snapshot diff being
  byte-identical to the UX-1D-frozen surface).

---

## 9. Contract Findings (snapshots + hashes)

Snapshots live under `ux1e-evidence/snapshots/`. Each composite ships a
paired `.contract.sha256` for fast CI drift detection.

| Composite | sha256 |
|---|---|
| DataGrid | `99b6b02e…73b2` |
| Form | `b65d3c27…e15d` |
| FormDialog | `9eacb932…d45e` |
| PageHeader | `81f03507…8932` |
| StatGrid | `597166b4…b853` |
| DescriptionList | `3d1817c9…bcfa` |
| EmptyState | `dfc4472d…d3e6` |
| ErrorState | `4b214d89…ce0c` |
| LoadingState | `c73adba8…461b` |
| Pagination | `a197c3b5…830e` |

Diff = ∅ against the UX-1D-frozen surface.

---

## 10. Adapter Coverage Matrix

Source: `ux1e-evidence/adapter-coverage.json` — generated by
`scripts/audits/build-adapter-coverage.mjs` and enforced by
`scripts/fitness/check-adapter-coverage.mjs`. Every composite declared in
the manifest is covered by at least one scenario.

---

## 11. Risk Classification

| Sub-ID | Severity | Composite | Summary | Deferred to |
|---|---|---|---|---|
| RISK-006-01 | minor | DataGrid | No virtualization at 5000 rows | UX-1F |
| RISK-006-02 | minor | Form | FormDirty fires on every keystroke | UX-2 |

The regression-lock fitness ensures any new finding raised during UX-2 is
added here before the build can pass.

---

## 12. UX-2 Readiness Score

Source: `ux1e-evidence/ux2-readiness.json`.

| Category | Score |
|---|---|
| Contract Stability | 99 |
| Adapter Isolation | 100 |
| Event Purity | 100 |
| Overlay Ownership | 100 |
| State Isolation | 93 |
| Performance Confidence | 90 |
| Success Criteria Coverage | 100 |
| **Overall** | **97.4** |
| **Verdict** | **UX-2 READY** |

---

## 13. UX-2 Entry Checklist

- [x] All UX-1A → UX-1E fitness checks green (18/18).
- [x] All composite snapshots + hashes committed.
- [x] Adapter coverage matrix covers every composite in manifest.
- [x] `known-findings.json` lists all accepted gaps; no `blocker`.
- [x] `success-criteria.json` shows 10/10 composites met.
- [x] `ux2-readiness.json` verdict ∈ {`UX-2 READY`, `READY WITH RISKS`}.
- [x] RISK-006 opened with structured sub-IDs.
- [x] ADR-0005 + ADR INDEX updated.

UX-2 may begin once a reviewer confirms the artifacts above. The UX-2
re-architecture must not weaken any invariant E1–E9 of the spike: real
adapters in UX-2 SHALL conform to the same contract surface that the
mock adapters proved consumable here.

---

## 14. Appendix

- Evidence index: `ux1e-evidence/index.json`
- Manifest: `src/ui/__integration__/integration.manifest.ts`
- Harness route (dev only): `/__integration__/ux1e`
- ADR-0005: `docs/adr/0005-integration-spike-protocol.md`
- RISK-006: `docs/risk-log/RISK-006-composite-integration-gaps.md`
