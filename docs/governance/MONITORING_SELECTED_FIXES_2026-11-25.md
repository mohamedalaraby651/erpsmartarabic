# Selected monitoring findings — 2026-11-25

## Rules and scope
1. A saved quotation must not remain unsaved or reappear as a local draft unless it is genuinely changed afterwards.
2. A company logo stored as a private file path must be resolved to a usable image URL wherever displayed.

Only findings `c5b871b4-03b9-5d3a-9f6f-5419ec5e5b6c` and `ed078948-d17f-510b-8573-67398e69c788` were changed. No schema, permission, financial rule, or settled-record edits. Related issues are not silently included.

## Current-code audit
Checked means source read or runtime exercised, not inferred from a filename.

| Surface / code path | Source result |
| --- | --- |
| Quotations desktop dialog and mobile wizard (`QuotationFormDialog`) | Both compose the same save and draft lifecycle. Confirmed missing saved line checkpoint; fixed by checkpointing items, discount and VAT together. Real edits still arm protection/autosave and disable printing. |
| Shared document form, unsaved guard and local autosave (`useDocumentFormExperience`, `useUnsavedChangesGuard`, `useFormDraft`) | Obey their supplied dirty flags. Clearing storage does not by itself mark an open form pristine; quotation caller corrected, shared contracts unchanged. |
| Sales-order, purchase-order, payment, expense and journal dialogs | Successful saves clear the draft and close the dialog; journal also clears entries. No equivalent stay-open recurrence found in these success paths. |
| Goods-receipt, delivery-note and purchase-invoice dialogs | Successful submissions clear drafts, reset and close. |
| Credit-note dialog | Successful save clears draft, resets and closes. |
| Customer and product dialogs | Success clears drafts and closes. |
| Invoice dialog | Separate implementation stays open with `useFormDraft` enabled in create mode and default `autoSave=true`; appears affected by recurring draft storage even when pristine. Outside selected findings: left unchanged, separate question asked. |
| Quotation repository create/update | Resolves only after header and item writes succeed; no local draft/dirty-state responsibility. Unchanged. |
| Company settings mini invoice preview (`CompanyInfoSection`) | Confirmed bare path used directly; now uses existing `useBrandingLogo` and waits for resolution. |
| Logo uploader (`LogoUpload`) | Persists durable path and resolves current preview via `useBrandingLogo`. Unchanged. |
| Invoice, quotation, sales-order and purchase-order print views | All pass raw settings into `PrintTemplate`, which resolves via `useBrandingLogo`; existing resolution found. |
| Export-center live preview | Separate asset-ID implementation: `usePdfAssetUrl` resolves the asset repository file path through `useSignedStorageUrl`. No direct company-logo path rendered. |
| Individual PDF generation | `getCompanySettings` resolves `logo_url` through `getStorageUrl` before image loading. |
| Bulk invoice PDF, customer/supplier statement PDF | Both read the resolved company settings through `getCompanySettings`. |
| Workspace Excel | Lazy wrapper delegates to the same `getCompanySettings`; image loading receives resolved settings. |
| Background jobs/database functions | These findings concern browser-local draft state and browser image sources; no job/database function is changed or claimed verified. |

## Evidence
- Before changes: logo tests failed on bare saved/uploaded path; quotation tests reproduced beforeunload protection, recreated draft after six seconds, and printing enabled despite changed lines.
- After changes: 8 focused tests passed (five new regressions plus three shared document-form tests).
- Full suite: **1748 passed, 5 skipped; 186 test files passed, 1 skipped**.
- Latest preview build: **build OK**.
- Authenticated live flow: selected actual customer/product, saved new quotation, waited 6.1 seconds, confirmed no quotation draft key, closed without confirmation, read new number in list, reopened new form without a restore offer.
- Only the newly created verification quotation was removed through existing UI; all pre-existing quotations untouched.
- Settings: actual stored company logo loaded (`naturalWidth > 0`) on desktop and 393×708 mobile. Newly uploaded path and removal covered by tests without changing company settings or uploading files.
- No browser page errors during the live verification.
- Screenshots inspected under `/tmp/browser/monitoring-fixes/`; temporary, not user deliverables.

No claim of supplier/other print live verification, mobile quotation save verification, or resolution of the separate invoice concern.