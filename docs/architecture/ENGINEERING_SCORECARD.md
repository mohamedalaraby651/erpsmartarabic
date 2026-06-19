# Engineering Scorecard

**Status:** Active (UX-1, Wave 0)
**Runner:** `scripts/audits/scorecard.mjs`

## Purpose

Aggregate audit + fitness signals into one number per wave. Used as the **wave pass/fail gate** (≥ 90) and a long-term health trend.

## Weights

| Section | Weight | Inputs |
|---|---:|---|
| Architecture | 30 | `import-layer-violations`, `check-layering`, `check-workspace-api`, `check-direct-db`, circular deps |
| UX | 20 | UX Regression Checklist signed sections / total sections |
| Performance | 15 | `bundle-report` delta, render budget compliance |
| Accessibility | 10 | axe/Lighthouse score on certified routes |
| Test Stability | 15 | Vitest pass count vs baseline (≥ 1187), flake count |
| Maintainability | 10 | `complexity-report` MI average, `check-canonical-components`, `check-token-usage` |

Total: **100**

## Computation

```
sectionScore = (passedChecks / totalChecks) * weight
totalScore   = Σ sectionScore
```

Each section also publishes raw counters in `scripts/audits/output/scorecard.json` for trend tracking.

## Thresholds

| Total | Result |
|---|---|
| ≥ 92 | Wave passes (Completion Gate target) |
| 90–91 | Wave passes if no fitness function fails (minimum bar) |
| < 90 | Wave does NOT pass |

A single fitness function FAIL caps Architecture at 0 for that run — total can never reach 90.

## Output

- `scripts/audits/output/scorecard.json` — machine-readable record (deterministic).
- `docs/architecture/baseline/scorecard-<wave>.md` — human-readable summary, committed per wave.

## Trend

After UX-1E, append a row per wave to `docs/architecture/SCORECARD_TREND.md`:

```
| Wave | Date | Architecture | UX | Perf | A11y | Test | Maint | Total |
```
