# F1-A — Execution Record (Pages → Application)

- Authorization: F1-A AUTHORIZED under `F1_SCOPE_001-R2`, hash `e8ec2359fe4521967aba4d46f77711c047eb4bc4a58e3e0b36ea8db4727c7fe8`.
- Mutation type: **import-only redirects + pure re-export facades (ADR-0028)**. No business logic, no repository, no query service, no domain/finance/RLS/permission change.
- Certification: **NOT CLAIMED.**

## 1. Approved edges eliminated (4/4)

| ID | File | Edge removed | Target surface |
|---|---|---|---|
| F1-001 | `src/pages/pricing/PriceListsPage.tsx` | → `@/lib/repositories` (barrel) | `@/application/queries/price-lists` |
| F1-002 | `src/pages/quotations/QuotationDetailsPage.tsx` | → `@/lib/repositories` (barrel) | `@/application/queries/quotations` + `@/application/queries/activity-logs` |
| F1-003 | `src/pages/suppliers/SupplierPaymentsPage.tsx` | → `@/lib/repositories/supplierPaymentRepository` | `@/application/queries/supplier-payments` |
| F1-004 | `src/pages/tasks/TasksPage.tsx` | → `@/lib/repositories` (barrel) | `@/application/queries/tasks` |

Imported symbols are unchanged (`priceListRepository`, `PriceListRow`, `PriceListItemRow`, `legacyQuotationsRepository`, `activityLogsRepository`, `supplierPaymentRepository`, `tasksRepository`, `TaskRow`). No call site, argument, or render path was modified.

## 2. Facades created (4, pure re-export)

| Facade | Provenance |
|---|---|
| `src/application/queries/price-lists.ts` | ← `src/lib/repositories/priceListRepository.ts` |
| `src/application/queries/tasks.ts` | ← `src/lib/repositories/tasksRepository.ts` |
| `src/application/queries/supplier-payments.ts` | ← `src/lib/repositories/supplierPaymentRepository.ts` |
| `src/application/queries/activity-logs.ts` | ← `src/lib/repositories/activityLogsRepository.ts` |

Reused without change: `@/application/queries/quotations`. Barrel `src/application/queries/index.ts` extended by 4 namespace exports per existing convention. Each facade is a single `export *` line; zero implementation.

## 3. Checkpoint

| Check | Required | Result |
|---|---|---|
| approved edges eliminated | 4/4 | **4/4** |
| unrelated edges in scoped files | unchanged | unchanged (no other import touched) |
| new repository edges | 0 | **0** |
| new UI → Supabase edges | 0 | **0** (`pages→supabase-client` 29 → 29) |
| new cycles | 0 | **0** (6 → 6) |
| UI cycles | 0 | **0** |
| tsgo / typecheck-app | PASS | **PASS** — total 0 / platform 0 / project 0 |
| build | PASS | **PASS** (26.9s) |
| fitness | PASS | **PASS** — 33 active / 9 pending / 0 failures |
| dep-graph | PASS | **PASS** — 1216 modules |

### Metric delta

| Metric | Before | After |
|---|---:|---:|
| import layer violations | 155 | **151** |
| `pages→repositories` | 11 | **7** |
| `components→repositories` | 41 | 41 |
| `pages→supabase-client` | 29 | 29 |
| `components→supabase-client` | 38 | 38 |
| `hooks→supabase-client` | 31 | 31 |
| cycles / UI cycles | 6 / 0 | 6 / 0 |
| Vitest | 1619 pass / 5 skip | **1619 pass / 5 skip** |

## 4. STOP conditions encountered

None. No item required business logic, a new repository, a query service, a domain/finance change, an RLS/migration change, a permission change, a behaviour change, an out-of-scope file, or a non-ADR-0028 facade.

## 5. Disclosed DELTA (outside F1)

`PRE-TS-001` recurrence **#9** — the platform regenerated `src/integrations/supabase/previewAuthStorage.ts` mid-batch and reintroduced `TS7011`. Containment re-applied. This is **not** F1 remediation and is **not** counted toward F1 success. RISK-008 remains OPEN.

## 6. Verdict

**F1-A checkpoint = PASS.** F1-B (33 edges) is unlocked by the standing authorization; execution not started.
