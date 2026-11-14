# PRB C5 — Period reopening approval

Date: 2026-11-14 UTC
Status: IMPLEMENTED AND VERIFIED (first C5 unit only; C5 is not complete).

## Authorization
- Owner explicitly approved batch 5 subject to a backup.
- Owner confirmed downloading the current database export at 00:46 UTC. This is owner confirmation, not independent inspection of the export or a recovery test.
- At 00:48 UTC, owner chose the original voucher date for reversal. Cancellation must fail while that original period remains closed. This rule is documented; voucher cancellation is not implemented by this unit.

## Delivered
- Tenant-scoped period reopening request with mandatory reason.
- A manager resolves the request through an atomic database operation. Approval and opening happen together; the approval is consumed once.
- Direct opening without approval is rejected, even for a manager.
- Requesters can read their own requests; tenant managers can read requests for their tenant. Direct client mutations cannot grant approval.
- Existing approvals screen includes the financial requests and a closed-period request form. The period hook no longer opens directly.
- Existing approval records retain their prior handling; this unit does not claim to harden that legacy path.

## Evidence
- Applied migration: `drizzle/migrations/0009_financial_period_reopen_approval.sql`; function existence and SELECT policy read back from the database.
- Scoped Vitest: 34/34 passed across fiscal period repository, financial approval repository and existing payment workflow tests. The existing workflow tests do not verify live voucher cancellation.
- Signed-in browser flow: requested opening of an isolated empty period, observed the pending request, approved it, observed the period disappear from the closed list and the approved request read back in the UI.
- Database readback: `status=approved`, with equal resolution and consumption timestamps.
- Signed-in negative checks: replay rejected; direct reopening rejected; direct request mutation affected no rows; empty test period remained closed after the bypass attempt.
- Screenshots captured at 1280×1800 and 393×708; no console page errors or mobile page overflow observed. Evidence screenshots are temporary under `/tmp/browser/c5/`.
- Temporary empty period and its request were removed after testing. No real period was closed or reopened.
- Latest observed build signal: build OK at 00:51:36 UTC.

## Remaining C5 work — not delivered
- Voucher reversing entry, cancellation marker and consistent customer/supplier statements and totals, using original voucher date and preserving the original.
- Discount-cap and negative-cash exception requests and enforcement.
- Rounding-difference account and ledger posting, with nearest-pound rounding tests.
- Below-cost warning and confirmation; zero price/quantity tracking where applicable.
- Multi-tenant and non-manager live negative checks for all financial workflows.

No claim of full C5 completion, blanket RLS hardening, or tested backup recoverability is made.