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

| 2026-08-27 | WAVE1-PHASEC2-001 | pages→repositories 11 (≤13) | violations 155 (≤155) | UI cycles 0 | fitness failures 0 | FanOut no regression | NOT CERTIFIED |

## BASELINE-NAZRA-002 — sealed 2026-08-28

| Signal | NAZRA-001 | NAZRA-002 | Target | Status |
|---|---:|---:|---|---|
| `pages → repositories` | 27 | 11 | ≤ 13 | ✅ |
| Layer violations (total) | 171 | 155 | ≤ 155 | ✅ |
| UI cycles | 0 | 0 | 0 | ✅ |
| Total cycles | 6 | 6 | no regression | ✅ |
| Fitness failures | 0 | 0 | 0 | ✅ |
| Typecheck / Build | 0 / 0 | 0 / 0 | 0 / 0 | ✅ |
| Vitest | 1581 pass / 3 failed files | 1581 pass / 3 failed files | — | ⚠️ PRE-PDF-001 OPEN |
| Certification | — | NOT CERTIFIED | — | ⛔ |

Composite: `1b4fafd5d784c0b28daa3fb25653368adc11745b38e5523852b563d4e24cdf87`

## G0 — Evidence Integrity Gate (2026-08-28)

| Check group | Result |
|---|---|
| Lineage (revision · baseline · parent) | ✅ consistent |
| Evidence freshness | ✅ regenerated at G0 time |
| Hash integrity (28 entries + composite) | ✅ verified |
| Dependency lock · build hash | ✅ recorded |
| Test · fitness · architecture snapshots | ✅ reproduce the sealed baseline exactly |
| ADR state (18 Accepted) | ✅ |
| Open findings visibility (PRE-PDF-001 · PRE-TS-001 #5 · RISK-007) | ✅ visible, unresolved |
| Unauthorized changes | ✅ none (25/25 scope · item-level MATCH) |
| **Decision** | **G0 PASS** — NOT CERTIFIED · Phase 0 NOT authorized |

## Phase 0 — Boundary Model (2026-08-29)

| Item | Result |
|---|---|
| Boundaries documented | 8 / 8 |
| Fields per boundary | 16 / 16 |
| Boundaries certified | **0 / 8** (🟢 0 · 🟡 6 · 🔴 2 partial-scope) |
| ADR-0031 · ADR-0044 | ✅ Accepted |
| Invariant → Fitness → Test → CI mapping | ✅ declared (implementation deferred) |
| Ownership · Authority · Failure · Recovery · Exit criteria | ✅ all 8 |
| PRE-TS-001 root-cause ownership | ✅ recorded — status OPEN (recurrence #6 observed, not repaired) |
| Unauthorized business-code changes | ✅ none (`docs/**` only) |
| Evidence lineage | ✅ `a33f49b9` → `31052763` → `1bf0b5f1` → `061c9646` |
| Typecheck | ⛔ exit 2 — PRE-TS-001 #6, left open by design |
| Exit gate | **12 / 12 satisfied** · Certification NOT granted |

## Post-Exit Control Resolution — `PXC-NAZRA-001` (2026-08-30)

| Control | Entry | Exit |
|---|---|---|
| 1 · PRE-TS-001 ownership | 🔴 recurrence #6, root cause unresolved | 🟢 RESOLVED — Option A′, typecheck 0 diagnostics |
| 2 · RISK-007 security | 🔴 6 undifferentiated findings | 🟡 CLASSIFIED / PLANNED — 3 units, still OPEN |
| 3 · PRE-PDF-001 | 🟡 3 failing test files | 🟢 CLOSED — cause documented, remediated |
| 4 · Lint errors | 🔴 39, no owners | 🟡 CLASSIFIED — 37 across 5 owner classes |

| Metric | Phase 0 exit | Now |
|---|---:|---:|
| Typecheck diagnostics | 2 | **0** |
| Vitest | 1581 pass · 3 failed files | **1592 pass · 0 failed** |
| ESLint errors / warnings | 39 / 865 | **37 / 865** |
| Fitness (active · pending · failures) | 32 · 9 · 0 | 32 · 9 · 0 |
| Layer violations · pages→repositories · UI cycles | 155 · 11 · 0 | 155 · 11 · 0 |
| Boundaries certified | 0 / 8 | **0 / 8** |

**Decision:** controls resolved/classified · Certification NOT granted · `BASELINE-UX4-001` DRAFT · Phase 1 NOT authorized.

## G0 Evidence Refresh — `G0R-NAZRA-002` (2026-08-29)

| Check | Result |
|---|---|
| Typecheck contract (project-owned) | 🟢 PASS — 0 diagnostics |
| Raw tsgo | 🟢 exit 0 after preflight (PRE-TS-001 recurrence #7 contained) |
| Build | 🟢 exit 0 |
| Tests | 🟢 1592 passed · 0 failed · 5 skipped |
| Fitness | 🟢 active 32 · pending 9 · failures 0 |
| Dependency graph | 🟢 1210 modules · 6 cycles · **0 UI cycles** · 155 violations · pages→repositories 11 |
| Inventory | 🟢 modules 174 · files 1210 |
| Baseline integrity | 🟢 NAZRA-002 ok (28 entries) |
| Item-level scope | 🟢 MATCH |
| Lock hashes | 🟢 unchanged vs G0-NAZRA-001 |
| Lint | 🟡 37 errors / 865 warnings (classified) |
| RISK-007 | 🟠 OPEN / PLANNED — Phase 1 impact TBD at review |
| RISK-008 | 🟠 OPEN — Governance / Tooling Boundary Risk — Phase 1 impact TBD at review |
| Boundaries certified | 🔴 0 / 8 |
| Phase 1 | ⛔ NOT AUTHORIZED |

**Decision:** G0 Evidence Refresh **PASS (evidence integrity only)** — ≠ Architecture PASS ≠ Security PASS ≠ Production Ready.

## Enterprise boundaries — certification state

| Boundary | State | Evidence |
|---|---|---|
| BND-05 Tenant → Data | 🟢 **CERTIFIED (1/8)** | `CERT_REV_BND05_R2.md`, `cert-rev-bnd05-r2.json`, `REM_BND05_001.md` |
| BND-01 … BND-04, BND-06 … BND-08 | 🔴 NOT CERTIFIED / NOT AUTHORIZED | — |

**Boundaries certified: 1 / 8.** Certification is scoped to BND-05 only; it is not an architecture,
security, or production-readiness pass. PRE-EXT-001, RISK-007 and RISK-008 remain OPEN.

## F0 — Frontend Platform Baseline (`F0-NAZRA-001`, measurement only)

| Signal | Observed |
|---|---|
| Import-layer violations | 155 → ACTUAL 95 · TRANSITIONAL 44 · FALSE POSITIVE 10 · LEGITIMATE 6 |
| Modules / cycles / UI cycles | 1212 · 6 · 0 |
| Routes / repositories / query services | 100 · 44 · 2 |
| Data-access call sites (total / UI) | 631 · 153 |
| UI uniformity / design-system / ui-kit | 42 · 635 · 2 |
| Inline styles / UI `any` / over-LOC | 48 · 14 · 2 |
| Accessibility findings / RTL fitness | 222 · PASS (0 violations) |
| Bundle / assets / lazy routes | 4,920,767 B · 91 · 89 of 99 |
| LCP · INP · CLS · query latency | NOT MEASURED (no RUM harness in repo) |
| Typecheck / fitness / tests | 0 · failures 0 (33 active, 9 pending) · 1619 passed |
| F1 scope | DRAFT — hash **not** frozen, F1 **not** authorized |

## F1 — Frontend Application Layer Remediation (`F1-NAZRA-001`, Track A, verified)

| Signal | Value |
|---|---|
| Frozen scope | `F1_SCOPE_001-R2`, hash `e8ec2359…7c7fe8` |
| Authorized items | 37 (F1-A 4 pages → repositories, F1-B 33 components → repositories) |
| Edges eliminated | 37 / 37 |
| Facades created / reused | 15 new + 8 reused = 23 pure ADR-0028 re-exports |
| New repositories / query services | 0 |
| F1-approved residuals | 0 / 37 |
| Total violations | 155 → **118** (−37, exact edge attribution) |
| `pages → repositories` | 11 → **7** |
| `components → repositories` | 41 → **8** |
| `pages → supabase-client` | 29 (unchanged) |
| `components → supabase-client` | 38 (unchanged) |
| `hooks → supabase-client` | 31 (unchanged) |
| Total cycles / UI cycles | 6 / **0** (unchanged) |
| Typecheck / build | 0 / 0 |
| Fitness | 33 active · 9 pending · **0 failures** |
| Vitest | 1619 passed · 5 skipped |
| F2 contamination | None |
| Protected areas touched | None (BND-05 / RLS / finance / domain / migrations untouched) |
| Out-of-scope residuals accepted | 15 (11 `_base/mapRepoError` + 4 type-only imports) |
| PRE-TS-001 | CONTAINED — recurrence #11 recorded, not remediated |
| RISK-007 / RISK-008 / PRE-EXT-001 | OPEN |
| Machine verdict (F1-C) | **PASS** |
| Human governance gate | **PASS — ACCEPTED, NOT CERTIFIED** |
| Certification | **NOT GRANTED** |
| Next authorized gate | None until new frozen scope + human authorization |
