# Selected security remediation

Scope: five user-selected deep-scan findings only. No other finding changed or ignored.

## Rules
- Journal accounts, cost centers, projects and departments must belong to the journal's company.
- Customer and supplier balances must not be changed by arbitrary direct requests.
- Restoring one company must not overwrite another company's records or trust unapproved fields.

## Checked surfaces
- `create-journal`: authentication/role checks existed; dimension ownership was missing. Added tenant-filtered lookup before writes and explicit entry tenant stamping.
- Manual journal repository/UI flow: calls `create-journal`; uses the corrected validation.
- Direct journal-entry writes and privileged writers: new database guard validates parent tenant, account and optional dimensions on insert/reference changes. No backfill or updates to existing entries.
- `process-payment`: customer helper is invoked through its trusted service client. Preserved service execution; removed browser/anonymous execution on that helper only.
- Supplier dialog, treasury repository and supplier service: browser inserts payment then calls supplier balance helper. Immediate revocation would break legitimate payments after insertion; left unchanged pending approved replacement.
- Backup restore: table whitelist and caller authentication exist; supplied fields are spread wholesale and upsert conflicts on global identifier. Confirmed both selected restore issues; left unchanged pending approval of field/restore workflow restrictions.
- Restore rollback: reads server-created private snapshot, deletes only matching tenant and uses insert rather than conflicting upsert. Reviewed related path; no new caller-controlled upsert fix required for this selected finding.
- Background/database paths: live helper definitions/grants and journal-entry triggers read. No claim of exhaustive unrelated financial-function review.

## Verification
- 6 journal reference tests: each dimension rejects absent foreign identifiers, own identifiers allowed/deduplicated, optional identifiers allowed, lookup failure not accepted.
- Security test folder: 173 passed across 11 files.
- Authenticated backend: customer helper returns permission denied; invalid journal project rejected with permission error from new database guard.
- Valid new unposted test journal line saved and read back; only newly created test lines/journal deleted afterwards.
- Live grants: authenticated=false, anonymous=false, trusted service=true for customer helper.
- Migration applied: `0011_restrict_customer_balance_helper_and_journal_dimensions`.
- Latest preview build OK. No existing balances, posted journals or settled documents changed.

## Pending
Three selected findings remain active: supplier balance bypass and two backup restore vulnerabilities. Need approval for atomic supplier-payment replacement and stricter restore contract; no claim they are fixed.