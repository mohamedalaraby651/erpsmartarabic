# OPA-CUST-001-VERIFICATION

Status: IMPLEMENTED / VERIFIED — NOT HUMAN ACCEPTED — NOT CERTIFIED
Date: 2026-09-17 (UTC)

## Commands actually executed

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsgo --noEmit -p tsconfig.app.json` | clean, exit 0 |
| Tests | `npx vitest run src/` | 161 files passed / 1 skipped; 1634 passed / 5 skipped / 0 failed |
| Build | `npx vite build` | success in 18.98s (only pre-existing chunk-size advisory) |
| Lint (scoped) | `npx eslint src/pages/customers/CustomerDetailsPage.tsx src/components/customers/list/CustomerTable.tsx` | 0 errors, 8 warnings (7 pre-existing; the 1 new aria-label warning was removed by reverting that attribute) |

## Runtime proof (Playwright, authenticated session, 1280×1800)
- `/customers`: 15 semantic table rows rendered
- Row click navigates to `/customers/b1000001-…-0002` (Customer 360)
- Customer 360 renders 15 tab triggers, tab strip now sticky
- Horizontal page overflow: 0 at 1280px
- Console errors (excluding pre-existing React ref warnings and the CSP meta notice): none

## Earlier batch runtime proof (unchanged, re-confirmed)
- 360px: 15 customer cards, search "م" narrows to 6, overflow 0
- 1280px: search "م" produces 17 visual highlights; highlighting does not change the query

## Not claimed
No certification, no human acceptance. Human Gate remains open.

## Batch 2 verification (executed 2026-09-17 02:41–02:45 UTC)
| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsgo --noEmit -p tsconfig.app.json` | clean, exit 0 |
| Tests | `npx vitest run src/` | 161 files passed / 1 skipped; 1634 passed / 5 skipped / 0 failed |
| Build | `npx vite build` | success in 20.21s |
| Lint (scoped) | `npx eslint CustomersPage.tsx CustomerErrorState.tsx useCustomerList.ts` | 0 errors, 11 warnings (all pre-existing categories: unused legacy imports, aria-label literal rule, exhaustive-deps) |

### Runtime proof (Playwright, authenticated)
- 1280px: 15 semantic rows, horizontal overflow 0
- Failure path: aborting `**/rest/v1/customers*` renders exactly one `role="alert"` error state
  reading "تعذّر تحميل قائمة العملاء …" with a retry control (previously an empty state was shown)
- 360px: customer cards render, horizontal overflow 0, screenshot captured
- Console errors (excluding pre-existing React ref warnings / CSP meta notice / aborted requests): none

## Not claimed
No certification, no human acceptance.
