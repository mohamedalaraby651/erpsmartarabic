# Phase 1C — Batch A: Data Orchestration Inventory (Baseline Freeze)

**Status:** Baseline frozen. No production code changes in this phase.
**Audit script:** `scripts/audits/check-data-access.sh` (multiline-aware, official Gate).
**Frozen baseline:** **77 files** with direct Supabase usage in `src/components/**` and `src/pages/**` (multiline `rg -U` scan). Strict per-call tally by method = **192 call sites** (`from: 159`, `rpc: 22`, `storage: 11`, `channel: 0`); `createClient(` outside `src/integrations/**` = **0**. The earlier-reported `334` figure counted every chained `.from/.rpc/...` on aliased clients and is superseded by the audit script's numbers, which become the single source of truth from now on.

## Why the baseline was reset
The previous single-line regex (`rg "supabase\.(from|rpc|...)"`) missed every multiline call such as:
```ts
supabase
  .from('x')
  .select('*')
```
We replaced the measurement tool itself (Python multiline regex inside the audit script), not just the number. All future Gate calculations (Reuse Rate, New-Repo Rate, Exceptions count) are derived from the audit script's output — not from any prior estimate.

## Closed exception categories (no additions mid-flight)
| Category | Marker | Allowed surface |
|----------|--------|-----------------|
| auth | `// repo-exception: auth` | session bootstrap, MFA enrolment |
| realtime | `// repo-exception: realtime` | `supabase.channel(...)` subscriptions |
| storage | `// repo-exception: storage` | `supabase.storage.from(...)` uploads / signed URLs |
| edge | `// repo-exception: edge` | streaming responses from edge functions |

A hit is justified only when the marker is on the same/previous line **and** the file appears in the Exception rows below.

## Existing repositories (43)
`activityLogs, adminMetrics, admin, approval, attachments, attendance, category, coa, collection, creditNote, customerRelations, customer, customerSearch, dimensions, employee, expense, fiscalPeriod, inventory, invoice, journal, legacyQuotations, logistics, notifications, payment, pdfAssets, pdfProfiles, postingLog, priceList, product, purchaseOrder, quotation, reference, reportTemplate, reports, salesOrder, savedViews, settings, supplierPayment, supplierRelations, supplier, tasks, treasury` (+ `_base`, `index`).

## Preliminary classification (before any migration)

| Class | Files | % | Meaning |
|-------|------:|---:|---------|
| Reuse | 53 | 68.8% | Call site swaps to an existing repo method, no repo change |
| Extend | 17 | 22.1% | Existing repo gains one small method (mostly `getAging`, `getHealthScore`, `getStatement`, `listDomainEvents`, `listTenants`, etc.) |
| New | 3 | 3.9% | Needs a thin new repo (subject to justification code) |
| Exception | 4 | 5.2% | Falls in the four allowed categories |

**Preliminary Reuse + Extend = 90.9%. Preliminary New-Repo Rate = 3.9%.** Both inside the thresholds (Reuse ≥ 80%, New ≤ 20%). These are *predictions* — Gate A re-checks them against actual migration results.

## Preliminary New-repo candidates (each requires a justification code before any code is written)

| File | Proposed repo | Justification code (draft) | Notes |
|------|---------------|----------------------------|-------|
| `src/pages/search/SearchPage.tsx` | `globalSearchRepository` | `Technical specialization` | Cross-aggregate full-text search; doesn't belong to a single owner. |
| `src/pages/sync/SyncStatusPage.tsx` | `syncStatusRepository` | `New aggregate` | Reads `sync_log` / `sync_queue` — no existing repo covers offline sync telemetry. |
| `src/components/shared/FileUpload.tsx` | (split) `attachmentsRepository` + `storage` exception | `Boundary mismatch` | DB row goes through `attachmentsRepository`; the actual upload call is a Storage exception. May not need a new repo at all — re-evaluated during Batch A1. |

If any of these promote to additional new repos during Batch A1, they must carry one of: `New aggregate`, `Boundary mismatch`, `Technical specialization`. Any other justification is a red flag → stop and revisit Repository Layer design.

