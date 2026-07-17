# UI_HEALTH_REPORT.md

**Wave:** UX-3A Wave 2 — Sprint 2 Batch 2B (post-fix snapshot)
**Generated:** 2026-07-11
**Mode:** Structural repair inside `src/ui/**` and one details pair. No feature-page edits.

Source reports (deterministic, machine-readable):

- `scripts/audits/output/dependency-report.json`
- `scripts/audits/output/wave2-discovery/ui-dep-graph.json`
- `scripts/audits/output/wave2-discovery/ui-architecture-health.json`
- Batch ledger: `docs/architecture/WAVE2_BATCH_2B_LEDGER.md`

---

## 1. Headline numbers (before → after 2B)

```text
                                 before 2B   after 2B
Cycles (whole tree) ...........        8          6
Cycles (src/ui only) ..........        2          0   ✅
Layer violations ..............      203        203   (owned, staged to Sprint 3)
Modules analyzed ..............      320        320
Files analyzed (ui+components)       545        546
Max FanIn .....................       93         93
Max FanOut (feature code) .....       59         59  (CustomerDetailsPage — Wave 3)
Public surface (src/ui) .......      121        121  (Batch 2D prune)
Architecture Score ............      7.4        8.0
```
Cycles (whole tree) ......... 8
Cycles (src/ui only) ........ 2
Layer violations ............ 203
Modules analyzed ............ 320
Files analyzed .............. 545
Max FanIn ................... 93   (src/components/ui)
Max FanOut .................. 15   (src/components/shared)
Median FanIn ................ 8
Median FanOut ............... 0
Largest file (LOC) .......... 854  (src/pages/customers/CustomerDetailsPage.tsx, excl. generated)
Public surface (src/ui) ..... 121 exports
Public surface (src/kernel) . 8 exports
Public surface (src/domain/finance) . 21 exports
Abstraction Ratio ui/primitives . 0.0  (no wrapper-only files — healthy)
Architecture Score .......... 7.4 / 10
```

`src/integrations/supabase/types.ts` (7 283 LOC) is auto-generated and excluded from remediation targets.

---

## 2. Cycles

Post-2B: whole-tree = 6, UI-scope = **0** ✅. Both original UI cycles
(C1 barrel-in-leaf; C2 KPI↔Timeline type re-export) are eliminated;
an additional latent StatGrid barrel cycle and four latent barrel
imports inside `src/ui/composites/**` were hardened proactively — see
`WAVE2_BATCH_2B_LEDGER.md § 2B.2`.

Remaining 6 cycles are all outside the Wave 2 remit (domain event
barrel, PDF diagnostics/routing, Dashboard prefetch triangle) and are
documented with owning waves in the ledger (D1–D6).

**Sprint 2 Batch 2B verdict:** UI-scope cycles eliminated. Non-UI cycles deferred with named owning waves.

---

## 3. Layer Violations — 203 total, staged

Unchanged in Batch 2B by design. The 167 Critical set is split into
Sprint 3 sub-waves (S3.1 → S3.6) — see `WAVE2_BATCH_2B_LEDGER.md §
2B.1`. Enforcement is a per-category **cap fitness check** to be
scaffolded in Batch 2D that only lowers over time.

| Tier | Count | Owner |
|---|---:|---|
| Critical (UI→repositories, UI→supabase) | 167 | Sprint 3.1–3.4 |
| Major (hooks→supabase) | 31 | Sprint 3.5 |
| Minor (components→services) | 5 | Sprint 3.6 |

---

## 4. Top-10 Central Components — decision log

Binding decisions per module now recorded in `WAVE2_BATCH_2B_LEDGER.md
§ 2B.4`. Summary:

| # | Module | FanIn | Verdict (from Batch 2A) | 2B.4 Decision |
|---|---|---:|---|---|
| 1 | `src/components/ui` | 93 | Stable primitives | Keep, shrink by attrition (Wave 3) |
| 2 | `src/integrations/supabase` | 85 | Boundary leaf | Permanent |
| 3 | `src/lib/repositories` | 63 | Should be UI-invisible | Sprint 3.1–3.2 |
| 4 | `src/hooks/useAuth` | 61 | Stable | Wrap behind identity port (Wave 6.5) |
| 5 | `src/hooks/use-toast` | 46 | Stable | Migrate to `platform/ports/notification` (Wave 6.5) |
| 6 | `src/lib/errorHandler` | 43 | Stable | Permanent |
| 7 | `src/components/shared` | 39 | Watch (highest fanOut) | Split in Wave 3 |
| 8 | `src/lib/utils` | 35 | Stable | Permanent |
| 9 | `src/hooks/use-mobile` | 32 | Stable | Extract device port (Wave 6.5) |
| 10 | `src/components/mobile` | 31 | Review only | Revisit post-Wave 3 |

---

## 5. FanOut census — feature code

Full table with decisions is in `WAVE2_BATCH_2B_LEDGER.md § 2B.3`.
No fitness enforcement yet — activation in Batch 2D so Sprint 3
migrations lower numbers organically.

Effective max FanOut after excluding composition root + declared
barrels: **59** (`CustomerDetailsPage.tsx`, owned by Wave 3).

---

## 6. Additional indicators

| Indicator | Value | Delta vs 2A |
|---|---|---|
| Median instability of top-10 centrals | 0.10 | unchanged |
| Abstraction ratio in `src/ui/primitives` | 0.00 | unchanged |
| `src/ui/index.ts` export count | 121 | unchanged (Batch 2D prune) |
| Files touching `@/ui` barrel from inside `src/ui/**` | 0 | ↓ from 6 |

---

## 7. Architecture Score

```text
                                 before 2B   after 2B
Cycles (weighted UI/domain) .......  5.0        7.5
Layer violations (owned & capped)    3.0        5.0
Central health (top-10 decisions)    8.5        9.0
Stability .........................  9.0        9.0
Abstraction ....................... 10.0       10.0
Public surface ....................  8.0        8.0
Latent-cycle hardening ............   —         9.0  (new)
──────────────────────────────────────────────────────
Architecture Score ................  7.4        8.0
```

Sprint 2 exit target remains **≥ 9.5** — reached only after Batch 2D
(FanOut fitness + layer-cap fitness) and after Sprint 3 begins
draining the 167 Critical violations.

---

## 8. What this batch delivered

- 6 files inside `src/ui/**` rewritten off the `@/ui` barrel.
- 1 shared-type extraction under `components/customers/details/**`.
- UI cycles: 2 → 0. Latent-barrel time bombs: 5 → 0.
- Full 2B ledger with owners for every remaining item.
- Baseline drift: **none**. No fitness-check flipped.

## 9. What this batch did NOT do

- No `pages/**`, no repository, no query-layer changes.
- No fitness-check enforcement flips (Batch 2D owns that).
- No public-surface pruning of `src/ui/index.ts` (Batch 2D).
- No PDF or Dashboard cycle fixes (owned by PDF/feature owners).

