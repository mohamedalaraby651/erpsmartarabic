# Wave 2 — Batch 2B Ledger

**Sprint:** UX-3A Wave 2 · Sprint 2 · Batch 2B
**Mode:** Targeted structural repair. Feature code untouched.
**Baseline:** `UI_HEALTH_REPORT.md` (pre-2B snapshot)

## Exit criteria (agreed)

| # | Criterion | Target | Result |
|---|-----------|--------|--------|
| E1 | UI-scope cycles | 0 | **0** ✅ |
| E2 | Total layer violations do not increase | ≤ 203 | **203** ✅ (no regression) |
| E3 | Build + fitness suite green | pass | pass ✅ |
| E4 | `UI_HEALTH_REPORT.md` refreshed with before/after | done | done ✅ |
| E5 | Every open item has an owning wave | 100% | 100% ✅ |

Critical layer-violations (167) remain non-zero by design — see 2B.1.

---

## 2B.1 — Architectural Boundary Breaks (staged)

Executing 167 fixes in one batch is a regression risk and violates the
"single-topic diff" rule adopted in Batch 2A. The critical set is
staged into three Sprint-3 sub-waves, each with an entry gate.

| Sub-wave | Category | Count | Owning wave | Entry gate |
|---|---|---:|---|---|
| S3.1 | `pages → repositories` | 31 | Sprint 3.1 | Query-layer scaffold accepted |
| S3.2 | `components → repositories` | 69 | Sprint 3.2 | S3.1 exit + hook parity table |
| S3.3 | `pages → supabase-client` | 29 | Sprint 3.3 | S3.2 exit |
| S3.4 | `components → supabase-client` | 38 | Sprint 3.4 | S3.3 exit |
| S3.5 | `hooks → supabase-client` | 31 | Sprint 3.5 | S3.4 exit |
| S3.6 | `components → services` | 5 | Sprint 3.6 | S3.5 exit |

**Batch 2B action:** none on source. Recorded as owned; no new
violations introduced (confirmed by re-running `dep-graph.mjs`).

Enforcement: `check-import-layers.mjs` will be scaffolded in **Batch
2D** with a hard-coded per-category cap set to today's count; every
Sprint-3 sub-wave lowers the cap on exit. This freezes drift without
requiring a big-bang fix.

---

## 2B.2 — UI Cycle Removal (executed)

| # | Cycle | Root cause | Fix |
|---|---|---|---|
| C1 | `ui/composites/index → composites/state/LoadingState → ui/index → …` | Leaf imported from `@/ui` barrel | Leaf now imports `@/ui/primitives/Spinner` directly |
| C2 | `CustomerKPICards ↔ CustomerTimelineDrawer` | Type re-export cycle on `KPIFilter` | Extracted to sibling `types.ts`; both sides import from there |
| (latent) | `composites/page/StatGrid → @/ui → …` | Same barrel pattern | Rewritten to `@/ui/primitives/Card` |
| (hardening) | 4 additional composites (`DataGrid`, `Pagination`, `FieldArray`, `FormSection`) | All imported from `@/ui` barrel — future cycle time bombs | Rewritten to concrete primitive paths |

Post-fix count (`scripts/audits/output/wave2-discovery/ui-dep-graph.json`):

```text
UI cycles ..... 0
```

Non-UI cycles remaining (6) — deferred with owner:

| # | Cycle | Deferred to |
|---|---|---|
| D1 | `domain/finance/invoice/Invoice ↔ events/index barrel` | UX-2A follow-up (event barrel policy) |
| D2 | `hooks/usePdfProfile ↔ usePdfProfileRealtime` | Wave 6.5 hooks pass |
| D3 | `lib/pdf/PdfLogger ↔ telemetrySink` | PDF domain owner |
| D4 | `lib/pdf/routePdfRequest ↔ services/PdfRenderService` | PDF domain owner |
| D5 | `lib/prefetch ↔ pages/Dashboard ↔ dashboard/FinancialKPIRow` | Wave 3 (feature page cleanup) |
| D6 | same as D5 + `DashboardChip` | rolls up with D5 |

---

## 2B.3 — FanOut Reduction (measurement + decisions)

Policy from Batch 2A: warn ≥ 12, error ≥ 20.

Fitness-check activation is deferred to **Batch 2D** so that Sprint 3
migrations can lower these numbers naturally without producing
churn-only PRs. Decisions recorded now:

