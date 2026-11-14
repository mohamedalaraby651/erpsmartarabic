# Plan: finish all 8 batches of the requirements file (PRB-NAZRA-002)

The work runs as one continuous build, in order. Each batch has its own acceptance check before the next one starts, so a problem in one batch doesn't spill into the others. Batch 1 is already done.

## Execution order and why
1. Batches 2–4 change only screens and display, with low risk and high daily value.
2. Batch 5 is the sensitive financial batch. It runs only after a backup and your explicit approval.
3. Batches 6–8 cover printing, navigation, and mobile. They build on the parts made in 2–4.

## Batch 2 — Amounts in Egyptian pounds everywhere
- One way to show amounts in every table, card, and report:
  - Thousands separator.
  - Minus sign for negatives.
  - "-" for zero.
  - Short numbers like 1.45M on cards, with the full number on hover.
- PDF files and Excel exports switch from the Saudi riyal to the Egyptian pound.
- An "eye" button at the top hides balances as ••••.
- Acceptance: the customers, invoices, receipts, dashboard, and statement-of-account screens show the same format.

## Batch 3 — Tables
- The current invoices-screen improvements roll out to customers, suppliers, items, receipts, and purchases:
  - Row density.
  - Show or hide columns.
  - Header stays visible while scrolling.
- Quick filter buttons with counts (All / Due / Paid / Drafts).
- A count on the filter button, plus a "Clear filters" button.
- Advanced filters apply as soon as you pick them.
- The first column stays fixed on the right and the actions column on the left.
- "Load more" at the bottom replaces page numbers. You choose the batch size (10/25/50/100).
- A totals row fixed under the table. Gray loading placeholders. Guided empty-state screens.
- A floating bar for actions on several selected rows.
- A document opens only from its number or name link. Quick copy icon next to codes.

## Batch 4 — Invoice and voucher forms
- Ctrl+S saves and Esc cancels. The save button turns into "جاري الحفظ..." and is locked to prevent saving twice.
- The cursor starts in the customer field. Enter/Tab moves from item to quantity, then to a new line.
- Totals update as you type. A fixed bottom bar shows two lines: Total ← Remaining.
- A quick customer card appears once you pick a customer (balance, credit limit, phone).
- Item code shows in gray under the item name. An expandable note under each line. Deleting a line asks for confirmation.
- Errors appear in red under the field. On save, the screen jumps to the first error.
- A warning appears if you try to leave with unsaved data.
- Saved drafts bar: "Restore / Delete draft".
- Actions menu "إجراءات ▾" on the document page.
- A vertical timeline of who created, edited, and approved the document.

## Batch 5 — Sensitive financial rules (needs your approval + a backup first)
- Cancelling a posted voucher creates an automatic reversing entry and marks the voucher "Cancelled". Nothing is deleted.
- Electronic approval requests from the manager for:
  - Going over a salesperson's discount cap.
  - A cash box going negative.
  - Reopening a closed period.
- A dedicated account for rounding differences, plus rounding to the nearest pound.
- An orange warning and confirmation when selling below cost.
- A tracking alert when price or quantity is zero.
- Tests for every rule (cap, rounding, reversal).

## Batch 6 — Printing (A4)
- A simple footer: page number, print date, and user. No signatures, no status badges, and the amount is not written out in words.
- Previous balance and final balance under the invoice.
- An in-app A4 preview before saving as PDF. Print is a manual button after saving.
- Excel export with a column picker and a header showing the company logo.

## Batch 7 — Navigation
- A task tabs bar for keeping several screens and drafts open.
- A clickable breadcrumb path.
- A full notifications center page.
- A sidebar that folds into icons (completed if partial).
- Quick period buttons in reports (today, week, month, quarter, year).
- The chart of accounts as a foldable tree. Search opens the tree and highlights the matching account.

## Batch 8 — Mobile
- Tables become compact cards that expand with an arrow.
- Side panels become a sheet that slides up from the bottom.
- Action buttons in a wide bottom bar, easy to reach with the thumb, with 44px touch targets.

## Final check
- Run all tests and screenshots at 360 / 768 / 1280 widths in right-to-left layout.
- Update the execution log and the plan.

## Open items (need your decision, don't block the plan)
- 361: what shows in the item list (stock and code).
- 362: highlighting main accounts in reports.
- 363: what the chart hover details show.

## Technical details
- A unified display layer: `src/lib/format/money.ts`, plus shared components (AmountCell, KpiValue, BalancePrivacyProvider, QuickFilterChips, LoadMoreFooter, StickyTotalsBar, DocumentActionsMenu, AuditTimeline, ResponsiveDrawer → Bottom Sheet on mobile).
- Tables: generalize the hooks from OPA-UI-003 (useListState + saved column preferences). Use server pagination with an "offset/limit" load-more. No virtualization without a performance measurement.
- Forms: generalize useFormDialog + useUnsavedChangesGuard + useHotkeys (Ctrl+S/Esc) + scrollToFirstError.
- Batch 5:
  - New tables `approval_requests` and an approval-reason column, each with GRANT + RLS + tenant_id check.
  - Atomic RPCs: `reverse_posted_voucher`, `request_approval`, `resolve_approval`.
  - Seed the "rounding differences" account in the Egyptian chart of accounts.
  - Unit tests for each financial rule.
  - Database backup before any migration. No hard deletes.
- PDF: switch DEFAULT_CURRENCY to EGP, add a simple footer, and remove status badges from the print template.
- Tabs: an in-memory/sessionStorage workspace store tied to TanStack Router with no new libraries.
- Each batch closes with an execution record in docs/governance and Playwright screenshots.
