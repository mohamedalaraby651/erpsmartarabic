# Scoreboard

One row per baseline. Values are observations recorded from evidence, not judgments.

| Baseline | Product Completion | Architecture Health | P0 Risk Closure | Certified Domains | Commercial Readiness |
|---|---|---|---|---|---|
| BASELINE-NAZRA-001 (proposed) | not measured | 8.2 / 10 (UI_HEALTH_REPORT, prior wave) | 0 / n (risk register not yet opened) | 0 / 7 | not measured |

## Definitions

- **Product Completion** — share of the agreed product scope shipped and verified. Not measured until the Product Track opens.
- **Architecture Health** — composite score from `UI_HEALTH_REPORT.md` (violations, cycles, fan-out, public surface).
- **P0 Risk Closure** — P0 risks closed / P0 risks open. The risk register opens in Phase 0.
- **Certified Domains** — domains that passed a Domain Certification Profile with human approval. Seven candidate domains: Finance, Sales, Purchasing, Inventory, Accounting, HR, Platform/Admin.
- **Commercial Readiness** — pricing, packaging, onboarding, demo, docs, pilot readiness.

## Rules

- A value is entered only when a commit-stamped evidence artifact backs it.
- "not measured" is a valid, honest value. An estimated number is not.
- Certified Domains only ever increases through a human-approved Gate Proposal, and decreases automatically on a material change (Contract §26).

## Observed inventory snapshot — BASELINE-NAZRA-001

Source: `CODEBASE-INVENTORY-001` / `SNAPSHOT-20260825-001` (commit `2ef870b`). Observation only.

| Signal | Observed |
|---|---|
| Source files (src) | 1202 |
| Modules | 174 |
| Dependency edges | 4771 |
| Routes | 98 |
| Repositories | 44 |
| Critical layer violations (total) | 171 |
| `pages → repositories` | 27 |
| `components → repositories` | 41 |
| `components → supabase-client` | 38 |
| `hooks → supabase-client` | 31 |
| `pages → supabase-client` | 29 |
| Cycles (all layers) | 6 |
| UI cycles | 0 |
| Max fan-out (non-root) | 59 (`pages/customers/CustomerDetailsPage.tsx`) |
| Public surfaces over observed budget | 0 / 9 |
| Edge functions (repository-observed) | 15 |
| RPCs referenced in code | 47 |
| Tables/views referenced in code | 97 |

## Canonical counts — Wave 1 Phase A (fitness pipeline, commit 3b7b6c3)

Sourced from `dep-graph.mjs` + `run-all.mjs`, not from the inventory observer.

| Signal | Canonical | Batch B target | Projected after Phase C |
|---|---|---|---|
| Fitness failures | 0 | 0 | 0 |
| Critical layer violations (total) | 171 | ≤ 155 | 155 |
| `pages → repositories` | 27 | ≤ 13 | 11 |
| Cycles (all / UI) | 6 / 0 | 0 UI | 6 / 0 |
| Vite build | PASS | PASS | PASS |
