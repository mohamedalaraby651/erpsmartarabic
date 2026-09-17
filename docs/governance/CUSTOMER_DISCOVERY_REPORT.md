# CUSTOMER_DISCOVERY_REPORT — OPA-CUST-001

Status: DISCOVERY COMPLETE (no acceptance claim)

## Routes
- `/customers` → `src/pages/customers/CustomersPage.tsx`
- `/customers/:id` → `src/pages/customers/CustomerDetailsPage.tsx` (Customer 360, wrapped in `CustomerErrorBoundary`)

## Data access authorities (reused, not recreated)
- `src/lib/repositories/customerRepository.ts` — `findAll(filters, sort, page)`, `getStats()`, `update()`
- `src/lib/repositories/customerSearchRepo.ts` — prefetch customer + addresses
- Facade: `src/application/queries/customers.ts` (pure re-export, ADR-0028)
- Hooks: `useCustomerList`, `useInfiniteCustomers`, `useCustomerFilters`, `useCustomerMutations`,
  `useBulkSelection`, `useCustomerExport`, `useCustomerAlerts`, `useCustomerDetail`,
  `useCustomerNavigation`, `useUpcomingReminders`
- Permissions: `verifyPermissionOnServer('customers', 'edit')` (server-side, unchanged)

## Existing UI capabilities found (not rebuilt)
- Customer 360: Hero header + KPI cards + smart alerts + pinned note + health badge + 17 lazy tabs
  (basic-info, notes, reminders, invoices, quotations, orders, payments, credit-notes, financial,
  statement, aging, communications, analytics, activity, attachments)
- Mobile detail experience: `CustomerMobileProfile`, `CustomerIconStrip`, `CustomerSectionsSheet`,
  `CustomerCompressedHeader`, pull-to-refresh
- Shared primitives reused: `ui/table`, `ui/popover`, `HighlightText`, `useListShortcuts`,
  `ShortcutsHelp`, `FilterDrawer`, `DataTableActions`

## Schema fields actually available on `customers`
id, name, customer_type, vip_level, category_id, phone, phone2, email, tax_number, credit_limit,
current_balance, notes, is_active, created_at, updated_at, tenant_id, governorate, city,
discount_percentage, contact_person, contact_person_role, payment_terms_days,
preferred_payment_method, facebook_url, website_url, last_transaction_date,
total_purchases_cached, invoice_count_cached, last_activity_at, price_list_id, last_communication_at

## Gaps identified in discovery
- No `customer_code` column → "Code" column impossible (DATA-GAP)
- No sales representative relation → column impossible (DATA-GAP)
- `category_id` only, no joined category name in list read (DATA-GAP)
- No Contacts / Addresses / Audit tab data surfaces beyond existing basic-info addresses (DATA-GAP)
- Alert filtering across all pages requires a server-side query contract change (STOP CONDITION)

## Behavioural defects confirmed pre-change
1. Sort key selection also inverted direction unintentionally
2. Quick filter silently discarded manual filters
3. Fixed bulk action bar overlapped the last row
4. Mobile/desktop divergence: no search highlight and different sort toggle on mobile
5. Desktop list used `div` rows, not table semantics (no `aria-sort`, no header sorting)