## Approved exception files (current)

| File | Class | Aggregate | Target / Reason | from | rpc | storage |
|------|-------|-----------|-----------------|-----:|----:|--------:|
| `src/components/auth/TwoFactorSetup.tsx` | Exception | auth | exception:auth | 1 | 0 | 0 |
| `src/components/settings/ExportCenter/AssetUploader.tsx` | Exception | — | exception:storage | 0 | 0 | 1 |
| `src/components/shared/ImageUpload.tsx` | Exception | — | exception:storage | 0 | 0 | 2 |
| `src/components/shared/LogoUpload.tsx` | Exception | — | exception:storage | 0 | 0 | 3 |

These files will get the `// repo-exception: <category>` marker added in Batch A1 (the only "code change" allowed during Batch A1 for exception files). Until then the audit script will report them as unjustified — that is expected and is the proof the script is wired correctly.

## Full inventory (77 files)

| File | Class | Aggregate | Target / Reason | from | rpc | storage |
|------|-------|-----------|-----------------|-----:|----:|--------:|
| `src/components/customers/details/CustomerPinnedNote.tsx` | Extend | customer | customerRepository | 1 | 0 | 0 |
| `src/components/dashboard/CalendarWidget.tsx` | Reuse | mixed | dashboard widgets → existing repos | 4 | 0 | 0 |
| `src/components/dashboard/InvoiceQuickActions.tsx` | Reuse | invoice | invoiceRepository | 3 | 0 | 0 |
| `src/components/dashboard/LowStockWidget.tsx` | Reuse | stock | inventoryRepository | 2 | 0 | 0 |
| `src/components/dashboard/TodayPerformanceWidget.tsx` | Reuse | mixed | dashboard widgets → existing repos | 6 | 0 | 0 |
| `src/components/export/ExportWithTemplateButton.tsx` | Reuse | export | reportTemplateRepository | 2 | 0 | 0 |
| `src/components/inventory/StockMovementDialog.tsx` | Reuse | inventory | inventoryRepository | 2 | 0 | 0 |
| `src/components/inventory/WarehouseFormDialog.tsx` | Reuse | inventory | inventoryRepository | 2 | 0 | 0 |
| `src/components/invoices/useInvoiceItems.ts` | Reuse | invoice | invoiceRepository | 1 | 0 | 0 |
| `src/components/notifications/NotificationBell.tsx` | Reuse | notification | notificationsRepository | 3 | 0 | 0 |
| `src/components/payments/PaymentFormDialog.tsx` | Reuse | payment | paymentRepository | 2 | 0 | 0 |
| `src/components/print/InvoicePrintView.tsx` | Reuse | invoice | invoiceRepository | 3 | 0 | 0 |
| `src/components/products/ProductVariantDialog.tsx` | Reuse | product | productRepository | 2 | 0 | 0 |
| `src/components/reports/AgingReport.tsx` | Extend | report | reportsRepository | 1 | 0 | 0 |
| `src/components/reports/GeographicReport.tsx` | Extend | report | reportsRepository | 2 | 0 | 0 |
| `src/components/reports/InactiveCustomersReport.tsx` | Extend | customer | customerRepository | 1 | 0 | 0 |
| `src/components/reports/IncomeStatementReport.tsx` | Extend | report | reportsRepository | 4 | 0 | 0 |
| `src/components/reports/InventoryFlowReport.tsx` | Extend | inventory | inventoryRepository | 3 | 0 | 0 |
| `src/components/reports/ProfitabilityReport.tsx` | Extend | report | reportsRepository | 3 | 0 | 0 |
| `src/components/reports/TrialBalanceReport.tsx` | Extend | report | reportsRepository | 2 | 0 | 0 |
| `src/components/settings/BackupTab.tsx` | Reuse | settings | settingsRepository | 6 | 0 | 0 |
| `src/components/settings/CompanyInfoSection.tsx` | Reuse | settings | settingsRepository | 3 | 0 | 0 |
| `src/components/settings/ExportCenter/ExportCenterPage.tsx` | Reuse | settings | settingsRepository | 1 | 0 | 0 |
| `src/components/settings/InvoiceSettingsSection.tsx` | Reuse | invoice | invoiceRepository | 3 | 0 | 0 |
| `src/components/settings/OfflineSettings.tsx` | Reuse | settings | settingsRepository | 2 | 0 | 0 |
| `src/components/settings/PersonalInfoSection.tsx` | Reuse | settings | settingsRepository | 4 | 0 | 0 |
| `src/components/settings/SecuritySection.tsx` | Reuse | settings | settingsRepository | 1 | 0 | 0 |
| `src/components/settings/SettingsExportImport.tsx` | Reuse | settings | settingsRepository | 6 | 0 | 0 |
| `src/components/shared/AttachmentUploadForm.tsx` | Reuse | attachment | attachmentsRepository | 1 | 0 | 2 |
| `src/components/shared/AttachmentsList.tsx` | Reuse | attachment | attachmentsRepository | 1 | 0 | 1 |
| `src/components/suppliers/SupplierActivityTab.tsx` | Extend | supplier | supplierRepository | 1 | 0 | 0 |
| `src/components/suppliers/SupplierFormDialog.tsx` | Reuse | supplier | supplierRepository | 2 | 0 | 0 |
| `src/components/suppliers/SupplierImportDialog.tsx` | Reuse | supplier | supplierRepository | 2 | 0 | 0 |
| `src/components/suppliers/SupplierPaymentDialog.tsx` | Reuse | supplier | supplierRepository | 1 | 0 | 0 |
| `src/components/suppliers/SupplierProductsTab.tsx` | Extend | supplier | supplierRepository | 2 | 0 | 0 |
| `src/components/suppliers/SupplierRatingTab.tsx` | Extend | supplier | supplierRepository | 2 | 0 | 0 |
| `src/components/suppliers/hero/SupplierPinnedNote.tsx` | Reuse | supplier | supplierRepository | 1 | 0 | 0 |
| `src/components/tenant/TenantSettings.tsx` | Reuse | tenant | adminRepository | 1 | 0 | 0 |
| `src/pages/admin/BackupPage.tsx` | Reuse | admin | adminRepository | 2 | 0 | 0 |
| `src/pages/admin/CustomizationsPage.tsx` | Reuse | admin | adminRepository | 3 | 0 | 0 |
| `src/pages/admin/PermissionsPage.tsx` | Reuse | admin | adminRepository | 4 | 0 | 0 |
| `src/pages/admin/RolesPage.tsx` | Reuse | admin | adminRepository | 6 | 0 | 0 |
| `src/pages/admin/UsersPage.tsx` | Reuse | admin | adminRepository | 4 | 0 | 0 |
| `src/pages/attachments/AttachmentsPage.tsx` | Reuse | attachment | attachmentsRepository | 1 | 0 | 0 |
| `src/pages/dev/PdfJobsPage.tsx` | Reuse | pdf | pdfProfilesRepository | 1 | 0 | 0 |
| `src/pages/employees/EmployeeDetailsPage.tsx` | Reuse | employee | employeeRepository | 2 | 0 | 0 |
| `src/pages/notifications/NotificationsPage.tsx` | Reuse | notification | notificationsRepository | 3 | 0 | 0 |
| `src/pages/platform/PlatformAdminsPage.tsx` | Reuse | admin | adminRepository | 1 | 0 | 0 |
| `src/pages/platform/PlatformReportsPage.tsx` | Reuse | platform | adminRepository | 1 | 0 | 0 |
| `src/pages/reports/KPIDashboard.tsx` | Reuse | report | reportsRepository | 5 | 0 | 0 |
| `src/pages/reports/ReturnsReportPage.tsx` | Reuse | report | reportsRepository | 2 | 0 | 0 |
| `src/pages/reports/SalesReportsPage.tsx` | Reuse | report | reportsRepository | 3 | 0 | 0 |
| `src/pages/settings/UnifiedSettingsPage.tsx` | Reuse | settings | settingsRepository | 1 | 0 | 0 |
| `src/components/customers/charts/AgingDonutChart.tsx` | Extend | customer | customerRepository.getAging | 0 | 1 | 0 |
| `src/components/customers/details/CustomerAgingReport.tsx` | Extend | customer | customerRepository.getAging | 0 | 1 | 0 |
| `src/components/customers/details/CustomerHealthBadge.tsx` | Extend | customer | customerRepository.getHealthScore | 0 | 1 | 0 |
| `src/components/customers/details/StatementOfAccount.tsx` | Extend | customer | customerRepository.getStatement | 1 | 1 | 0 |
| `src/components/customers/tabs/CustomerTabNotes.tsx` | Extend | customer | customerRepository (notes CRUD) | 3 | 1 | 0 |
| `src/components/payments/MultiInvoiceSettlement.tsx` | Extend | invoice | invoiceRepository.settleMany | 3 | 1 | 0 |
| `src/components/suppliers/charts/SupplierAgingChart.tsx` | Extend | supplier | supplierRepository.getAging | 0 | 1 | 0 |
| `src/components/suppliers/hero/SupplierHealthBadge.tsx` | Extend | supplier | supplierRepository.getHealthScore | 0 | 1 | 0 |
| `src/components/suppliers/tabs/SupplierAgingReport.tsx` | Extend | supplier | supplierRepository.getAging | 0 | 1 | 0 |
| `src/components/suppliers/tabs/SupplierStatementTab.tsx` | Extend | supplier | supplierRepository.getStatement | 1 | 1 | 0 |
| `src/pages/admin/DomainEventsPage.tsx` | Extend | admin | adminRepository.listDomainEvents | 1 | 1 | 0 |
| `src/pages/admin/RoleLimitsPage.tsx` | Extend | admin | adminRepository (role limits) | 6 | 1 | 0 |
| `src/pages/admin/UserManagementPage.tsx` | Extend | admin | adminRepository (user mgmt) | 5 | 1 | 0 |
| `src/pages/platform/PlatformBillingPage.tsx` | Extend | platform | adminRepository (billing) | 0 | 1 | 0 |
| `src/pages/platform/PlatformDashboard.tsx` | Extend | platform | adminRepository (dashboard) | 0 | 2 | 0 |
| `src/pages/platform/TenantDetailsPage.tsx` | Extend | platform | adminRepository (tenant detail) | 1 | 3 | 0 |
| `src/pages/platform/TenantsManagementPage.tsx` | Extend | platform | adminRepository (tenants mgmt) | 1 | 3 | 0 |
| `src/components/shared/FileUpload.tsx` | New | unknown | attachmentsRepository + storage exception | 1 | 0 | 2 |
| `src/pages/search/SearchPage.tsx` | New | unknown | globalSearchRepository (Technical specialization) | 5 | 0 | 0 |
| `src/pages/sync/SyncStatusPage.tsx` | New | unknown | syncStatusRepository (New aggregate) | 2 | 0 | 0 |
| `src/components/auth/TwoFactorSetup.tsx` | Exception | auth | exception:auth | 1 | 0 | 0 |
| `src/components/settings/ExportCenter/AssetUploader.tsx` | Exception | — | exception:storage | 0 | 0 | 1 |
| `src/components/shared/ImageUpload.tsx` | Exception | — | exception:storage | 0 | 0 | 2 |
| `src/components/shared/LogoUpload.tsx` | Exception | — | exception:storage | 0 | 0 | 3 |

