# OPA-CUST-UI-005 — G0 Baseline and Contract Discovery

Status: VERIFIED BASELINE / NOT HUMAN ACCEPTED / NOT CERTIFIED  
Date: 2026-09-19

## Scope guard
- Customers workspace only.
- No database, RLS, migration, permission, role, finance, inventory, or transition changes.
- Data path remains Page → customer hooks/query facade → repositories → existing read models.

## Baseline
Playwright against `/customers`, viewport height 1800 CSS px:

| Width | Rows observed | Navigation/settle | Page overflow |
|---:|---:|---:|---:|
| 360 | mobile cards (no table rows) | auth/content wait exceeded the 15s probe | none |
| 768 | 15 | 1326ms | none |
| 964 | 15 | 1290ms | none |
| 1280 | 15 | 1232ms | none |

Screenshots are temporary verification evidence under `/tmp/browser/customer-workspace-baseline/`.

## Contract discovery
- Existing global customer search covers name, phone, alternate phone, email, tax number, contact person, city, and governorate.
- `customers` exposes no `customer_code` and no sales-representative field in the generated read contract. Both are DEFERRED; no substitute field or schema change is authorized.
- Authoritative list filters already run repository-side through `applyCustomerColumnFilters`; UI-only filtering is not accepted for server-wide counts.
- Existing customer filter picker reads remain RLS-governed and tenant-scoped by the current backend policies.
- Existing metrics allowed for presentation: stored balance, stored purchase cache, activity timestamps, and existing RPC-backed health/aging reads. No new UI calculation is authorized.

## G0 decision
- IMPLEMENT: Batch A table header integration, command-search interactions, adaptive existing filters, bounded customer-name/city options, active-filter recovery states.
- DEFER: customer code, sales representative, Batch B productivity, Batch C Customer 360 changes.
- STOP: virtualization without profiling; server-wide select-all; pagination architecture changes; any new financial metric or backend authority.