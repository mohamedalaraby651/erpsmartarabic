# F0 — Frontend Platform Baseline (Track A)

- **Unit ID:** `F0-NAZRA-001`
- **Authorization:** Human execution order following the BND-05 certification decision
- **Mode:** **MEASUREMENT AND CLASSIFICATION ONLY** — no source mutation, no refactoring, no UI redesign, no repository migration, no query-service implementation, no design-system consolidation, no performance/accessibility/RTL fixes
- **Machine evidence:** `scripts/audits/output/f0-frontend-baseline.json`
- **Full classification table:** `docs/governance/F0_APPENDIX_A_VIOLATION_CLASSIFICATION.md`
- **Status:** F0 MEASUREMENT COMPLETE — F1 scope is a **DRAFT** and its hash is deliberately **NOT frozen**

---

## 0. Governance state at F0 open

| Item | State |
|---|---|
| G0R-NAZRA-002 | ACCEPTED |
| BASELINE-UX4-001 | SEALED |
| PH1A | CANDIDATE COMPLETE |
| **BND-05** | **CERTIFIED (1/8)** — human decision on `CERT-REV-BND05-R2` |
| CERT-REV-BND05 | PASS (HOLD resolved by REM-BND05-001) |
| REM-BND05-001 | EXECUTED |
| CERT-REV-BND05-R2 | EVIDENCE PASS |
| PRE-TS-001 | CONTAINED (recurred and was re-applied during F0; containment only) |
| PRE-EXT-001 | OPEN — *security containment achieved / functional capability not restored* |
| RISK-007 | OPEN |
| RISK-008 | OPEN |
| Smart Freeze | ACTIVE |
| PH1B | NOT AUTHORIZED |
| BND-01 … BND-04, BND-06 … BND-08 | NOT AUTHORIZED |

Track A is **Consolidation, never Rewrite**.

---

## 1. Method

1. Declared scope (this document, F0 only).
2. Pre-verification: re-ran the existing audit harness unchanged so numbers are reproducible against the sealed baseline rules.
3. Measurement: `dep-graph`, `data-access-classify`, `design-system-inventory`, `ui-kit-usage`, `component-inventory`, `route-inventory`, `accessibility-audit`, `performance-audit`, `rendering-cost`, `typecheck-app`, `run-all` fitness, Vitest.
4. Classification: new script `scripts/audits/f0-frontend-baseline.mjs` re-derives **every** violation edge with the identical rule set used by `dep-graph.mjs`, then classifies each occurrence and records a rationale.
5. Evidence: JSON artifact + appendix + this record.
6. Human review: required before F1.

The classifier is deterministic and inspects the importing module's actual call sites (`supabase.auth.*`, `supabase.storage.*`, `channel(`, `functions.invoke`, `rpc(`, `from(`) plus `import type` erasure. Heuristic limits are disclosed in §9.

---

## 2. Architecture measurements

| Signal | Observed |
|---|---|
| Modules (madge) | 1212 |
| Routes | 100 |
| Repositories | 44 |
| Query services | 2 (`reportsQueryService`, `supplierQueryService`) |
| Application query facades | 12 namespaces under `@/application/queries` |
| Cycles | 6 (0 in `src/ui`) |
| Import-layer violations | **155** |
| Data-access call sites (total / UI / repos / queries) | 631 / 153 / 44 / 2 |
| Typecheck (project) | 0 errors |
| Fitness | active 33, pending 9, **failures 0** |
| Vitest | 1619 passed, 5 skipped, 158 files passed |

### 2.1 Violations by rule

| Rule | Count |
|---|---:|
| `components → repositories` | 41 |
| `components → supabase-client` | 38 |
| `hooks → supabase-client` | 31 |
| `pages → supabase-client` | 29 |
| `pages → repositories` | 11 |
| `components → services` | 5 |
| `domain → ui` | 0 |
| **Total** | **155** |

### 2.2 Remaining cycles (6)

1. `domain/finance/invoice/*` — Invoice ↔ errors ↔ statusOf ↔ events (frozen Finance domain; **not** F1 scope)
2. `hooks/usePdfProfile.ts` ↔ `hooks/usePdfProfileRealtime.ts`
3. `lib/pdf/diagnostics/PdfLogger.ts` ↔ `telemetrySink.ts`
4. `lib/pdf/routing/routePdfRequest.ts` ↔ `lib/pdf/services/PdfRenderService.ts`
5. `lib/prefetch.ts → pages/Dashboard.tsx → components/dashboard/FinancialKPIRow.tsx`
6. same chain extended through `components/dashboard/_shared/DashboardChip.tsx`

