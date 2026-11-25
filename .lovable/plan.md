# Complete the three remaining selected security fixes

## Confirmed issues
Direct supplier balance adjustment remains callable by signed-in users. The current supplier-payment screen depends on that helper, so simply disabling it would interrupt payment recording.

Backup restore accepts entire supplied rows and can overwrite another company's existing identifier during upsert. Restricting fields and conflicts will reject backups previously accepted.

## Approval requested
Approve the following workflow-sensitive changes together; the two completed fixes remain in place regardless.

1. **Supplier payments:** replace browser-side payment-plus-balance writes with one authorized, company-scoped atomic payment operation. Disable direct supplier balance adjustment after switching all current callers. Preserve the existing role permissions and amount/date behavior.
2. **Restore fields:** define per-table approved backup fields, validate input types and references, and assign server-managed identity/company fields on the server. Reject unapproved fields rather than silently persisting them; show a clear restore validation report.
3. **Restore isolation:** validate the full selected restore before any destructive action. Reject identifiers already belonging to another company and use an atomic database-enforced company check for conflicts, preventing races. Preserve same-company append/upsert/replace semantics for allowed fields, with existing confirmation and snapshot safeguards.
4. **Verification:** test legitimate supplier payment, rejection/replay/rollback, supported backup restores, forbidden fields and foreign identifiers. Use temporary records only; do not rewrite existing balances or settled records. Mark only the remaining three selected findings fixed after verification.

## Technical approach
- Keep the existing UI → Contract → Query → Repository boundaries and no new runtime dependencies.
- Use tenant-scoped database transactions for supplier recording and restore conflict authority; app-internal server logic uses existing authenticated TanStack patterns.
- Audit supplier dialog and treasury callers together; retire the old supplier helper's browser grants only when the replacement is wired.
- Maintain existing restore endpoint rather than introducing a new edge endpoint; keep database-level enforcement effective for privileged writes.
- Add focused regression tests alongside existing security tests, run the security suite, and check actual signed-in allowed/denied paths.

## Acceptance
All three selected vulnerabilities removed without changing existing role permissions, backups, balances, posted entries or settled documents. Unsupported or unsafe edited backups receive an explicit rejection before any restore writes.