## Review Gate (Phase 2 — must complete before Batch A1)

Before any production file is migrated, confirm from this inventory:
- Predicted Reuse + Extend ≥ 80% → **90.9% ✓**
- Predicted New ≤ 20% → **3.9% ✓**
- Predicted exceptions only in {auth, realtime, storage, edge} → **✓** (1 auth + 3 storage; 0 realtime, 0 edge)
- No "needs review" rows remain unclassified → 3 New rows have draft justification codes, to be locked at Batch A1 kickoff.

If any of the above flips during Batch A1 (e.g. real-world New-Repo Rate > 20%, or a Boundary mismatch wave appears), the Stop Condition triggers and Repository Layer design is re-evaluated before Batch B.

## Cluster Reviews

### Batch A1 — Aging / Health / Statement (closed, green)
- 6 files migrated, 7 call-sites routed.
- File-level Reuse: 100% (no new repos).
- Method-level: 1 reused (`findById`) + 6 added under existing aggregates (`getAging`, `getHealthScore`, `getStatement` on customer + supplier repos).
- Vitest 1187/1187, audit clean, tsc clean.

### Batch A2 — Read-only Reuse cluster (stopped on Zero-Extend gate)

Per the success criterion **"0 new methods"**, an upfront audit of the 12 targeted files against existing repository surfaces was performed before any migration. Result:

