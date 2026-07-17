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

## 2. Cycles (must reach 0 before Sprint 2 close)

Whole-tree count = 8. UI-scoped count = 2.

| # | Cycle | Scope | Notes |
|---|-------|-------|-------|
| C1 | `ui/composites/index.ts → ui/composites/state/LoadingState.tsx → ui/index.ts → ui/composites/index.ts` | UI | Barrel↔leaf cycle. Fix: leaf imports primitive tokens directly, not `ui/index.ts`. |
| C2 | `components/customers/details/CustomerKPICards.tsx ↔ CustomerTimelineDrawer.tsx` | Domain UI | Bidirectional import. Fix: extract shared types to sibling `types.ts`. |
| C3 | `domain/finance/invoice/Invoice.ts → errors/InvoiceDomainError.ts → statusOf.ts → events/index.ts → events/InvoiceIssued.ts → Invoice.ts` | Domain | Long path through event barrel. Fix: `Invoice.ts` should import concrete event files, not `events/index.ts`. |
| C4 | `hooks/usePdfProfile.ts ↔ hooks/usePdfProfileRealtime.ts` | Hooks | Extract shared realtime primitive. |
| C5 | `lib/pdf/diagnostics/PdfLogger.ts ↔ telemetrySink.ts` | PDF | Sink should not import logger; invert. |
| C6 | `lib/pdf/routing/routePdfRequest.ts ↔ lib/pdf/services/PdfRenderService.ts` | PDF | Router should receive service via DI, not import it. |
| C7 | `lib/prefetch.ts → pages/Dashboard.tsx → components/dashboard/FinancialKPIRow.tsx` (returns to prefetch) | Feature | Move prefetch config out of `Dashboard.tsx`. |
| C8 | C7 + one extra hop through `_shared/DashboardChip.tsx` | Feature | Same root cause as C7. |

**Sprint 2 Batch 2A verdict:** classified only. Fixes deferred to Batch 2B (with the layer-violation critical set) so each PR carries a single-topic diff.

---

## 3. Layer Violations — 203 total, tiered

Rules from `docs/architecture/DEPENDENCY_RULES.md`. Classification per Sprint 2 protocol.

| Tier | Count | Categories |
|---|---|---|
| **Critical** — UI reaches DB directly, breaks tenant isolation contract | **167** | `components→repositories` (69), `pages→repositories` (31), `components→supabase-client` (38), `pages→supabase-client` (29) |
| **Major** — hooks bypass Query layer | **31** | `hooks→supabase-client` |
| **Minor** — legacy service coupling | **5** | `components→services` |
| **Clean** | 0 | `domain→ui` |

Only **Critical** is a Sprint 2 fix candidate. Major & Minor go to Sprint 3 with the Query-layer consolidation.

Full samples: `scripts/audits/output/dependency-report.json` → `importLayerViolations.samples`.

---

## 4. Top 10 Central Components (fanIn, module granularity)

| # | Module | FanIn | FanOut | Instability (I=Ce/(Ca+Ce)) | Verdict |
|---|---|---|---|---|---|
| 1 | `src/components/ui` | 93 | 4 | 0.041 | **Stable & shared** — canonical primitives. No action. |
| 2 | `src/integrations/supabase` | 85 | 0 | 0.00 | **Boundary** — must remain leaf. No action. |
| 3 | `src/lib/repositories` | 63 | 7 | 0.10 | **Should not be UI-reachable**. Sprint 3: front with Query layer. |
| 4 | `src/hooks/useAuth` | 61 | 0 | 0.00 | Stable, single-purpose. No action. |
| 5 | `src/hooks/use-toast` | 46 | 0 | 0.00 | Stable. Candidate for migration to `platform/ports/notification`. |
| 6 | `src/lib/errorHandler` | 43 | 0 | 0.00 | Stable. No action. |
| 7 | `src/components/shared` | 39 | 15 | 0.278 | **Watch** — highest fanOut, medium fanIn. Batch 2C target. |
| 8 | `src/lib/utils` | 35 | 0 | 0.00 | Stable. No action. |
| 9 | `src/hooks/use-mobile` | 32 | 0 | 0.00 | Stable. No action. |
| 10 | `src/components/mobile` | 31 | 6 | 0.162 | Stable enough. Review only. |

Per-file component review (Split / Extract / Memo / API cleanup) is scoped to Batch 2C and produced as a separate ledger; not remediated here.

---

## 5. Additional health indicators (Sprint 2 additions)

### 5.1 Component Stability

Metric: `I = Ce / (Ca + Ce)` (Martin's Instability). Reported per module in `ui-architecture-health.json`.

- 8 of top 10 central modules have `I ≤ 0.28` → healthy stability zone.
- Highest instability among centrals: `components/shared` (0.278). Acceptable but is the Batch 2C review target.

### 5.2 Abstraction Ratio inside `src/ui/primitives`

- Files scanned: 27
- Re-export-only (wrapper) files: 0
- **Ratio: 0.00** → healthy. Primitives carry real behavior; layer has not degenerated into wrappers.

### 5.3 Public Surface Area

Total exports across canonical barrels:

| Barrel | Exports | Note |
|---|---|---|
| `src/ui/index.ts` | 121 | Above target of ≤100. Batch 2C or Sprint 3: prune unused re-exports. |
| `src/kernel/index.ts` | 8 | Aligned with 8 kernel sub-modules. Frozen. |
| `src/platform/index.ts` | 0 direct | Re-exports via sub-barrels. Acceptable. |
| `src/domain/finance/index.ts` | 21 | Sealed in UX-2A Wave 8. Frozen. |
| `src/application/finance/index.ts` | 1 | Sealed. |

### 5.4 FanOut policy proposal (adopted)

- **Warn** at FanOut ≥ 12 (Orchestrator zone — allowed if declared)
- **Error** at FanOut ≥ 20 (structural smell — never allowed)

To be encoded as fitness check `check-fan-out-budget.mjs` in Batch 2D (not this batch).

---

## 6. Architecture Score

Composite over 6 sub-scores, each ∈ [0,10], equal weight.

```text
Cycles          (8, target 0)          → 5.0
Layer violations (203, target 0)      → 3.0
Central health  (top-10 verdicts)     → 8.5
Stability       (medians healthy)     → 9.0
Abstraction     (0.0 in primitives)   → 10.0
Public surface  (1 barrel over budget)→ 8.0
────────────────────────────────────────
Architecture Score .................. 7.4 / 10
```

Sprint 2 exit target: **≥ 9.5** (cycles=0, critical violations=0, all barrels within budget).

---

## 7. What this batch delivered

- Regenerated all three dep-graph reports.
- Classified 8 cycles and 203 violations into Critical / Major / Minor.
- Reviewed top 10 central modules.
- Introduced Stability, Abstraction Ratio, Public Surface metrics.
- Locked FanOut policy (warn≥12, error≥20) — enforcement deferred.

## 8. What this batch did NOT do

- No source file edits.
- No fitness-check enforcement flips.
- No cycle fixes — those land in Batch 2B alongside Critical violation removal.
- No component splits — Batch 2C.
- No FanOut check — Batch 2D.
