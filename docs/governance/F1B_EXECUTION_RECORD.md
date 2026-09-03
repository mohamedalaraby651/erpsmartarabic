# F1-B — Execution Record (Components → Application)

- Authorization: F1-B AUTHORIZED under `F1_SCOPE_001-R2`, hash `e8ec2359fe4521967aba4d46f77711c047eb4bc4a58e3e0b36ea8db4727c7fe8`, after F1-A checkpoint PASS.
- Mutation type: **import-only redirects + pure re-export facades (ADR-0028)**. No business logic, no repository, no query service, no domain/finance/RLS/permission change.
- Certification: **NOT CLAIMED.**

## 1. Approved edges eliminated (33/33)

Each of the 33 items (`F1-005` … `F1-037`) was treated as an independent scope unit. Every edge was closed by an exact import redirect; identical repository targets were grouped behind the smallest possible number of facades.

| Repository (source of truth) | Facade | Items |
|---|---|---|
| `attendanceRepository` | `@/application/queries/attendance` (reused) | F1-005 |
| `creditNoteRepository` | `@/application/queries/credit-notes` (new) | F1-006, F1-022 |
| `customerRepository` | `@/application/queries/customers` (reused) | F1-007 |
| `customerRelationsRepo` | `@/application/queries/customer-relations` (new) | F1-008, F1-009 |
| `savedViewsRepository` | `@/application/queries/saved-views` (new) | F1-010, F1-035 |
| `employeeRepository` | `@/application/queries/employees` (new) | F1-011 |
| `expenseRepository` | `@/application/queries/expenses` (reused) | F1-012, F1-037 |
| `referenceRepository` | `@/application/queries/reference` (reused) | F1-013, F1-024 |
| `settingsRepository` | `@/application/queries/settings` (new) | F1-014, F1-016, F1-018, F1-020 |
| `purchaseOrderRepository` | `@/application/queries/purchase-orders` (reused) | F1-015, F1-021 |
| `legacyQuotationsRepository` | `@/application/queries/quotations` (reused) | F1-017, F1-023, F1-025 |
| `salesOrderRepository` | `@/application/queries/sales-orders` (reused) | F1-019, F1-028 |
| `reportsRepository` | `@/application/queries/reports` (new) | F1-026 |
| `reportTemplateRepository` | `@/application/queries/report-templates` (new) | F1-027 |
| `pdfAssetsRepository` | `@/application/queries/pdf-assets` (new) | F1-029 |
| `pdfProfilesRepository` | `@/application/queries/pdf-profiles` (new) | F1-030 |
| `attachmentsRepository` | `@/application/queries/attachments` (new) | F1-031 |
| `supplierRepository` | `@/application/queries/suppliers` (reused) | F1-032, F1-036 |
| `supplierRelationsRepo` | `@/application/queries/supplier-relations` (new) | F1-033, F1-034 |

Imported symbols, call sites, arguments and render paths are unchanged. Only the module specifier of the approved import statement was rewritten.

## 2. Facades created (11, pure re-export)

`credit-notes`, `customer-relations`, `saved-views`, `employees`, `settings`, `reports`, `report-templates`, `pdf-assets`, `pdf-profiles`, `attachments`, `supplier-relations`.

Provenance is declared in each file header (`facade ← repository`). Each is a single `export *` line, zero implementation. 8 existing facades reused. Barrel `src/application/queries/index.ts` extended by 11 namespace exports per existing convention.

## 3. Out-of-scope observations (NOT remediated)

5 `components → repositories` edges remain and are **not** F1 items: imports of `mapRepoError` from `@/lib/repositories/_base` in `CategoryFormDialog.tsx`, `CreditNoteFormDialog.tsx`, `ExpenseCategoryFormDialog.tsx`, `ExpenseFormDialog.tsx`, `QuotationFormDialog.tsx`. Plus 3 further non-F1 edges in the scanner bucket. `_base` is an error-mapping utility, not a read surface; wrapping it would require an architecture decision. Reported, untouched.

## 4. Checkpoint

| Check | Required | Result |
|---|---|---|
| approved edges eliminated | 33/33 | **33/33** |
| unrelated edges in scoped files | unchanged | unchanged |
| new repository edges | 0 | **0** |
| new UI → Supabase edges | 0 | **0** |
| new cycles | 0 | **0** (6 → 6) |
| UI cycles | 0 | **0** |
| tsgo | PASS | **PASS** (0 errors) |
| build | PASS | **PASS** (30.2s) |
| fitness | PASS | **PASS** — 33 active / 9 pending / 0 failures |
| dep-graph | PASS | **PASS** — 1227 modules |
| Vitest | no regression | **1619 pass / 5 skip** |

### Metric delta

| Metric | Before (post F1-A) | After F1-B |
|---|---:|---:|
| import layer violations | 151 | **118** |
| `components→repositories` | 41 | **8** |
| `pages→repositories` | 7 | 7 |
| `components→services` | 5 | 5 |
| `pages→supabase-client` | 29 | 29 |
| `components→supabase-client` | 38 | 38 |
| `hooks→supabase-client` | 31 | 31 |
| cycles / UI cycles | 6 / 0 | 6 / 0 |

## 5. STOP conditions encountered

None. No item required business logic, a new repository, a query service, a domain/finance change, an RLS/migration change, a permission change, a behaviour change, an out-of-scope file, or a non-ADR-0028 facade. No item was BLOCKED.

## 6. Disclosed DELTA (outside F1)

`PRE-TS-001` recurrence **#10** — the platform regenerated `src/integrations/supabase/previewAuthStorage.ts` and reintroduced `TS7011`. Containment (the standing two return-type annotations) was re-applied through the defined containment mechanism only. This is **not** F1 remediation and is **not** counted toward F1 success. RISK-008 remains OPEN.

## 7. Verdict

**F1-B checkpoint = PASS.** Next step is **F1-C consolidated verification (verification-only)**, then Human Governance Review, then the certification decision. No further mutation is requested or performed.
