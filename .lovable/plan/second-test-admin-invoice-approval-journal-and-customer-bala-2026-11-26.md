# Second test admin, invoice approval journal, and customer balance after payment

No business data is deleted or changed unless you approve it separately (see step 4).

## 1) Second test admin
- Create `abofhdalaraby+nazraqa2@gmail.com` the same way as the first test admin: random password, email confirmed, `admin` role in the default company, linked to the default company. Public signup stays as it is.
- Check afterwards: email confirmed, admin is the only role, default company link exists. You set the password with "Forgot password".

## 2) Approving INV-202611-327 with the second admin — findings
- Permission checks pass: the second account is an admin and did not create the invoice (the first test admin did). The invoice is "pending", so it can be approved.
- **One problem blocks the journal entry:** the step that creates the automatic journal entry looks for an open accounting period using a "status" field. The accounting periods table has no such field; it records closing with "is closed" instead. So every automatic journal entry from approval fails silently right now. The approval is still saved, but no journal entry is created. No automatic journal entry has been created since April 24.
- Everything else checked: the 2026 fiscal year is open, and accounts 1100 (receivables) and 4000 (revenue) exist. The invoice has no tax, so no tax account is needed.
- **Fix:** change the open-period check to "period not closed". No other change.

## 3) Why customer B's balance stayed 200 — root cause confirmed
- The payment was saved and the invoice shows 10 paid. Then the payment function calls the balance-reduction step. That step looks up the signed-in user's company, but the payment function runs on the server with no signed-in user. The step fails with "No tenant context", and the function ignores that error on purpose ("Don't fail"). So the balance was not reduced.
- This affects every payment recorded through this function, not just this one. It is the only place that calls this step.
- **Fix:** the balance step gets an optional company value. The server function passes the invoice's company, and the step still checks that the customer belongs to that company. Calls from signed-in users keep using their own company, so no one gains access to another company.

## 4) Existing records (needs your approval, not done automatically)
- Customer B's balance will stay 200, not 190, until it is corrected. INV-202611-327 has no journal entry yet; approving it after the fix will create one.
- Optional one-time correction: reduce customer B's balance by 10 for PAY-20261126-0009. I will do this only if you say so.

## Technical details
- Migration: in `post_document_atomic`, replace `AND status = 'open'` with `AND NOT is_closed` (it is the only function with this error).
- Migration: `atomic_customer_balance_update(_customer_id, _amount, _tenant_id uuid DEFAULT NULL)`. Use `_tenant_id` only when `auth.uid()` is null (server/service caller); otherwise `get_current_tenant()`. Keep the `tenant_id` match and the NOT FOUND exception. EXECUTE grants stay as they are.
- `supabase/functions/process-payment/index.ts`: pass `_tenant_id: tenantId`; redeploy.
- Add small tests for the period check and balance step if the existing test setup allows; run the security tests.
