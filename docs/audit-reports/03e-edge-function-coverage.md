# Edge Function Coverage Audit

This report compares deployed edge functions in `supabase/functions/` with their actual usage in the frontend and configuration in `supabase/config.toml`.

## Orphan functions
*Deployed but never called from frontend or DB cron.*

- **export-customers**: No invocations found in `src/` or `supabase/migrations/`.
- **event-dispatcher**: Configured and deployed, but no active call sites found in application logic (referenced in admin UI for history viewing only).

## Missing in config.toml
*Function folder exists but no entry found in `supabase/config.toml` (missing `verify_jwt` setting).*

- **render-pdf**: Folder exists and is actively called from the frontend, but missing from configuration.
- **export-customers**: Folder exists but missing from configuration.

## Called from frontend but missing function
*Broken invocations where the code attempts to call a non-existent function.*

- **None**: All `supabase.functions.invoke` calls in the frontend have a corresponding directory in `supabase/functions/`.

---

### Appendix: Detailed Invocations

| Function Name | Invocation Site |
|--------------|-----------------|
| **og-image** | `src/lib/seo/ogImage.ts:49` |
| **log-event** | `src/lib/runtimeTelemetry.ts:106` |
| **log-event** | `src/lib/pdf/diagnostics/telemetryFlush.ts:38` |
| **process-payment** | `src/lib/api/secureOperations.ts:120` |
| **verify-totp** | `src/components/auth/TwoFactorSetup.tsx:67,92,116` |
| **create-journal** | `src/lib/repositories/journalRepository.ts:138` |
| **create-journal** | `src/lib/financial-engine/journal.service.ts:56` |
| **approve-invoice** | `src/components/invoices/InvoiceApprovalDialog.tsx:65` |
| **restore-backup** | `src/components/admin/useRestoreBackup.ts:245` |
| **rollback-restore** | `src/components/admin/useRestoreBackup.ts:364` |
| **render-pdf** | `src/hooks/useEnqueuePdfExport.ts:26` |
| **validate-invoice** | `src/lib/api/secureOperations.ts:82` |
| **approve-expense** | `src/lib/api/secureOperations.ts:166` |
| **stock-movement** | `src/lib/api/secureOperations.ts:210` |

**Note on merge-customers**: This function is defined in `supabase/config.toml` but the directory `supabase/functions/merge-customers` does not exist. However, the frontend currently uses a Postgres RPC (`merge_customers_atomic`) instead of an edge function, so there are no broken invocations.