| File | Existing method covers it? | Verdict |
|------|---|---|
| `components/reports/AgingReport.tsx` | No — needs unpaid-invoices join with customers | Reclassify → Extend |
| `components/reports/GeographicReport.tsx` | No — customers + invoices per governorate | Reclassify → Extend |
| `components/reports/InactiveCustomersReport.tsx` | No — inactive-cutoff filter absent on `customerRepository` | Reclassify → Extend |
| `components/reports/IncomeStatementReport.tsx` | No — 4 parallel period reads | Reclassify → Extend |
| `components/reports/InventoryFlowReport.tsx` | Partial — `listStockMovements` exists; missing `products`+`product_stock` shape | Reclassify → Extend |
| `components/reports/ProfitabilityReport.tsx` | No — three period aggregates | Reclassify → Extend |
| `components/reports/TrialBalanceReport.tsx` | No — COA + journal_entries posted filter | Reclassify → Extend |
| `components/customers/details/CustomerPinnedNote.tsx` | No — `customerRepository` only exposes `createNote` | Reclassify → Extend |
| `components/suppliers/hero/SupplierPinnedNote.tsx` | **Yes** — `supplierRepository.listNotes(id)` already returns rows sorted is_pinned desc; component selects first pinned client-side | **Reuse ✓ (migrated)** |
| `components/suppliers/SupplierActivityTab.tsx` | No — wider OR with PO/payment subselects; `findActivities` is narrower | Reclassify → Extend |
| `components/suppliers/SupplierProductsTab.tsx` | No — needs `purchase_order_items` aggregation | Reclassify → Extend |
| `components/suppliers/SupplierRatingTab.tsx` | No — needs `profiles:created_by(full_name)` join not in `listNotes` | Reclassify → Extend |

