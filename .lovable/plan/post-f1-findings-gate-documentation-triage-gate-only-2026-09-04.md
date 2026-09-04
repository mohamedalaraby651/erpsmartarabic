# Post-F1 Findings Gate — Documentation / Triage Gate Only

F1 remains CLOSED (37/37, PASS, accepted — not certified). The new findings start a **new lineage**; F1 is not reopened. This gate is documentation-only: source mutation 0, migration 0, RPC 0, grant 0, facade 0, F2 opening 0.

## Live-verified root causes

**NOTIF-001 — Confirmed (High — Security/Authorization + Reliability)**

```text
Client
  ↓ useAlertNotifier → notificationsRepository.insertMany()
  ↓ PostgREST
  ↓ public.notifications
  ↓ NO effective table privilege (zero rows in role_table_grants)
  ↓ WRITE DENIED
```

**NOTIF-002 — Confirmed (independent, same table)** — the effective INSERT policy `notifications_tenant_restrict_insert` checks only `tenant_id = get_current_tenant()`. If INSERT is ever granted as-is, a tenant member could set an arbitrary `user_id` → in-tenant notification spoofing. A grants-only fix is therefore an incomplete, unacceptable security fix.

**DASH-001 — Confirmed (Medium — Data Contract)** — `useDashboardData.ts` (query + type) and `RecentInvoicesWidget.tsx` use `amount_paid`; the canonical schema field is `paid_amount`, used by the rest of the app. Fix = contract rename only; no `ALTER TABLE`, no duplicate field.

**DASH-002 — Registered (architecture observation)** — `useDashboardData` queries Supabase directly. Filed as F2 candidate, **not** fixed here.

## Deliverables in this step (documentation only)

1. `docs/governance/POST_F1_FINDINGS_GATE.md` containing:
   - Statement: F1 CLOSED/exhausted; findings open a new lineage.
   - For each finding: ID, root cause (as verified live), classification, boundary, recommended direction, rejected shortcuts (no `WITH CHECK (true)`, no broad client INSERT, no DB schema change for DASH-001).
   - Empty, unsigned Human Authorization block.
2. Candidate `POSTF1_SCOPE_001`, split into two units (different risk profiles):
   - **Unit A — NOTIF-001/002 (Security + persistence):** minimum table grants + narrow server-side creation authority. The authority must: derive tenant server-side (never trust client `tenant_id`), validate target-user tenant membership, be `SECURITY DEFINER` with pinned `search_path`, no `anon` EXECUTE, least-privilege execution, no path for a user to target another user unless the authority model explicitly allows it. Reads (bell/page) stay user-scoped via existing SELECT policy.
   - **Unit B — DASH-001 (Data contract):** rename `amount_paid` → `paid_amount` in `useDashboardData.ts` (query + type) and `RecentInvoicesWidget.tsx` only. DASH-002 boundary migration stays an F2 candidate.
   - **No SHA-256 freeze, no source mutation** in this gate.
3. Append the four findings to `docs/governance/PRE_EXISTING_ISSUES.md`, a gate row to `docs/governance/PROGRESS_LOG.md`, and the three post-F1 tasks to `roadmap.md`.

## Exit conditions recorded for the future implementation unit

**Unit A success ≠ "INSERT succeeds".** Success = Persistence PASS + Authorization PASS + Tenant isolation PASS + Anti-spoofing PASS. Required evidence (not mere unit tests):

```text
✓ authorized notification succeeds and persists
✓ appears in NotificationBell and Notifications page
✓ same-tenant unauthorized target denied
✓ cross-tenant target denied
✓ tenant spoofing denied
✓ anon cannot invoke the authority
✓ arbitrary client INSERT is not restored
```

**Unit B:** Recent Invoices loads; paid amount displayed from `paid_amount`; no `amount_paid` reference remains in this contract; no schema mutation; no unrelated dashboard behavior changed.

## Order of operations

```text
POST-F1 GATE (this step, documentation)
  → Human review
  → Frozen POSTF1_SCOPE_001
  → Human authorization
  → Unit A implementation + evidence  |  Unit B implementation + evidence
  → Independent verification
  → Human gate
```

F2 stays UNAUTHORIZED. PRE-TS-001 recurrence handling remains a separate DELTA. No certification is claimed at any step.
