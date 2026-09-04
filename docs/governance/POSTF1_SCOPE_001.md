# POSTF1_SCOPE_001 — Frozen Execution Contract

**Status:** CANDIDATE — pending human freeze approval  
**Parent Gate:** PFG-NAZRA-001 — PASS / Documentation Gate Accepted  
**Date:** 2026-09-04  
**Lineage:** `a33f49b9` → `BASELINE-NAZRA-002` → `BASELINE-UX4-001` → `PFG-NAZRA-001`  
**Scope Manifest:** `scripts/audits/output/postf1-scope-001-manifest.json`  
**Frozen Scope Hash:** `dc6c5dd9698d89092c0aa7f1d530554096e2a70a5e858f78375b49cbc413f4d3`  
**Nature:** Frozen scope for Unit A + Unit B implementation. No mutation authorized until human signature.

---

## 1. Authorization Block

| Decision | Status | Signature | Date |
|---|---|---|---|
| PFG-NAZRA-001 PASS | ACCEPTED | Human | 2026-09-04 |
| POSTF1_SCOPE_001 freeze | **PENDING** | — | — |
| Unit A implementation | NOT AUTHORIZED | — | — |
| Unit B implementation | NOT AUTHORIZED | — | — |
| Independent verification | NOT AUTHORIZED | — | — |

> **Gate completion ≠ Authorization to mutate.** This document is a scope contract only.

---

## 2. Scope Summary

This contract splits the Post-F1 findings into two isolated, independently verifiable units:

- **Unit A — NOTIF-001 + NOTIF-002**: Restore notification persistence while eliminating the latent in-tenant `user_id` spoofing path. Required: narrow server-side creation authority via a `SECURITY DEFINER` RPC, server-derived tenant, target-user tenant-membership validation, direct `INSERT` denial, and `anon` denial.
- **Unit B — DASH-001**: Correct the Recent Invoices dashboard contract by renaming `amount_paid` → `paid_amount` in the query, type, and widget only. No schema change.

**F1 remains CLOSED.** **F2 remains UNAUTHORIZED.** No opportunistic cleanup, no new facades, no query services, no domain changes.

---

## 3. Unit A — Notification Security + Persistence

### 3.1 In-scope files

| # | Path | Change class |
|---|---|---|
| A1 | `src/hooks/useAlertNotifier.ts` | Redirect from direct repository insert to RPC-backed repository call |
| A2 | `src/lib/repositories/notificationsRepository.ts` | Remove `insertMany` direct INSERT; add `createNotification` RPC wrapper |
| A3 | `supabase/migrations/..._postf1_unit_a_notifications.sql` | New migration: RPC creation + execute grants + INSERT privilege revocation |

### 3.2 Out-of-scope for Unit A

- Existing notification `SELECT`/`UPDATE`/`DELETE` policies.
- `NotificationBell` UI or Notifications page layout.
- Alert engine logic, alert types, or customer-alert rules.
- Generalizing the RPC into a generic cross-tenant notification service.

### 3.3 Authority contract

| Rule | Implementation |
|---|---|
| Tenant source | Server-side only via `public.get_current_tenant()` |
| Client supplies `tenant_id` | **Forbidden** |
| Target `user_id` | Supplied by caller, validated against `public.user_tenants` |
| Function security | `SECURITY DEFINER` with `SET search_path = public` |
| RLS interaction | RPC bypasses RLS by security definer; direct client INSERT is denied by revoked privilege |

### 3.4 RPC input/output contract

```sql
CREATE OR REPLACE FUNCTION public.create_tenant_notification(
  target_user_id uuid,
  title text,
  message text,
  notification_type text DEFAULT 'info',
  link text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant uuid;
  target_membership uuid;
  new_id uuid;
BEGIN
  caller_tenant := public.get_current_tenant();
  IF caller_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant not resolved for caller' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO target_membership
  FROM public.user_tenants
  WHERE user_id = target_user_id
    AND tenant_id = caller_tenant
  LIMIT 1;

  IF target_membership IS NULL THEN
    RAISE EXCEPTION 'target user is not a member of the caller tenant' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    tenant_id,
    title,
    message,
    type,
    link,
    is_read,
    created_at
  ) VALUES (
    target_user_id,
    caller_tenant,
    title,
    message,
    notification_type,
    link,
    false,
    now()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
```

**Execute grants:**

```sql
GRANT EXECUTE ON FUNCTION public.create_tenant_notification(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_notification(uuid, text, text, text, text) TO service_role;
```

**INSERT privilege revocation (direct INSERT denial):**

```sql
REVOKE INSERT ON public.notifications FROM authenticated;
REVOKE INSERT ON public.notifications FROM anon;
```

