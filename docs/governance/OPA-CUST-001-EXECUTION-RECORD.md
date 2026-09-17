# OPA-CUST-001 — Customers Workspace (Execution Record)

Status: **IMPLEMENTED / VERIFIED — NOT HUMAN ACCEPTED — NOT CERTIFIED**
Scope: `/customers` list workspace UI only. Smart Freeze remains ACTIVE outside this scope.

## 1. Discovery findings
- Route `/customers` → `src/pages/customers/CustomersPage.tsx`; details `/customers/:id` → `CustomerDetailsPage.tsx` (17 lazy tabs already present: basic-info, notes, reminders, invoices, quotations, orders, payments, credit-notes, financial, statement, aging, communications, analytics, activity, attachments).
- Data access already layered: UI → `hooks/customers/*` → `lib/repositories/customerRepository.ts` → Supabase. No direct DB access in the customer list UI.
- Desktop list was `div`-based (`CustomerListRow`), no table semantics, no aria-sort, no column reorder/reset.
- Column preferences already persisted in `localStorage` key `customer-visible-columns` (no new persistence architecture added).
- Reusable capabilities found and reused instead of rebuilt: `useListShortcuts` (keyboard ownership guard + row-activation contract), `ShortcutsHelp`, `HighlightText`, `CustomerSavedViews`, `CustomerStatsBar`, `CustomerAlerts*`, `useBulkSelection`, `useInfiniteCustomers`, `useCustomerExport`, `ui/table`.

## 2. Files changed
- `src/pages/customers/CustomersPage.tsx` — semantic table branch on desktop, sticky filter region, keyboard shortcuts, shortcuts help, bulk-bar space reservation, sort-picker semantics fixed.
- `src/components/customers/list/CustomerColumnSettings.tsx` — show/hide + reorder + reset defaults, ordered visible list, new optional columns (email, tax number, contact person).
- `src/components/customers/list/CustomerPageHeader.tsx` — search available on desktop too; search region tagged for the `/` shortcut.
- `src/lib/repositories/customerRepository.ts` — search now also matches `phone2`, `tax_number`, `contact_person`, `city` (existing columns only).
- `src/integrations/supabase/previewAuthStorage.ts` — typing fix for `setItem`/`removeItem` (build blocker).
- `src/__tests__/unit/hooks/useTableLayout.test.ts` — expectation updated for the existing `summaryCollapsed` presentation field.

## 3. Files added
- `src/components/customers/list/CustomerTable.tsx` — presentation-only customers table.

## 4. Files removed
- None. `CustomerListRow` retained (still exported) — no unrelated cleanup performed.

## 5. Features implemented
Semantic table (`<table>` + `aria-sort` + caption), sortable headers (name, balance, credit limit, last activity, purchases, created at), column show/hide + reorder + reset, search highlighting (visual only), row click opens the customer only when the click is not on an interactive child, hover/focus row actions (invoice, payment, WhatsApp, edit), selection + bulk actions with reserved space, keyboard shortcuts `/ N R Esc ؟` under the existing guard contract, sticky filter region, status shown with a shape + text (not colour alone).

## 6. Intentionally not implemented
- No new Query Service, no repository contract change, no new caching, no virtualization.
- Customer 360 page left as-is this batch (tabs/aggregations already exist); no header/summary rework performed.
- No import/duplicate-detection backend work.

## 7. DATA-GAPs
- **Customer code** — no `code`/`customer_code` column on `customers`; column omitted, not invented.
- **Sales representative** — no representative field on `customers`; column omitted.
- **Category name** — only `category_id` is on the row model; category shown via filters only.
- Tabs *Contacts / Addresses / Audit* have no dedicated backing capability; existing tabs used instead.

## 8. Out-of-scope findings (recorded, not acted on)
- `handleQuickFilter` silently resets manual filters.
- Alert-type filtering applies to loaded pages only (infinite scroll).
- `CustomerListRow` is now redundant on desktop and can be retired in a later batch.

## 9. Architecture impact
None. No new UI→Supabase access, no business/financial logic in UI, no schema/RLS/permission/migration changes, no tenant boundary change.

## 10. Verification results (actually executed)
- `npx tsgo --noEmit -p tsconfig.app.json` — clean.
- `npx vitest run src/` — 1632 passed / 2 failed → both failures were the `summaryCollapsed` expectation; after the test update `useTableLayout.test.ts` passes 3/3.
- Live check (Playwright, 1280px, authenticated): table renders 15 rows with headers الاسم/النوع/VIP/الهاتف/المحافظة/الرصيد/آخر نشاط/الحالة/إجراءات; search narrows to 11 rows with 17 highlighted matches; `؟` opens the shortcuts dialog; `Esc` closes it; selecting a row shows the bulk toolbar; page horizontal overflow = 0; no new console errors.

## 11. Known limitations
- Customer 360 improvements deferred to a follow-up batch.
- Column order/visibility remains device-local (localStorage), by design.
- Keyboard row-to-row arrow navigation not added in this batch.

---

## Addendum — Behavioral corrections batch (same authorization)

**Changed files (this addendum):**
- `src/pages/customers/CustomersPage.tsx` — quick filter now announces that it replaces manual status/VIP/type filters (`toast.info`) instead of resetting them silently; mobile sort chips toggle asc/desc instead of always resetting to asc; `searchQuery` passed to the mobile view.
- `src/components/customers/list/CustomerMobileView.tsx` — new `searchQuery` prop forwarded to cards.
- `src/components/customers/list/CustomerListCard.tsx` — visual-only `HighlightText` on the customer name (parity with desktop table).
- `src/integrations/supabase/previewAuthStorage.ts` — TS7011 build fix (async `setItem`/`removeItem`).
- `.lovable/plan.md` — corrected from CANDIDATE/NOT AUTHORIZED to EXECUTED status.

**Customer 360:** not rebuilt. Discovery confirmed it already provides `CustomerHeroHeader`, `CustomerFinancialSummary` (totals, outstanding, credit limit, DSO/CLV computed outside the UI) and 17 lazy tabs. Per the contract ("do not rebuild what exists"), no mutation was applied there.

**Verification actually run (this addendum):**
- `npx tsgo --noEmit -p tsconfig.app.json` → clean.
- `npx vitest run src/` → 161 files passed, 1634 tests passed, 5 skipped, 0 failed.
- `npx vite build` → built in 18.94s, 0 errors (pre-existing chunk-size warnings only).
- `npx eslint` on the 5 touched customer files → 0 errors, 19 pre-existing warnings.
- Runtime (Playwright): 1280px → 15 rows, search "م" → 17 highlights, 0 horizontal overflow; 360px → 15 cards, search narrows to 6, 0 horizontal overflow; no new console errors.

**Known limitations:** mobile name highlight only renders when the match is in the name (phone/email/tax matches are not highlighted); alert-type filtering still applies to loaded pages only (server-side change = STOP CONDITION); `CustomerListRow` remains unused on desktop pending a separate cleanup batch.

**Baseline commit at execution time:** `38d7e9d8c5b474fe06fc36d73f46d3039cc3f58e` (working-tree changes are committed by the platform after this turn).

Status: IMPLEMENTED / VERIFIED — NOT HUMAN ACCEPTED — NOT CERTIFIED.
