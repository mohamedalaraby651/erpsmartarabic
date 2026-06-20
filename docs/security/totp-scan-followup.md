# TOTP Scan Follow-Up — Step 1 Pre-Flight

- **Date:** 2026-06-20
- **Trigger:** UX-2 Step 1 (Shared-Kernel Scaffolding) pre-flight gate.
- **Prior finding:** `user_2fa_settings_secret_columns_exposed` — column-level `SELECT` on `secret_key`, `secret_encrypted`, `backup_codes` previously granted to `authenticated` / `anon`.
- **Remediation applied in Step 0:** SQL migration `20260619195247_…` REVOKEd column-level SELECT from `authenticated` and `anon`. Access restricted to `service_role`.
- **Status:** Awaiting re-scan classification.

## Classification protocol

After the re-scan, this document MUST be closed in one of two ways before Step 2 (Domain) begins:

1. **False Positive** — re-scan reports no residual read path. Document the scanner artefact and close.
2. **Residual Read Path** — re-scan still surfaces a leak. Step 2 is **blocked** until a follow-up migration closes the path and a third scan confirms green.

## Re-scan result

- **Re-scan date:** 2026-06-20
- **Outcome:** **CLOSED — Residual path eliminated.**
- **Evidence:** Re-scan returned 71 findings, all of type `SUPA_authenticated_security_definer_function_executable` (unrelated SECURITY DEFINER lint warnings on other functions). Zero findings referenced `user_2fa_settings`, `secret_key`, `secret_encrypted`, `backup_codes`, `totp`, or `2fa`.
- **Linked migration:** `supabase/migrations/20260619195247_0e02527b-91ea-408e-8040-f3a1fe912e06.sql` (Step 0).
- **Closed by:** Step 1 pre-flight, UX-2 gate.
- **Step 2 (Domain) gate:** **UNBLOCKED** on the TOTP axis.

> Note: The remaining 71 `SECURITY DEFINER` warnings predate UX-2 and are tracked separately; they do not gate UX-2 progress and will be addressed under a dedicated DB-hardening backlog item.
