# OPA-UI-001 — Execution Record (Table Header Semantics & Filter Options)

- Contract: `OPA-UI-001` (P0 operational UI defect, inserted before Phase 6)
- Verdict: **EXECUTED — PASS, NOT CERTIFIED** (certification is a human decision)
- Scope discipline: UI/presentation only. No domain, ledger, payment, stock,
  tenant, permission, RLS or migration surface was touched. Smart Freeze intact.

## 1. Defect and root cause

Reported symptom: on `/invoices` the column titles stacked vertically at the
right of the grid instead of forming a header row.

Root cause (confirmed by live DOM inspection before the fix: `thead th = 0`,
`thead td = 1`): `src/components/ui/data-table-header.tsx` returned a `<div>`.
A `<div>` placed inside `<tr>` is foster-parented out of the table by the HTML
parser, so every column title rendered outside the grid.

Secondary defects confirmed in the same surface:
- `SelectItem value=""` (Radix rejects empty values) in three places.
- Header row in `InvoicesPage` used `TableCell` (`<td>`) for the selection box.
- `ProductsPage` double-wrapped `DataTableHeader` in `TableHead`.
- Base `TableHead` used physical `text-left` instead of logical `text-start`
  (wrong default under RTL).
- Six list screens wrapped an already-scrollable `Table` in a second
  `overflow-x-auto` container (double horizontal scrollbar).

## 2. Changes

| File | Change |
| --- | --- |
| `src/components/ui/data-table-header.tsx` | returns `<TableHead>`; exports `ALL_FILTER_VALUE='__all__'`; select filter maps that sentinel to "no filter" |
| `src/components/ui/table.tsx` | `TableHead` default alignment `text-left` → `text-start` (RTL-correct) |
| `src/pages/invoices/InvoicesPage.tsx` | header selection cell `TableCell` → `TableHead`; removed redundant scroll wrapper |
| `src/pages/products/ProductsPage.tsx` | removed redundant `TableHead` wrapper around `DataTableHeader`; removed redundant scroll wrapper |
| `SalesOrdersPage`, `QuotationsPage`, `PurchaseOrderTable`, `PaymentsPage` | removed redundant scroll wrapper |
| `src/components/export/ExportWithTemplateButton.tsx` | `SelectItem value=""` → `"__default__"` sentinel, mapped back to empty on change |
| `src/pages/admin/UsersPage.tsx` | `SelectItem value=""` → `"__none__"` sentinel, mapped back to `null` on change |
| `scripts/fitness/check-table-header-semantics.mjs` (new) | guard: non-cell element in a header row, `<td>` inside `thead`, empty `SelectItem` value |
| `scripts/fitness/run-all.mjs` | guard registered as ACTIVE (enforcing) |

## 3. Project-wide sweep

The new guard scans every `.tsx` under `src/`. After the fixes it reports
**PASS** — no remaining non-cell element in a header row, no `<td>` inside
`thead`, no empty `SelectItem` value anywhere in the project. One initial hit
(`table-skeleton.tsx`) was a false positive (`Skeleton` nested *inside* a
`TableHead`); the guard now tracks open header cells and no longer flags it.

## 4. Evidence (live, authenticated session, localhost:8080)

DOM counts per screen after the fix — `thead th` / `thead td` / body rows:

| Route | th | td | rows |
| --- | --- | --- | --- |
| `/invoices` | 10 | 0 | 22 |
| `/sales-orders` | 7 | 0 | 11 |
| `/quotations` | 7 | 0 | 8 |
| `/purchase-orders` | 7 | 0 | 7 |
| `/products` | 7 | 0 | 18 |
| `/payments` | 8 | 0 | 21 |

- Screenshot of `/invoices` shows a single header row above the columns.
- Sorting verified live: clicking a header sort control reorders the body rows.
- No page-level horizontal overflow: `scrollWidth = clientWidth = 1280`.

## 5. Checks

- `typecheck-app`: `total=0 platform=0 project=0` — **PASS**
- `fitness run-all`: `active=34 pending=9 failures=0` — **PASS**
  (active count rose 33 → 34 with the new guard)

## 6. Findings not in scope

- `UI-OBS-001` (breadcrumb raw route segments) and `UI-OBS-002` (console
  warnings) remain open observations from OPA-JRN-001; untouched here.