**A2 outcome (treated as Inventory-accuracy issue, not design failure):**

| Metric | Value |
|---|---|
| Files migrated | 1 / 12 |
| New methods added | 0 |
| New repositories | 0 |
| New exception categories | 0 |
| Public Repository API changes | 0 |
| Audit hits removed | 1 |
| Vitest | green |
| Reclassifications | 11 (Reuse → Extend) |

**Inventory headline delta** (Reuse + Extend stays at 90.9% — distribution shift only, no boundary shift):

| Class | Before A2 | After A2 |
|---|---:|---:|
| Reuse | 53 | 42 |
| Extend | 17 | 28 |
| New | 3 | 3 |
| Exception | 4 | 4 |

**Repository Growth Review (A2)**

| Repository | Methods before | Methods after | Read | Write | Aggregate(s) | Drift? |
|---|---:|---:|---:|---:|---|---|
| `supplierRepository` | 19 | 19 | 11 | 8 | supplier | No |

**Extension Distribution (cumulative through A2)**

| Repository | +Methods cumulative |
|---|---:|
| `customerRepository` | +3 (A1: `getAging`, `getHealthScore`, `getStatement`) |
| `supplierRepository` | +3 (A1: `getAging`, `getHealthScore`, `getStatement`) |
| any (A2) | +0 |

**Repository API Regression Check (A2)**

| Repository | Signature changes | Backward compatible? | Outside-cluster callers needing edits |
|---|---:|---|---:|
| `supplierRepository` | 0 | n/a | 0 |

