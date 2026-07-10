# AUDIT-WAVE2 — Design System Consolidation

**Status:** in progress — Wave 2 Closure active.
**Baseline (predecessor):** `BASELINE-UX3A-001` (sealed, 28/28 fitness).
**Baseline (this wave):** `BASELINE-UX3A-002` (pending seal).
**Governing ADRs:** 0027, 0028, 0029, 0030.
**Remediation plan:** [`WAVE2_REMEDIATION_PLAN.md`](../WAVE2_REMEDIATION_PLAN.md).

## Objective

Close Wave 2 by remediating discovery findings, flipping 5 Wave 2 fitness
checks (+ 7 Phase-C checks) from warn → enforcing, and sealing the
`BASELINE-UX3A-002` reference tag.

No new features. No new runtime dependencies. No DB or business-logic
changes.

## 10-phase closure checklist

- [ ] **Phase A — Discovery Backlog.** Categorize the 6 discovery reports
  under `scripts/audits/output/wave2-discovery/` into auto-fix / manual /
  deferred buckets. Documented in `WAVE2_REMEDIATION_PLAN.md §Phase A`.
- [ ] **Phase B — Automation.** Run fix scripts in `--dry-run`, review
  diff reports, then run with `--write`.
  - [ ] `node scripts/fixes/fix-design-tokens.mjs`
  - [ ] `node scripts/fixes/fix-spacing.mjs`
  - [ ] `node scripts/fixes/fix-typography.mjs`
  - [ ] `node scripts/fixes/fix-import-order.mjs`
- [ ] **Phase C — Quality Gates.** 7 new PENDING checks in warn mode;
  enforce at close.
- [ ] **Phase D — UI Architecture Audit.**
  `node scripts/audits/ui-architecture-health.mjs`
- [ ] **Phase E — Token Coverage.**
  `node scripts/audits/token-coverage.mjs` — each axis ≥ 95%.
- [ ] **Phase F — Primitive Contract Report.** Emit
  `primitive-contract.json`; fixes scheduled in Wave 2.5.
- [ ] **Phase G — Accessibility Audit.**
  `node scripts/audits/accessibility-audit.mjs`
- [ ] **Phase H — Performance Audit.**
  `node scripts/audits/performance-audit.mjs`
- [ ] **Phase I — Authoring Documentation.** Publish 6 guides under
  `docs/architecture/authoring/`.
- [ ] **Phase J — Baseline Lock.** Flip checks to enforcing, refresh
  `MANIFEST.json` and `PROJECT_MAP.md`, seal `BASELINE-UX3A-002`.

## Fitness delta

| Check | Wave 2 open | Wave 2 close |
|---|---|---|
| check-no-raw-colors | warn | enforcing |
| check-typography-tokens | warn | enforcing |
| check-spacing-elevation | warn | enforcing |
| check-design-system-inventory | warn | enforcing |
| check-no-new-ui-kit-imports | warn | enforcing |
| check-component-loc-budget | — | warn |
| check-component-props-budget | — | warn |
| check-jsx-nesting-depth | — | warn |
| check-no-inline-styles | — | warn |
| check-icon-source | — | warn |
| check-css-modules-scope | — | warn |
| check-no-any-in-ui | — | warn |

## Seal criteria

Baseline `BASELINE-UX3A-002` flips from `pending` → `Locked` when:

- All 5 Wave 2 checks are enforcing green.
- Zero UI-layer cycles (`ui-dep-graph.json.cycleCount === 0`).
- Zero cross-layer import violations.
- All Vitest suites green.
- `bun run build` succeeds.
- Scorecard within targets (`scorecard-ux3a-wave2.json`).
- ADRs 0027, 0028, 0030 remain Accepted.
- Architecture fingerprint regenerated and pinned.
