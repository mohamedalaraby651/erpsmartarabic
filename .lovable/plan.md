# Track B — Hooks Parity & Inline Query Purge

Eliminate raw `@/integrations/supabase/client` imports from the 8 listed pages by building the missing repository + hook layers and rewiring the views. No business-logic, RPC, or schema changes.

## 1) Repositories (`src/lib/repositories/`)

All methods wrap errors with `mapRepoError` (Arabic copy), respect tenant context implicitly via RLS, and use `Database` typed rows.

- **`treasuryRepository.ts`** — new
  - `listCashRegisters()` → `cash_registers` (active first, ordered by name)
  - `getCashRegister(id)` and `listCashTransactions(registerId, { from?, to? })`
  - `getTreasuryBalances()` — aggregate balances by register
  - `createSupplierPayment(input)` — thin wrapper delegating to existing `supplierService.recordSupplierPayment` to preserve the atomic balance RPC contract (no logic rewrite)
- **`inventoryRepository.ts`** — new
  - `listWarehouses()`, `getWarehouse(id)`, `deleteWarehouse(id)`
  - `listStockMovements(filters)` (warehouse, product, date range)
  - `getInventoryLevels(filters)` from `product_stock` joined to products
- **`expenseRepository.ts`** — extend existing file
  - Add `listCategoriesFull()`, `getExpenseById(id)`; keep current `list/stats/create/update` intact (already canonical)
- **`adminRepository.ts`** — extend existing file
  - `getAuditTrail(filters)` from `audit_trail`
  - `getActivityLog(filters)` from `activity_logs`
  - `getSystemMetrics()` from `performance_metrics` + `rate_limits` + `rate_limit_config`
  - `getRolePermissions(roleId)` (consolidates existing helper)
  - `getDashboardCounters()` — profiles/roles/low-stock/overdue invoices aggregates used by `AdminDashboard`
- **`approvalRepository.ts`** — new
  - `listPendingApprovals(filters)` from `approval_records` with joiner relations
  - `executeApprovalAction(id, action, note?)` — UPDATE status only (server triggers handle side effects)

## 2) Custom Hooks (`src/hooks/<domain>/`)

Each hook uses `queryPresets`, exports a barrel `index.ts`, and binds mutations to `queryClient.invalidateQueries` for sibling queries. Errors surface via `useMutationToast` (Arabic via `mapRepoError`).

- `src/hooks/treasury/` — `useCashRegisters`, `useCashRegister(id)`, `useCashTransactions(id, range)`, `useTreasuryBalances`, `useCreateSupplierPayment`
- `src/hooks/inventory/` — `useWarehouses`, `useStockMovements(filters)`, `useInventoryLevels`, `useDeleteWarehouse` (invalidates `['warehouses']`, `['inventory-levels']`)
- `src/hooks/expenses/` — `useExpenses(filters)`, `useExpenseStats`, `useExpenseCategories`, `useCreateExpense`, `useUpdateExpense` (invalidate `['expenses']`, `['expense-stats']`)
- `src/hooks/admin/` — `useAuditTrail`, `useActivityLog`, `useSystemMetrics`, `useRolePermissions`, `useAdminDashboardCounters`
- `src/hooks/approvals/` — `usePendingApprovals(filters)`, `useExecuteApprovalAction` (invalidates `['approvals']`)

Caching presets:
- realtime → approvals list, activity log (latest)
- operational → cash transactions, stock movements, expenses, audit trail
- standard → warehouses, registers, role permissions, dashboard counters
- reference → expense categories
- report → system metrics, treasury balances

## 3) Page Rewires (purge `@/integrations/supabase/client`)

For each file: remove the import, swap each `supabase.from(...)` block for the hook above, route mutation errors via `mapRepoError` toast.

- `TreasuryPage.tsx` → `useCashRegisters`, `useCashTransactions`
- `CashRegisterDetailsPage.tsx` → `useCashRegister`, `useCashTransactions`
- `SupplierPaymentsPage.tsx` → already on repo; only ensure mutation path uses `useCreateSupplierPayment`
- `InventoryPage.tsx` → `useWarehouses`, `useDeleteWarehouse` (with proper invalidation)
- `ExpensesPage.tsx` → `useExpenses`, `useExpenseStats`, `useCreateExpense`
- `ApprovalsPage.tsx` → `usePendingApprovals`, `useExecuteApprovalAction`
- `AuditTrailPage.tsx` → `useAuditTrail`
- `ActivityLogPage.tsx` → `useActivityLog`
- `AdminDashboard.tsx` → `useAdminDashboardCounters`
- `MetricsPage.tsx` → `useSystemMetrics`

Scope guard: only the listed pages. Other inline-Supabase pages (platform, settings, reports, etc.) stay untouched in this wave.

## 4) Baseline Protection

- Preserve every existing function signature consumed elsewhere
- Keep tenant context flowing via RLS (no explicit `tenant_id` filter changes)
- Run `bunx vitest run` after each domain merge; restore green before continuing
- No edits to `src/integrations/supabase/{client,types}.ts`, `supabase/config.toml`, or any migration

## Out of scope
- New tables, RPCs, RLS, or edge functions
- UI redesign beyond minimal hook-driven loading/error states
- Migrating non-listed pages
- Modifying the `supplierService.recordSupplierPayment` atomic RPC chain

## Deliverables
- 4 new + 2 extended repository files
- 5 new hook folders with `index.ts` barrels
- 10 page rewrites (zero `supabase` import remaining in the 8 listed views)
- `bunx vitest run` → 1187+ passing
