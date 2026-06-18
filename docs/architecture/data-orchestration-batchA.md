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
| `src/components/customers/details/CustomerPinnedNote.tsx` | Reuse | customer | customerRepository | 1 | 0 | 0 |
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
| `src/components/reports/AgingReport.tsx` | Reuse | report | reportsRepository | 1 | 0 | 0 |
| `src/components/reports/GeographicReport.tsx` | Reuse | report | reportsRepository | 2 | 0 | 0 |
| `src/components/reports/InactiveCustomersReport.tsx` | Reuse | customer | customerRepository | 1 | 0 | 0 |
| `src/components/reports/IncomeStatementReport.tsx` | Reuse | report | reportsRepository | 4 | 0 | 0 |
| `src/components/reports/InventoryFlowReport.tsx` | Reuse | inventory | inventoryRepository | 3 | 0 | 0 |
| `src/components/reports/ProfitabilityReport.tsx` | Reuse | report | reportsRepository | 3 | 0 | 0 |
| `src/components/reports/TrialBalanceReport.tsx` | Reuse | report | reportsRepository | 2 | 0 | 0 |
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
| `src/components/suppliers/SupplierActivityTab.tsx` | Reuse | supplier | supplierRepository | 1 | 0 | 0 |
| `src/components/suppliers/SupplierFormDialog.tsx` | Reuse | supplier | supplierRepository | 2 | 0 | 0 |
| `src/components/suppliers/SupplierImportDialog.tsx` | Reuse | supplier | supplierRepository | 2 | 0 | 0 |
| `src/components/suppliers/SupplierPaymentDialog.tsx` | Reuse | supplier | supplierRepository | 1 | 0 | 0 |
| `src/components/suppliers/SupplierProductsTab.tsx` | Reuse | supplier | supplierRepository | 2 | 0 | 0 |
| `src/components/suppliers/SupplierRatingTab.tsx` | Reuse | supplier | supplierRepository | 2 | 0 | 0 |
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

## Batch A1 scope (executed only after this inventory is approved)

Single cluster, ~9 files:
1. `customers/details/CustomerAgingReport.tsx`
2. `customers/charts/AgingDonutChart.tsx`
3. `customers/details/CustomerHealthBadge.tsx`
4. `customers/details/StatementOfAccount.tsx`
5. `suppliers/tabs/SupplierAgingReport.tsx`
6. `suppliers/charts/SupplierAgingChart.tsx`
7. `suppliers/hero/SupplierHealthBadge.tsx`
8. `suppliers/tabs/SupplierStatementTab.tsx`
9. Add `// repo-exception:` markers to the 4 exception files above.

After Batch A1: run audit + Vitest + ESLint + `tsc --noEmit`, compute real Reuse/New rates, then decide whether to continue with the rest of Batch A or stop.

## Gate A (unchanged from plan, restated with new wording)
> **Baseline inventory (77 files / 192 strict method hits) → 0 unjustified direct accesses**, measured by `scripts/audits/check-data-access.sh`. The number is not a fixed constant — it is whatever the audit script reports on `main`. Single-line vs multiline writing styles produce the same answer.
