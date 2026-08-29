# Exception Register

Any deviation from a rule in the Master Execution Contract must be registered here with an owner and an expiry. An unregistered deviation is a defect.

| ID | Rule / Boundary | File or Scope | Reason | Risk | Owner | Expiry | ADR | Approval |
|---|---|---|---|---|---|---|---|---|
| ~~EXC-001~~ (CLOSED — superseded by EXC-002; the recurring TS7011 was resolved in Control 1 by annotating the actually-reported inner callback, and the typecheck is now clean at 0 diagnostics) | Green typecheck required before a wave gate | `src/integrations/supabase/previewAuthStorage.ts` (TS7011 ×2, PRE-TS-001) | Platform-protected auto-generated file; narrow tsconfig exclusion proved ineffective (file is transitively imported), and broad relaxation would hide app-owned errors | Low — typecheck signal only; `vite build` passes, zero runtime impact | Human Governance | closed | — | Closed with evidence (`scripts/audits/output/typecheck-app.json`) |
| EXC-002 (DORMANT — allowlist entry matches 0 diagnostics today) | Strict app typecheck applies to project-authored code only | `src/integrations/supabase/previewAuthStorage.ts` — error code `TS7011` only | Platform-owned generated artifact; the project owns consumption, not content (PRE-TS-001 §8). The exception is enforced mechanically by `scripts/audits/typecheck-app.mjs`, which fails on any project-owned diagnostic and only classifies this exact file+code pair as platform-owned | Low — bounded to one file and one error code; any other diagnostic still fails the gate | Frontend Platform Owner | Phase 1 gate, or on adoption of Option C (project-owned adapter port under BND-01) | ADR-0031 (R-BND-7) | Pending human approval |

## Rules

- An exception is time-boxed. "No expiry" is not an acceptable value.
- An expired exception becomes a defect and is scheduled in the Risk backlog.
- An exception that touches a Class D area (ledger, payments, stock, tenancy, permissions, RLS, migrations) requires an ADR reference and explicit human approval.
- Closing an exception requires evidence that the underlying deviation is gone, recorded in `PROGRESS_LOG.md`.
