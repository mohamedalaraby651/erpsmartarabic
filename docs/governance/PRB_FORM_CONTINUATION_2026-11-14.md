# PRB remaining-work continuation — document forms

## Scope implemented
- Purchase orders: tenant/user/document-scoped seven-day local drafts, restore/discard banner, guarded closing, Ctrl+S validation and draft cleanup after successful existing mutation.
- Expenses: same draft/close/save experience, inline validation and saving indicator on both desktop and mobile.
- Purchase-order supplier selection now marks the header dirty; changes confined to line items also protect closing.
- Shared form experience can reveal a wizard step before attempting invalid-field focus.
- Purchase-order list has app-specific head metadata.

## Verification
- Full Vitest suite: **1720 passed, 5 skipped**, 177 test files passed, one skipped.
- Focused draft/form tests: **7 passed** (including three new regression cases).
- Latest automatic build signal: **build OK**, 2026-11-14 02:45:12 UTC.
- Authenticated Playwright: expense draft with amount 125 and notes saved locally, page reloaded, restore banner used and notes read back; purchase-order notes followed the same flow.
- Both forms showed a leave confirmation after editing. Ctrl+S on the purchase order marked missing supplier invalid.
- Desktop 1280×1800 and mobile 390×844 inspected. Mobile forms and restoration banner rendered; no page horizontal overflow or page errors.
- A repeated browser run required waiting for tenant/account initialization; checks succeeded after readiness wait. Changing viewport closes/remounts the adaptive dialog; the mobile check reopened it explicitly.
- Browser scripts/screenshots are ephemeral under `/tmp/browser/document-continuation/`.

## Boundaries
No financial document was submitted during browser verification. No database, permission, financial calculation or posting rules were changed. Remaining credit-note/logistics forms, report/statement/audit coverage, print contexts and financial C5 work remain open in the roadmap.