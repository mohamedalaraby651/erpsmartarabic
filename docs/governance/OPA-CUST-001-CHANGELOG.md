# OPA-CUST-001-CHANGELOG

Status: IMPLEMENTED / VERIFIED — NOT HUMAN ACCEPTED — NOT CERTIFIED

## Added
- `src/components/customers/list/CustomerTable.tsx` — semantic desktop `<table>` (caption, `aria-sort`,
  sticky header, tabular-nums numeric cells, status pill = dot + text (not colour alone),
  `HighlightText` on name/phone/email/tax number, row-activation contract, hover/focus row actions,
  alert badges, error row markers)
- `docs/governance/OPA-CUST-001-EXECUTION-RECORD.md`
- `docs/governance/CUSTOMER_DISCOVERY_REPORT.md`
- `docs/governance/OPA-CUST-001-CHANGELOG.md`
- `docs/governance/OPA-CUST-001-VERIFICATION.md`
- `docs/governance/OPA-CUST-001-SCOPE-DIFF.md`

## Changed
- `src/pages/customers/CustomersPage.tsx` — keyboard shortcuts (`CUSTOMER_SHORTCUTS` + `ShortcutsHelp`
  under the existing Guard Contract), header-driven sort (`asc → desc → none`), quick filter now
  announces via `toast.info` that it replaced manual filters, bulk bar reserves `h-24` spacer
  (never obscures the last row), desktop renders `CustomerTable`
- `src/components/customers/list/CustomerColumnSettings.tsx` — 15 columns, show/hide, reorder
  (`move`), reset to defaults; same `customer-visible-columns` storage key (presentation only)
- `src/components/customers/list/CustomerPageHeader.tsx` — search passed on both mobile and desktop
- `src/components/customers/mobile/CustomerMobileView.tsx` — forwards `searchQuery`
- `src/components/customers/list/CustomerListCard.tsx` — highlights matched name on mobile
- `src/lib/repositories/customerRepository.ts` — search `.or` widened to existing columns only:
  name, phone, phone2, email, tax_number, contact_person, city, governorate
- `src/pages/customers/CustomerDetailsPage.tsx` — Customer 360 tab strip is now sticky and labelled
  (`aria-label="أقسام ملف العميل"`); no data, tab set, or flow changes
- `src/integrations/supabase/previewAuthStorage.ts` — build fix only (TS7011: async `setItem`/`removeItem`)
- `src/hooks/__tests__/useTableLayout.test.ts` — expectation updated for `summaryCollapsed`
- `roadmap.md`, `.lovable/plan.md` — status records

## Removed
- None. `CustomerListRow.tsx` is now redundant on desktop but deliberately retained for a separate
  cleanup batch (out of scope here).