After Batch A2: a follow-up Extend-focused cluster (proposed A3) covers the 11 reclassified files, grouped by aggregate to minimise repo touches.

## Gate A (unchanged from plan, restated with new wording)
> **Baseline inventory (77 files / 192 strict method hits) → 0 unjustified direct accesses**, measured by `scripts/audits/check-data-access.sh`. The number is not a fixed constant — it is whatever the audit script reports on `main`. Single-line vs multiline writing styles produce the same answer.

## Phase A2.5 — Step 1 POC Results (`supplierQueryService`)

**Framing:** Validation experiment. Question under test: *Does the UI need a Read Model separation, or was the Repository sufficient?* The Query Layer is not committed by these results — only Step 1 has been executed.

### Scope executed
3 supplier-domain files. Read paths only; mutations untouched.

### File outcomes

| File | Outcome | Path taken |
|---|---|---|
| `src/components/suppliers/SupplierActivityTab.tsx` | ✅ Migrated via QueryService | `supplierQueryService.listActivity(id)` — composes `activity_logs` over id-sets from `purchase_orders` + `supplier_payments` (3-bucket OR clause) |
| `src/components/suppliers/SupplierProductsTab.tsx` | ✅ Migrated via QueryService | `supplierQueryService.listAggregatedProducts(id)` — composes `purchase_orders` → `purchase_order_items` → `products` with per-product aggregation |
| `src/components/suppliers/SupplierRatingTab.tsx` | ⛔ **Halt triggered** → migrated via existing Repository (Reuse) instead | `supplierRepository.listNotes(id)` + `supplierRepository.createNote(...)` |

### Halt details (File 3 — `SupplierRatingTab.tsx`)

**Trigger:** Stop Condition #3 ("A read already exists on `supplierRepository` and would need to be duplicated") combined with Stop Condition #2 ("QueryService method ends up being a thin wrapper over `supabase.from('x').select('*')`").

**Diagnosis:**
1. The original UI selected `supplier_notes` with `profiles:created_by (full_name)` — but **there is no foreign key from `supplier_notes.created_by` to `profiles`** (verified in `src/integrations/supabase/types.ts`: only `supplier_notes_supplier_id_fkey` and `supplier_notes_tenant_id_fkey` exist).
2. The join was therefore non-functional. The UI never read the joined field — it hard-codes `<span>{'مستخدم'}</span>` for the author label.
3. With the dead join removed, the read shape is identical to `supplierRepository.listNotes(id)` (modulo cosmetic sort order: repo orders `is_pinned desc, created_at desc`; the rating tab previously ordered `created_at desc` only). Pinned-first ordering on the rating tab is acceptable.
4. Building `listNotesWithAuthor` in the query service would therefore be a Shadow Repository: a pure pass-through duplicating an existing repo read.

**Diagnosis category:** **Inventory misclassification.** The A2 reclassification marked this file as `Extend` because it visually contained a join. The join was dead code — the file is genuinely **Reuse**.

### Files added / changed

| Path | Change |
|---|---|
| `src/lib/queries/supplierQueryService.ts` | **New** — 2 methods, 2 exported view interfaces. |
| `src/components/suppliers/SupplierActivityTab.tsx` | Edited — query swap, removed `supabase` import. |
| `src/components/suppliers/SupplierProductsTab.tsx` | Edited — query swap, removed `supabase` import. |
| `src/components/suppliers/SupplierRatingTab.tsx` | Edited — query + mutation swap to `supplierRepository`, removed `supabase` import. |
| `src/lib/repositories/supplierRepository.ts` | **Untouched** (zero changes). |

### A. Complexity reduction

| File | `supabase.from()` before → after | Data-fetch LOC in component before → after | Data-shape LOC in component before → after | Data-layer imports before → after |
|---|---:|---:|---:|---:|
| `SupplierActivityTab.tsx` | 1 → 0 | 11 → 2 | 0 → 0 | 1 (`supabase`) → 1 (`supplierQueryService`) |
| `SupplierProductsTab.tsx` | 2 → 0 | 28 → 2 | 30 → 0 | 1 (`supabase`) → 1 (`supplierQueryService`) |
| `SupplierRatingTab.tsx` | 2 → 0 | 14 → 2 | 0 → 0 | 1 (`supabase`) → 1 (`supplierRepository`) |

