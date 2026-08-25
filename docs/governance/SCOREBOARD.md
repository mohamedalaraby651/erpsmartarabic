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
