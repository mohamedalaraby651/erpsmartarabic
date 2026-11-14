# Logistics document form continuation

## Implemented scope
- Goods receipts, delivery notes and purchase invoices now compose the canonical form lifecycle with user/tenant-scoped local drafts, seven-day retention, restore/discard banner, guarded close and Ctrl+S.
- Existing create hooks and payload construction/filtering remain unchanged. No database or posting rules changed.
- Successful existing save clears the local draft; failures remain in the form with error feedback. The canonical submission lock prevents concurrent submits.
- Logistics item editor is controlled by parent state: restoring/resetting lines updates visible values immediately instead of leaving a stale second copy.
- Mobile line inputs stack vertically, have accessible names and 44px touch targets. Dialogs use the existing responsive bottom sheet.
- Footer was deliberately kept in document flow after screenshot inspection revealed sticky buttons covering line inputs on a 393×708 phone.
- Goods-receipt and delivery-note list metadata added.

## Verification
- New regression tests: five passed, covering controlled restore/reset/edit/delete and three document draft restoration flows without invoking create.
- Full test suite: 1725 passed, five skipped; 179 files passed and one skipped.
- Final focused run after footer correction: five passed.
- Latest automatic build: build OK at 2026-11-14 02:57:00 UTC.
- Authenticated browser checks on all three forms: select a real product, enter quantity 7 and notes, wait for local save, trigger close protection, reload, restore and read quantity/notes back.
- Desktop 1280×1800 and mobile 393×708 inspected; no horizontal page overflow or browser page errors. Mobile screenshots confirm visible product and restored numeric values with no footer covering inputs.
- No create/post/cancel operation was submitted during these checks. Browser evidence is ephemeral under `/tmp/browser/logistics-continuation/`.

## Still open
Credit-note local restoration is not implemented: it must reconcile selected invoice-item quantities with fresh server returnability and prices before use. Report/statement/audit, print contexts and financial C5 tasks remain open in the roadmap. This continuation does not certify those workflows.