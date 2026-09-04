# Post-F1 Findings Gate — Documentation / Triage Gate

**Gate ID:** `PFG-NAZRA-001`
**Date:** 2026-09-04
**Nature:** Documentation / triage gate — **not** an execution authorization.
**Mode:** source mutation 0 · migration 0 · RPC 0 · grant 0 · facade 0 · F2 opening 0.

---

## 1. Relationship to F1

```text
F1                          CLOSED (37/37, PASS — accepted, NOT certified)
   ↓  (does NOT reopen)
Post-F1 Findings (new lineage)
├── NOTIF-001   CONFIRMED
├── NOTIF-002   CONFIRMED
├── DASH-001    CONFIRMED
└── DASH-002    REGISTERED (F2 candidate)
```

These findings were discovered during/after running the product. They are not part of the exhausted F1 frozen scope and must not be folded back into it.

---

## 2. NOTIF-001 — Customer Alert notifications never persist

**Severity:** High — Security/Authorization + Reliability
**Boundary:** BND-06 with BND-05 implications

**Confirmed root cause (live catalogue evidence, 2026-09-04):**

```text
Client (useAlertNotifier → notificationsRepository.insertMany())
  ↓ PostgREST
  ↓ public.notifications
  ↓ NO effective table privilege
     (information_schema.role_table_grants = 0 rows for public.notifications)
  ↓ WRITE DENIED
```

The defect is the absence of table-level GRANTs: PostgREST denies the write (and any read) before RLS is evaluated. It is not a missing/failing INSERT policy.

**Rejected shortcuts:** no `WITH CHECK (true)`; no broad client-side INSERT for `authenticated`; no quick BND-05 change.

---

## 3. NOTIF-002 — INSERT policy permits in-tenant spoofing

**Severity:** High (latent — activates the moment grants exist)
**Confirmed live policy:** `notifications_tenant_restrict_insert`, roles `authenticated, anon`, `WITH CHECK (tenant_id = get_current_tenant())` — **no `user_id` predicate**.

```text
If INSERT is granted as-is
  ↓ policy checks tenant_id only
  ↓ tenant member can set an arbitrary user_id
  ↓ Notification spoofing inside the tenant
```

A grants-only fix is an incomplete, unacceptable security fix. Unit A must resolve NOTIF-001 and NOTIF-002 together.

---

## 4. DASH-001 — Recent Invoices contract mismatch

**Severity:** Medium — Data Contract / Dashboard Reliability
**Confirmed root cause:** `src/hooks/useDashboardData.ts` (select list + `InvoiceWithCustomer` type) and `src/components/dashboard/RecentInvoicesWidget.tsx` use `amount_paid`; the canonical schema field is `paid_amount`, used by the rest of the system (invoice repository, customer alerts, reports query service, etc.).

**Fix direction:** rename `amount_paid → paid_amount` across query → type → widget. **No** `ALTER TABLE`, **no** duplicate semantic field.

---

## 5. DASH-002 — Dashboard hook queries the database directly

**Classification:** Architecture observation — `useDashboardData` holds `supabase.from('invoices')` edges (hook → DB).
**Decision:** Registered as an **F2 candidate**. Not fixed in this lineage; must not be mixed with the DASH-001 bug fix.

---

## 6. Candidate next scope — `POSTF1_SCOPE_001` (NOT frozen here)

Split into two units with different risk profiles. No SHA-256 freeze and no source mutation in this gate.

### Unit A — NOTIF-001 / NOTIF-002 (Security + persistence)

Expected end state:

```text
notifications
  ├── minimum correct table privileges (grants per policy intent)
  ├── narrow server-side creation authority (SECURITY DEFINER RPC)
  ├── tenant derived server-side — never trusted from client input
  ├── target user validated for tenant membership
  └── no spoofing path (no self-escalation to another user's notifications)
```

Authority constraints: pinned `search_path`; no `anon` EXECUTE; least-privilege execution; the authority model explicitly defines any cross-user creation (e.g. admin → member of same tenant).

Required evidence (live, not mere unit tests):

```text
✓ authorized notification succeeds and persists
✓ appears in NotificationBell and Notifications page
✓ same-tenant unauthorized target denied
✓ cross-tenant target denied
✓ tenant spoofing denied
✓ anon cannot invoke the authority
✓ arbitrary client INSERT is not restored
```

**Success ≠ "INSERT succeeds".** Success = Persistence PASS + Authorization PASS + Tenant isolation PASS + Anti-spoofing PASS.

### Unit B — DASH-001 (Data contract)

```text
Schema (paid_amount) → Query → Type → Widget   (paid_amount end to end)
```

Scope: `src/hooks/useDashboardData.ts` (query + type), `src/components/dashboard/RecentInvoicesWidget.tsx` only.

Required evidence: Recent Invoices loads; paid amount displayed from `paid_amount`; no `amount_paid` reference remains in this contract; no schema mutation; no unrelated dashboard behavior changed.

---

## 7. Order of operations

```text
POST-F1 GATE (this document)
  → Human review
  → Frozen POSTF1_SCOPE_001
  → Human authorization
  → Unit A implementation + evidence  |  Unit B implementation + evidence
  → Independent verification
  → Human gate
```

F2 remains UNAUTHORIZED. RISK-007, RISK-008, PRE-EXT-001 remain OPEN. PRE-TS-001 remains CONTAINED (recurrences handled as separate DELTAs). No certification is claimed at any step.

---

## 8. Human authorization

| Decision | Signature | Date |
|---|---|---|
| Accept gate | ☐ pending | — |
| Freeze POSTF1_SCOPE_001 | ☐ pending | — |
| Authorize Unit A | ☐ pending | — |
| Authorize Unit B | ☐ pending | — |

**Status: PENDING — no execution authorized.**