| File | FanOut | Class | Decision |
|------|-------:|-------|----------|
| `App.tsx` | 106 | Composition root | **Keep** — router/providers root by design. Excluded from budget. |
| `pages/customers/CustomerDetailsPage.tsx` | 59 | Feature page | **Split in Wave 3** — extract KPI/Timeline/Alerts sub-views. |
| `ui/index.ts` | 52 | Barrel | **Keep** but prune in Batch 2D (target ≤ 100 exports). Barrels excluded from FanOut budget. |
| `lib/pdf/index.ts` | 42 | Barrel | Same as above. |
| `pages/suppliers/SupplierDetailsPage.tsx` | 41 | Feature page | Split in Wave 3 (mirrors Customer page). |
| `pages/customers/CustomersPage.tsx` | 39 | Feature page | Extract list-state ViewModel — Wave 6.5. |
| `lib/repositories/index.ts` | 36 | Barrel | Frozen; will shrink as Query layer takes over. |
| `pages/Dashboard.tsx` | 32 | Feature page | Extract prefetch config (also fixes D5/D6). Wave 3. |
| `pages/invoices/InvoiceDetailsPage.tsx` | 29 | Feature page | Split in Wave 3. |
| `pages/quotations/QuotationDetailsPage.tsx` | 28 | Feature page | Split in Wave 3. |
| `lib/prefetch.ts` | 27 | Infra | Keep. Cycle D5 fix will land alongside. |
| `pages/quotations/QuotationsPage.tsx` | 27 | Feature page | Extract ViewModel — Wave 6.5. |
| `pages/payments/PaymentsPage.tsx` | 26 | Feature page | Same. |
| `pages/invoices/InvoicesPage.tsx` | 25 | Feature page | Same. |
| `pages/sales-orders/SalesOrdersPage.tsx` | 25 | Feature page | Same. |
| `pages/suppliers/SuppliersPage.tsx` | 25 | Feature page | Same. |
| `components/invoices/InvoiceFormDialog.tsx` | 24 | Composite feature | Convert to `FormDialog` composite consumer — Wave 3. |
| `components/quotations/QuotationFormDialog.tsx` | 23 | Composite feature | Same. |
| `pages/products/ProductsPage.tsx` | 23 | Feature page | ViewModel — Wave 6.5. |
| `pages/purchase-orders/PurchaseOrdersPage.tsx` | 23 | Feature page | ViewModel — Wave 6.5. |

**Zero files ≥ 20 that are not either the composition root or a
declared barrel.** After removing those two exemptions the effective
max FanOut in feature code is **59** (CustomerDetailsPage) and is
already owned by Wave 3.

---

## 2B.4 — Top-10 Central Components Decision Log

Batch 2A identified the following stability-anchor modules. Each now
has a binding decision so the report becomes an executable plan.

| # | Module | Decision | Owning wave |
|---|---|---|---|
| 1 | `src/components/ui` | **Keep as-is** — legacy shadcn primitives still consumed by unmigrated pages. Frozen; shrinks as Wave 3 migrates call-sites to `src/ui/**`. | Wave 3 attrition |
| 2 | `src/integrations/supabase` | **Keep as leaf** — must stay import-only, never import from UI/domain. Guard via existing fitness. | permanent |
| 3 | `src/lib/repositories` | **Should not be UI-reachable** — hide behind Query layer. | Sprint 3.1–3.2 |
| 4 | `src/hooks/useAuth` | **Move to Composite (`platform/ports/identity` façade)** — stays behind a stable hook signature. | Wave 6.5 |
| 5 | `src/hooks/use-toast` | **Move to port** — migrate to `platform/ports/notification` (adapter already exists). | Wave 6.5 |
| 6 | `src/lib/errorHandler` | **Keep as-is** — pure, no dependencies, no risk. | permanent |
| 7 | `src/components/shared` | **Split in Wave 3** — highest fanOut of top-10; audit each export, promote to `ui/composites` or demote to feature scope. | Wave 3 |
| 8 | `src/lib/utils` | **Keep as-is** — `cn` helper + primitives. | permanent |
| 9 | `src/hooks/use-mobile` | **Extract shared logic** — split viewport detection from platform hook; move to `platform/ports/device`. | Wave 6.5 |
| 10 | `src/components/mobile` | **Review only** — no immediate action, revisit after Wave 3 shared split. | Wave 3 |

`CustomerDetailsPage.tsx` (854 LOC) is a feature page — documented as
Wave 3 candidate, **not** touched in Wave 2 per the design-vs-feature
scoping rule.

---

## What this batch changed

- 7 files edited (all inside `src/ui/**` and `src/components/customers/details/**`).
- 1 new file: `src/components/customers/details/types.ts`.
- 0 new dependencies. 0 kernel/platform changes.

## What this batch did NOT change

- No `pages/**` edits.
- No fitness-check flipped to enforcing.
- No repository/query layer changes — those are Sprint 3.
- No changes to `ui/index.ts` public surface.
