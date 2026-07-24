# Sprint 3.1 · Batch A — Before / After Comparison

Generated: 2026-07-22

## Layer Violations (from `scripts/audits/output/dependency-report.json`)

| Rule | Before | After | Δ |
|---|---:|---:|---:|
| components→repositories | 69 | 41 | **-28** |
| components→services | 5 | 5 | 0 |
| pages→repositories | 31 | 27 | **-4** |
| hooks→supabase-client | 31 | 31 | 0 |
| components→supabase-client | 38 | 38 | 0 |
| pages→supabase-client | 29 | 29 | 0 |
| domain→ui | 0 | 0 | 0 |
| **TOTAL** | **203** | **171** | **-32** |

**Critical burn: -32 (15.8% ≥ 15% target ✅)**

## Architectural Debt Classification

| Class | Before | After | Δ |
|---|---:|---:|---:|
| StructuralDebt (broken layer boundaries) | 0 | 0 | 0 |
| DependencyDebt (deep-layer direct imports) | 203 | 171 | **-32** |
| OwnershipDebt (wrong folder) | 0 | 0 | 0 |
| TemporaryDebt (workarounds) | 0 | 0 | 0 |

All 32 remediated violations were pure DependencyDebt (import-graph reshaping). No structural/ownership debt touched — deferred to Sprint 3.2+.

## Debt Burn-down Scorecard (NEW)

| Metric | Value |
|---|---:|
| Baseline Critical | 203 |
| Post-BatchA Critical | 171 |
| Burn (absolute) | 32 |
| **Burn Rate** | **15.76%** |
| Cumulative Wave 2 Burn | 32 (Batch A is first burn round) |

## Graph Metrics

| Metric | Before | After | Δ |
|---|---:|---:|---:|
| Total Modules | 1201 | 1201 | 0 |
| Cycles (all) | 6 | 6 | 0 |
| UI Cycles | 0 | 0 | 0 |
| Max FanOut | 59 | 59 | 0 (no regression) |
| Max FanIn | 93 | 93 | 0 |
| `src/ui/index.ts` exports | 52 | 52 | 0 |
| Architecture Score | 8.0 | **8.2** | +0.2 |

Score bump rationale: DependencyDebt reduced by 15.76% with zero regression on other axes.

## Verification Gates

| Gate | Result |
|---|:---:|
| `tsgo --noEmit` | ✅ green |
| UI cycles unchanged (0) | ✅ |
| Total cycles unchanged (6) | ✅ |
| FanOut no regression | ✅ |
| Public surface (`src/ui`) unchanged | ✅ |
| No `src/hooks/**` new files | ✅ |
| No touched: kernel/platform/domain/infrastructure | ✅ |

## Success Criteria Roll-up

- ✅ Zero Regression
- ✅ UI Cycles = 0 preserved
- ✅ FanOut no rise
- ✅ Critical ↓ ≥ 15% (achieved 15.76%)
- ✅ Architecture Score > 8.0 (8.2)
- ✅ Debt Burn Rate documented per class
- ✅ No new Enforcing Fitness (only Report-only budget)
- ✅ All Ledger deferrals carry Owner Wave/ADR/Priority/Reason/Target
- ✅ Graph Diff produced (`WAVE2_SPRINT3_BATCHA_GRAPH_DIFF.md`)
- ✅ Fingerprint re-sealed
- ✅ Facades registered in `UI_API_V1.md` as `Pending Standardization`