---

## 3. Classification of the 155 (primary F0 output)

```
155
 ├── LEGITIMATE_EXCEPTION ....  6
 ├── TRANSITIONAL ............ 44
 ├── FALSE_POSITIVE .......... 10
 └── ACTUAL_VIOLATION ........ 95  → F1 / F2 only
```

| Rule | ACTUAL | TRANSITIONAL | LEGITIMATE | FALSE POSITIVE |
|---|---:|---:|---:|---:|
| `components → repositories` | 33 | 8 | 0 | 0 |
| `components → services` | 0 | 5 | 0 | 0 |
| `components → supabase-client` | 34 | 0 | 1 | 3 |
| `hooks → supabase-client` | 0 | 28 | 2 | 1 |
| `pages → repositories` | 4 | 3 | 0 | 4 |
| `pages → supabase-client` | 24 | 0 | 3 | 2 |
| **Total** | **95** | **44** | **6** | **10** |

**Definitions used**

- `LEGITIMATE_EXCEPTION` — direct client use is architecturally correct: auth-session access (identity is a kernel port), object storage, realtime channel subscription. No relational read/write hidden from the repository layer.
- `TRANSITIONAL` — a sanctioned seam that is *not wrong today* but must move: hooks acting as the data-access seam (28), `lib/repositories/_base` shared types imported by dialogs (11), application services invoked from UI (5).
- `FALSE_POSITIVE` — type-only imports erased at compile time (4) and modules importing the client without any detected data-access call site (6).
- `ACTUAL_VIOLATION` — presentation modules performing table queries / RPC / edge-function calls or importing repositories directly (95).

Breakdown of the 95 actual violations by operation performed:

| Operation detected | Count |
|---|---:|
| repository imported directly from a page/component | 37 |
| `table-query` | 44 |
| `rpc` + `table-query` | 6 |
| `edge-function` | 2 |
| `rpc` only | 2 |
| `auth` + `table-query` | 1 |
| `auth` + `rpc` + `table-query` | 1 |
| `edge-function` + `table-query` | 1 |
| `storage` + `table-query` | 1 |

> **Explicit rule:** 155 is **not** a reduction target. The F1/F2 target set is the 95 `ACTUAL_VIOLATION` rows plus a decision on the 44 transitional rows. The 6 legitimate exceptions must be registered in `EXCEPTION_REGISTER.md`, not "fixed".

Row-by-row evidence for all 155: `docs/governance/F0_APPENDIX_A_VIOLATION_CLASSIFICATION.md`.

---

## 4. Query-service coverage

| Signal | Observed |
|---|---:|
| Repositories | 44 |
| Repositories with a query service | 2 (4.5%) |
| Application query facade namespaces | 12 |
| Repositories with 0 consumers | 8 (`activityLogs`, `attachments`, `index`, `notifications`, `priceList`, `reports`, `savedViews`, `tasks`) |
| Highest-fan-in repository | `_base.ts` (11 consumers) |

Coverage is measured, not judged. No target set in F0.

---

## 5. UI Platform measurements

| Signal | Observed |
|---|---:|
| UI API uniformity findings | 42 components |
| Design-system findings (total) | 635 |
| — hex colors | 194 |
| — hsl colors | 5 |
| — rgb colors | 0 |
| — font-family literals | 10 |
| — box-shadow literals | 9 |
| — arbitrary px values | 417 |
| `@/components/ui-kit` call sites | 2 (was 3) |
| Raw-color allowlist | 21 entries, 0 new |
| Inline `style={{…}}` files | 48 |
| `any` in UI files | 14 |
| Components over 600 LOC | 2 (`src/components/ui/sidebar.tsx` 638, `src/pages/customers/CustomerDetailsPage.tsx` 855) |
| Component files (total) | 1096, 8 over 500 LOC |
| Deep imports into shared kernel | 0 |

Uniformity findings are dominated by three shapes: missing `@canonicalState` JSDoc tag, missing `className` prop, missing `displayName` on `forwardRef`.

---

## 6. State ownership map (as-is)

