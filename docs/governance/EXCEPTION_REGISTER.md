# Exception Register

Any deviation from a rule in the Master Execution Contract must be registered here with an owner and an expiry. An unregistered deviation is a defect.

| ID | Rule / Boundary | File or Scope | Reason | Risk | Owner | Expiry | ADR | Approval |
|---|---|---|---|---|---|---|---|---|
| _(none)_ | | | | | | | | |

## Rules

- An exception is time-boxed. "No expiry" is not an acceptable value.
- An expired exception becomes a defect and is scheduled in the Risk backlog.
- An exception that touches a Class D area (ledger, payments, stock, tenancy, permissions, RLS, migrations) requires an ADR reference and explicit human approval.
- Closing an exception requires evidence that the underlying deviation is gone, recorded in `PROGRESS_LOG.md`.
