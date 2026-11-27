# Selected monitoring fixes — 2026-11-27

## Rules in user terms
- Authorized users must be able to check selected customers for open invoices before bulk deletion, without viewing another company's obligations or bypassing deletion protections.
- An authorized viewer must receive a fresh private-file link when previewing or downloading an attachment; stored paths and expired links are not working download links.

## Places checked by reading current code
| Place | Result |
| --- | --- |
| CustomersPage → useCustomerMutations → customerRepository | Bulk deletion calls the obligation RPC, stops on blockers/errors, and retains its permission check. Unchanged. |
| Database batch_validate_delete | Confirmed authenticated EXECUTE missing and former definition lacked tenant scope. Replaced with authenticated identity, derived tenant, delete permission, same-tenant customer/invoice filters; anonymous execution remains denied. |
| Database customer deletion policies | Existing checks remain unchanged; this fix grants validation access, not deletion authority. |
| Database log_bulk_operation | Authenticated EXECUTE already present. The report's audit-grant claim does not match current state; no changes. |
| FileUpload / AttachmentUploadForm | Both store tenant-prefixed paths, not permanent signed URLs. No changes. |
| AttachmentsPage | Confirmed raw path passed to fetch/window.open. Now signs at action time; failed HTTP downloads rejected. |
| AttachmentsList | Previously signed at list loading with unsafe raw-path fallback; long-lived pages could retain expired links. Now signs at each preview/download, fails closed, and preserves stored paths for deletion. |
| CustomerTabAttachments | Delegates upload and viewing to shared controls. Receives shared fix. |
| EmployeeDetailsPage | Delegates viewing to AttachmentsList. Receives shared fix. |
| ProductDetailsPage (desktop/mobile) | Both use AttachmentsList. Receive shared fix. |
| SupplierDetailsPage (desktop/mobile) | Both use AttachmentsList. Receive shared fix. |
| InvoiceDetailsPage (desktop/mobile) | Both use AttachmentsList. Receive shared fix; invoice records untouched. |
| QuotationDetailsPage (desktop/mobile) | Both use AttachmentsList. Receive shared fix. |
| SalesOrderDetailsPage (desktop/mobile) | Both use AttachmentsList. Receive shared fix. |
| PurchaseOrderDetailsPage (desktop/mobile) | Both use AttachmentsList. Receive shared fix. |
| Settings DocumentsSection | Uses shared profile attachment upload/list. Receives shared fix. |
| Attachments query facade / repository | Row deletion boundary only; no alternate preview/download. Unchanged. |
| PDF Jobs / Export Center / render-pdf | Separate PDF-job links, not attachment rows or documents upload paths. Current render-pdf is enqueue-only, no file URL producer to exhibit this regression. Unchanged. |
| Background callers of batch_validate_delete | Current source and function-reference search found no callers beyond customerRepository. |

## Verification and limits
- Applied migration 0019; live definition and grants read back: authenticated true, anon false. No business DML.
- Signed-in browser on Customers: five real customer IDs checked; two open-invoice blockers returned without errors; nonexistent ID returned zero records. No delete executed.
- 24 tests passed: customer bulk-validation boundary (3), private signing (3), existing customer workflow (18).
- Signed-in Attachments page displayed two real rows; preview generated a signed documents URL. Actual object request returned 404 NoSuchKey. Existing missing objects were not repaired or replaced.
- Preview and download controls passed with only GET file bytes substituted; authentication, rows, and signed-link issuance stayed real. This is not proof that existing missing files can be downloaded.
- Latest preview build log: OK.
- Frontend changes require publishing; the scoped validation change is already applied to the database.
- No customers, invoices, attachments, settled records, or settings changed during verification.