Net complexity reduction in **3/3 files** (target was ≥2/3).

### B. QueryService quality

| Metric | Value | Target | Pass |
|---|---:|---:|:-:|
| Methods that are pure pass-throughs to one table with no join/aggregation | 0 | 0 | ✅ |
| Methods duplicating an existing `supplierRepository` read | 0 | 0 | ✅ |
| Methods containing business validation / permission / calculation | 0 | 0 | ✅ |
| Methods >60 LOC | 0 (both ≤ 45) | flag | ✅ |
| Max tables touched per method | 3 (`listAggregatedProducts`, `listActivity`) | flag if >4 | ✅ |

### C. Duplication audit

| Check | Value | Target | Pass |
|---|---:|---:|:-:|
| Two code paths returning the same read shape (repo + query) | 0 | 0 | ✅ |
| Shared filter logic copy-pasted between repo and query | 0 | 0 | ✅ |

### D. Architectural integrity

| Check | Value | Target | Pass |
|---|---:|---:|:-:|
| Repository public API changes | 0 | 0 | ✅ |
| New repositories | 0 | 0 | ✅ |
| Business logic moved into query service | 0 | 0 | ✅ |
| New exception categories | 0 | 0 | ✅ |
| Audit hits removed (3 files × supabase.from calls) | 5 (1 + 2 + 2) | ≥3 | ✅ |
| `queryKeys.ts` top-level scopes added | 0 | 0 | ✅ |

### E. Quality gates

| Check | Result |
|---|---|
| Vitest | 1187 / 1187 ✅ |
| `tsc --noEmit` | clean ✅ |
| `scripts/audits/check-data-access.sh` | 3 target files no longer report hits ✅ (overall script exits non-zero against the rest of the baseline — unchanged posture) |

### Review questions

**Q1 — Did any UI need a shape the query service couldn't express cleanly?**
No for File 1 and File 2. For File 3, the *original* shape (notes joined with author) **could not** be cleanly expressed because the FK doesn't exist; the join was always dead code. The repository's existing shape was both correct and sufficient.

**Q2 — Did any method drift toward business rules / shadow-repository behaviour?**
No, after halting File 3. The two surviving query methods both touch ≥2 tables and perform either id-set composition or aggregation. Neither contains business validation or pricing/permission logic. They are pure read projections.

**Q3 — Is the added file/method count proportionate to the readability/duplication win?**
Yes for the supplier domain at this scale: 1 new file, 2 new methods, ~60 lines of view-shape code removed from components, 5 direct `supabase` references retired. The wins concentrate on `SupplierProductsTab` (aggregation-heavy) and `SupplierActivityTab` (multi-table composition). For files where the read is a single-table select with no join/aggregation, the Query Layer cannot earn its cost — File 3's halt demonstrates this empirically.

### Step 1 → Step 3 mapping

Per the plan's decision table:

- **Measurement A** passed in 3/3 files (target was ≥2/3) — ✅
- **Measurements B, C, D, E** all clean — ✅
- One halt was triggered, but the halt resolved cleanly to **Reuse via existing repo**, which is consistent with the architecture (it removed a misclassified Extend, not a real Query Layer need).

**Recommended Step 3 outcome: 3A with one explicit caveat.** Proceed to `reportsQueryService` (Step 2) — the Query Layer hypothesis is validated where reads are genuinely composed (joins, aggregation, multi-aggregate id-set composition). **Caveat:** every candidate file for Step 2 must first be audited against existing repo methods exactly the way File 3 was audited here; any file whose "join" disappears under scrutiny belongs in Reuse, not the Query Layer. Inventory accuracy is the binding constraint, not Query Layer scope.

**Step 2 is not auto-started.** Per the hard rules, this requires explicit review and approval before any new file is touched.