| Layer | Current owner in code | Observation |
|---|---|---|
| Server State | TanStack Query — 198 files using `useQuery`/`useMutation` | Dominant and consistent, but ~153 UI-level data-access call sites bypass repositories/query services. |
| Application State | React Context + `src/platform/*` services + `ShellProvider` (events, slots, layout, theme, workspaces) | Shell is coherent; tenant/permission/session state is read in several places directly from the client. |
| Local UI State | Component `useState` + `useListState` / `useFormDialog` patterns | Mandated hooks exist; adoption not exhaustively measured in F0. |
| Offline State | `src/hooks/useOfflineSync.ts`, `usePushNotifications.ts`, service-worker registration in `src/main.tsx` + `index.html` | A sync layer exists with tests (`pwa-offline.test.ts`), but it is not a single owned boundary. |

No state migration is proposed in F0.

---

## 7. Quality measurements (no budgets invented)

| Signal | Observed |
|---|---:|
| Accessibility findings | 222 (icon-only controls 140, unlabeled inputs 75, heading order 7, tabindex 0) |
| RTL logical-properties fitness | PASS — 23 scanned, 0 violations |
| Bundle total | 4,920,767 bytes across 91 assets |
| Largest assets | `pages-sales-core` 673 KB, `vendor-misc` 667 KB, `vendor-pdf` 574 KB, `vendor-excel` 429 KB, `vendor-ui` 349 KB |
| Route lazy-loading | 89 / 99 routes lazy |
| `Suspense` boundaries | 7 |
| Memoization coverage | 14.0% |
| Virtualization candidates | 142 |
| Heavy components (render cost) | 171 |
| LCP / INP / CLS | **NOT MEASURED** — no field or lab RUM harness exists in-repo |
| Query latency | **NOT MEASURED** — no client query-timing instrumentation exists |

"Not measured" is recorded honestly rather than estimated. Instrumenting RUM is a candidate F5 item, not an F0 action.

---

## 8. Mobile / PWA (as-is only)

| Signal | Observed |
|---|---|
| Responsive strategy | Tailwind breakpoints + documented table→card transformation for document forms |
| Mobile interaction standard | 44px targets, tap-only hovers (documented standard) |
| PWA icons | 8 sizes present in `public/icons/` |
| Service worker | Registered in `src/main.tsx`; `index.html` contains an unregistration/refresh path |
| Web app manifest | **No `manifest.webmanifest` / `manifest.json` linked from `index.html`** — recorded as an observation |
| Offline UX | `useOfflineSync` hook + offline integration test present |
| Sync UX | Exists in hook form; no dedicated user-facing sync surface measured |

---

## 9. Disclosed limitations of the F0 classifier

1. Call-site detection is static and regex-based. Six rows landed in `FALSE_POSITIVE` as "client imported but no data-access call site detected" — including upload components (`AssetUploader.tsx`, `ImageUpload.tsx`, `EventDispatcherCard.tsx`) whose usage may be constructed indirectly. **F1 must manually confirm each of these six before treating them as non-issues.**
2. Classification of `hooks → supabase-client` as `TRANSITIONAL` is an architectural position (hooks are today's sanctioned seam), not a proof of correctness.
3. `_base.ts` imports are classified `TRANSITIONAL` because the coupling is to shared types/utilities, not to a data gateway; extracting a contract module in F1 resolves them.
4. The classifier reads the current working tree, not a sealed commit. Any later source change invalidates these counts and requires re-running the script.

---

## 10. Deltas versus the last recorded scoreboard snapshot

| Signal | SNAPSHOT-20260825-001 | F0 | Delta |
|---|---:|---:|---|
| Layer violations | 171 | 155 | −16 (Batch B C2, already certified evidence) |
| `pages → repositories` | 27 | 11 | −16 |
| Routes | 98 | 100 | +2 |
| Modules (madge) | — | 1212 | new measurement basis |
| ui-kit call sites | 3 | 2 | −1 |
| Cycles | 6 | 6 | 0 |

No silent baseline edits were made; the above is a documented delta.

---

## 11. F0 exit statement

- F0 produced measurements and a complete 155-row classification.
- **No source mutation** was performed, with the single disclosed exception of re-applying the *contained* PRE-TS-001 type annotation in `src/integrations/supabase/previewAuthStorage.ts` after the platform regenerated the file (recurrence, containment only — not a fix, not a scope expansion).
- `F1_SCOPE_001` is drafted at `docs/governance/F1_SCOPE_001_DRAFT.md`. **Its hash is not frozen and F1 remediation has not started.**
- Next gate: **Human Review of F0 evidence**, then a separate authorization for F1.
