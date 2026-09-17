# OPA-CUST-001-SCOPE-DIFF

## In scope and executed
- `/customers` list UI: semantic table, sorting, column controls, search coverage, highlight,
  shortcuts, bulk-bar spacing, mobile/desktop consistency
- `/customers/:id` Customer 360: presentation-only sticky + labelled tab strip
- Repository search predicate widened to existing columns (read filter only, no contract change)

## Explicitly NOT touched (HARD BOUNDARY respected)
- database schema, migrations, RLS, tenant isolation
- roles / permissions / SoD (`verifyPermissionOnServer` untouched)
- financial, accounting, pricing, credit, invoice, payment, journal logic
- domain authorities, application services, new Query Services, new repositories
- invoices page, OPA-UI-003 boundaries, OPA-TBL-001 generalization
- global state, PWA/offline, design system replacement
- unrelated modules, mass rename/format/cleanup

## Architecture check
- No new `supabase` import inside customer list/filter/table components
- No business logic or financial calculation added in React
- Data path preserved: Page → hooks → application facade → repository → Supabase

## DATA-GAPs (recorded, not fabricated)
1. `customer_code` does not exist → no Code column
2. No sales representative relation → no Representative column
3. `category_id` without joined name in list read → no Category label column
4. No Contacts / Addresses / Audit tab data surfaces beyond existing addresses in basic-info

## STOP CONDITIONS (halted, not worked around)
1. Alert filtering across all pages requires a server-side query contract change → NOT executed

## Batch 2 delta
- In scope executed: list error state + retry, alert-filter transparency notice, sticky Customer 360
  tab strip, unused import removal in the page
- Still NOT executed: alert filtering across the full dataset (STOP CONDITION — needs a server-side
  query contract change), Code / Sales-Representative / Category-name columns (DATA-GAPs),
  Contacts / Addresses / Audit tabs (DATA-GAP)
- `CustomerListRow.tsx` still present and unreferenced by the page; deletion deferred to a separate
  cleanup batch to keep this batch's diff minimal