### 3.5 Client-side contract

- `notificationsRepository.insertMany` is **deleted**.
- New repository method:
  ```ts
  createNotification(params: NotificationCreateParams): Promise<string>
  ```
  returning the RPC-generated notification UUID.
- `useAlertNotifier` keeps deduplication via `existingTodayKeys`, then calls `createNotification` once per filtered alert (max 10 per batch).

### 3.6 Anti-spoofing guarantees

| Threat | Control |
|---|---|
| Direct client INSERT | Denied by revoked INSERT privilege on `public.notifications` |
| `anon` RPC invoke | Denied — no EXECUTE grant to `anon` |
| Cross-tenant target | Denied by `user_tenants` lookup failure |
| Same-tenant non-member target | Denied by `user_tenants` lookup failure |
| `tenant_id` spoofing | Impossible — `tenant_id` set server-side from `get_current_tenant()` |
| Self-escalation to another user's notifications | Blocked — target must be a member of caller's tenant |

---

## 4. Unit B — Dashboard Data Contract

### 4.1 In-scope files

| # | Path | Change |
|---|---|---|
| B1 | `src/hooks/useDashboardData.ts` | Rename `amount_paid` → `paid_amount` in `InvoiceWithCustomer` type and in the `supabase.from('invoices').select(...)` query |
| B2 | `src/components/dashboard/RecentInvoicesWidget.tsx` | Rename `amount_paid` → `paid_amount` in render logic (display and any derived calculations) |

### 4.2 Forbidden in Unit B

- No `ALTER TABLE`, no new column, no data migration.
- No creation of a Query Service.
- No dashboard architecture refactor or new data-fetching pattern.
- No changes to other invoice consumers outside these two files.

---

## 5. Verification & Evidence

### 5.1 Quality gates (pre- and post-implementation)

- `tsgo` — zero project TypeScript errors (platform-owned `TS7011` in `previewAuthStorage.ts` remains a separate PRE-TS-001 containment item).
- `bun run build` — must pass.
- Vitest suite — must pass with no new failures.
- Fitness checks — zero new failures.

### 5.2 Live evidence required

| # | Test | Expected result |
|---|---|---|
| V1 | Authorized alert fires for a same-tenant user | Notification row persists and appears in `NotificationBell` |
| V2 | Notifications page read-back | Row is visible to the target user |
| V3 | Same-tenant non-member target | RPC returns `403` / `42501`; no row inserted |
| V4 | Cross-tenant target | RPC returns `403` / `42501`; no row inserted |
| V5 | Direct client `INSERT` attempt | PostgREST denies due to lack of INSERT privilege |
| V6 | `anon` RPC invocation | Denied due to lack of EXECUTE grant |
| V7 | Recent Invoices loads | `paid_amount` is displayed; no `amount_paid` reference remains |
| V8 | Dashboard regression | Dashboard renders without runtime errors |

---

## 6. Stop Conditions

Implementation halts immediately if any of the following occur:

1. Scope drift beyond the five files listed in §3.1 and §4.1.
2. Requirement for a new facade, Query Service, or domain-layer change.
3. Any source mutation in F1-frozen files without a new frozen scope.
4. Any schema change beyond the single Unit A migration.
5. Restoration of a broad INSERT grant on `public.notifications`.
6. Test, build, or fitness failure not resolvable within this contract.
7. PRE-TS-001 recurrence requiring a non-minimal fix.

---

## 7. Forbidden Changes

- Any F1 scope reopening.
- Any F2 unauthorized opening.
- Opportunistic cleanup, refactoring, or renaming outside the contract.
- Broad `authenticated` INSERT grant on `public.notifications`.
- `WITH CHECK (true)` or equivalent permissive notification INSERT policy.
- Client-side storage or localStorage-based role/tenant checks.

---

## 8. Approved Changes Summary

| Unit | Files | SQL / Type changes | Required evidence |
|---|---|---|---|
| A | 2 source + 1 migration | RPC + execute grants + INSERT revocation | V1–V6 |
| B | 2 source | Type / query / render rename | V7–V8 |

---

## 9. Human Freeze Signature

By signing below, the reviewer approves `POSTF1_SCOPE_001` as frozen. Implementation of Unit A and Unit B remains a separate authorization step.

| Decision | Status | Signature | Date |
|---|---|---|---|
| Freeze POSTF1_SCOPE_001 | ☐ pending | — | — |
| Authorize Unit A implementation | ☐ pending | — | — |
| Authorize Unit B implementation | ☐ pending | — | — |

**Frozen Scope Hash:** `dc6c5dd9698d89092c0aa7f1d530554096e2a70a5e858f78375b49cbc413f4d3`
