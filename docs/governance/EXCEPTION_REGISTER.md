# Exception Register

Any deviation from a rule in the Master Execution Contract must be registered here with an owner and an expiry. An unregistered deviation is a defect.

| ID | Rule / Boundary | File or Scope | Reason | Risk | Owner | Expiry | ADR | Approval |
|---|---|---|---|---|---|---|---|---|
| ~~EXC-001~~ (CLOSED — resolved in Wave 1 Unit 1 by a pure return-type annotation; typecheck clean) | Green typecheck required before a wave gate | `src/integrations/supabase/previewAuthStorage.ts` (TS7011 ×2, PRE-TS-001) | Platform-protected auto-generated file; narrow tsconfig exclusion proved ineffective (file is transitively imported), and broad relaxation would hide app-owned errors | Low — typecheck signal only; `vite build` passes, zero runtime impact | Human Governance | Wave 2 gate (or on next platform regeneration of the file, whichever comes first) | — | Pending human approval |

## Rules

- An exception is time-boxed. "No expiry" is not an acceptable value.
- An expired exception becomes a defect and is scheduled in the Risk backlog.
- An exception that touches a Class D area (ledger, payments, stock, tenancy, permissions, RLS, migrations) requires an ADR reference and explicit human approval.
- Closing an exception requires evidence that the underlying deviation is gone, recorded in `PROGRESS_LOG.md`.
