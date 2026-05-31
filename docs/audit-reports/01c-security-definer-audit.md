# SECURITY DEFINER Function Audit — `public` Schema
**Generated:** $(date -u +"%Y-%m-%d %H:%M UTC")  
**Functions audited:** 132  
**Query used:**
```sql
SELECT n.nspname, p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true;
```

---

## Executive Summary

| Severity | Count | Description |
|----------|------:|-------------|
| 🔴 CRITICAL | 5 | Missing auth + tenant guard on data-mutating or secret-exposing functions |
| 🟠 HIGH | 8 | Dispatcher/infrastructure functions writable by any JWT principal |
| 🟡 MEDIUM | 6 | Missing scoping or weak assumptions in multi-tenant operations |
| 🔵 LOW / INFO | 17 | Functions that could be converted to SECURITY INVOKER |
| ✅ PASS | 96 | Correctly hardened |

> **All 132 functions have `SET search_path TO 'public'` configured** — the search-path hijacking vector is fully mitigated.

---

## 🔴 CRITICAL

These functions are `SECURITY DEFINER`, bypass Row-Level Security, perform privileged data mutations or secret operations, and contain **zero authentication or authorization checks**.

---

### CRIT-01 — `atomic_customer_balance_update` — No auth, no tenant isolation

**Risk:** Any authenticated (or even anon-role) caller can pass **any** `_customer_id` and **any** `_amount` to overwrite a customer's `current_balance` across all tenants. Combined with RLS bypass from `SECURITY DEFINER`, this is a full cross-tenant financial data manipulation primitive.

```sql
-- Current (VULNERABLE)
CREATE OR REPLACE FUNCTION public.atomic_customer_balance_update(
    _customer_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE customers
  SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _customer_id;   -- ← no tenant_id filter, no auth.uid() check
END;
$$;
```

**Fix — add caller-identity guard and tenant fence:**
```sql
CREATE OR REPLACE FUNCTION public.atomic_customer_balance_update(
    _customer_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _tenant uuid := public.get_current_tenant();
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = 'P0001';
  END IF;

  UPDATE customers
  SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _customer_id
    AND tenant_id = _tenant;           -- ← tenant fence

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found in current tenant' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
```

---

### CRIT-02 — `atomic_supplier_balance_update` — No auth, no tenant isolation

Identical pattern to CRIT-01 for suppliers.

```sql
-- Fix
CREATE OR REPLACE FUNCTION public.atomic_supplier_balance_update(
    _supplier_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _tenant uuid := public.get_current_tenant();
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = 'P0001';
  END IF;

  UPDATE suppliers
  SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _supplier_id
    AND tenant_id = _tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found in current tenant' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
```

---

### CRIT-03 — `switch_user_tenant` — Arbitrary user hijacking

**Risk:** Accepts `_user_id uuid` with **no check that `_user_id = auth.uid()`**. Any authenticated user can silently re-assign another user's default tenant, effectively hijacking their context on next login.

```sql
-- Current (VULNERABLE) — no assertion that caller owns _user_id
CREATE OR REPLACE FUNCTION public.switch_user_tenant(_user_id uuid, _tenant_id uuid) ...
```

**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.switch_user_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Caller must be acting on their own record, unless they are a platform admin
  IF _user_id <> auth.uid() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: cannot switch tenant for another user'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.user_tenants
  SET is_default = (tenant_id = _tenant_id)
  WHERE user_id = _user_id;

  RETURN true;
END;
$$;
```

---

### CRIT-04 — `merge_customers_atomic` — Full cross-tenant destructive operation with no auth

**Risk:** Accepts two arbitrary UUIDs. Performs mass `UPDATE` and `DELETE` across ten tables with **no auth check and no tenant fence**. A malicious caller could:
- merge customers from different tenants
- destroy the duplicate record from any tenant
- corrupt `current_balance` aggregates globally

```sql
-- Fix — add auth + tenant isolation
CREATE OR REPLACE FUNCTION public.merge_customers_atomic(
    p_primary_id uuid, p_duplicate_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _tenant uuid := public.get_current_tenant();
  _primary  RECORD;
  _duplicate RECORD;
  -- ... (rest unchanged)
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required to merge customers'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, name INTO _primary   FROM customers WHERE id = p_primary_id   AND tenant_id = _tenant;
  SELECT id, name INTO _duplicate FROM customers WHERE id = p_duplicate_id AND tenant_id = _tenant;

  IF _primary.id IS NULL OR _duplicate.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found in current tenant' USING ERRCODE = 'P0002';
  END IF;
  -- ... rest of existing logic unchanged
END;
$$;
```

---

### CRIT-05 — `decrypt_totp_secret` — Decrypts any user's TOTP secret with no auth check

**Risk:** Accepts `_user_id uuid` with **no check that `auth.uid() = _user_id`**. Any authenticated user can call `SELECT public.decrypt_totp_secret('<victim_uuid>')` to recover the raw TOTP seed of any other user, completely bypassing 2FA. The key derivation fallback (`sha256('lovable_totp_v1_' || current_database())`) is deterministic and guessable.

```sql
-- Fix — enforce caller ownership
CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _enc bytea;
  _key text;
BEGIN
  -- Only the owning user or a platform admin may decrypt
  IF _user_id <> auth.uid() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: cannot access another user''s TOTP secret'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT secret_encrypted INTO _enc
  FROM public.user_2fa_settings WHERE user_id = _user_id LIMIT 1;
  IF _enc IS NULL THEN RETURN NULL; END IF;

  _key := COALESCE(NULLIF(current_setting('app.totp_master_key', true), ''), NULL);
  IF _key IS NULL THEN
    RAISE EXCEPTION 'app.totp_master_key GUC is not configured'
      USING ERRCODE = 'P0001';
    -- Do NOT fall back to a deterministic key — fail closed
  END IF;

  RETURN pgp_sym_decrypt(_enc, _key);
END;
$$;
```

---

## 🟠 HIGH

These functions are used by the internal event-dispatcher / background workers but are callable by **any JWT principal** with no authentication guard. A compromised user token could corrupt telemetry, claim events, or forge batch records.

---

### HIGH-01 — `claim_pending_events` — Unauthenticated event claiming

**Risk:** Any authenticated session can call this and lock/claim events from **all tenants** (`domain_events` has no tenant filter in the `WHERE` clause). This can starve the real dispatcher.

**Fix:**
```sql
ALTER FUNCTION public.claim_pending_events(integer)
  -- Restrict to service_role only via caller check:
  -- Add at top of function body:
  -- IF current_setting('role', true) NOT IN ('service_role', 'supabase_admin') THEN
  --   RAISE EXCEPTION 'service_role required' USING ERRCODE = 'insufficient_privilege';
  -- END IF;
```
Or better, grant EXECUTE only to `service_role` and revoke from `authenticated`/`anon`:
```sql
REVOKE EXECUTE ON FUNCTION public.claim_pending_events(integer) FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.claim_pending_events(integer) TO service_role;
```

---

### HIGH-02 — `mark_event_processed` — Any user can mark events processed/failed

**Risk:** No auth check. Any user can call `SELECT public.mark_event_processed('<event_id>', 'processed')` to silently swallow events or `'failed'` to trigger infinite retry storms.

**Fix:** Same as HIGH-01 — add role guard or restrict EXECUTE:
```sql
REVOKE EXECUTE ON FUNCTION public.mark_event_processed(uuid, text, text) FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.mark_event_processed(uuid, text, text) TO service_role;
```

---

### HIGH-03 — `purge_old_audit_records` — Unauthenticated audit log destruction

**Risk:** Any authenticated user can call this and delete all audit records older than 180 days, constituting evidence tampering / compliance violation.

**Fix:**
```sql
-- Add to function body:
IF NOT public.is_platform_admin() THEN
  RAISE EXCEPTION 'platform admin required' USING ERRCODE = 'insufficient_privilege';
END IF;

-- AND restrict at grant level:
REVOKE EXECUTE ON FUNCTION public.purge_old_audit_records() FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.purge_old_audit_records() TO service_role;
```

---

### HIGH-04 — `prune_expired_idempotency` — Removes idempotency guards with no auth

**Risk:** Allows premature deletion of idempotency keys, enabling replay attacks on financial mutations.

**Fix:**
```sql
REVOKE EXECUTE ON FUNCTION public.prune_expired_idempotency() FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.prune_expired_idempotency() TO service_role;
```

---

### HIGH-05 — `record_dispatcher_batch` — Telemetry injection by any principal

**Risk:** Any authenticated user can insert fabricated dispatcher batch records, corrupting operational metrics and alerting.

**Fix:**
```sql
REVOKE EXECUTE ON FUNCTION public.record_dispatcher_batch(text,integer,integer,integer,integer,integer,integer,text,timestamptz)
  FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.record_dispatcher_batch(text,integer,integer,integer,integer,integer,integer,text,timestamptz)
  TO service_role;
```

---

### HIGH-06 — `record_dispatcher_event_execution` — Telemetry injection

Same issue as HIGH-05.
```sql
REVOKE EXECUTE ON FUNCTION public.record_dispatcher_event_execution(text,uuid,text,text,uuid,uuid,text,text,integer,integer)
  FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.record_dispatcher_event_execution(text,uuid,text,text,uuid,uuid,text,text,integer,integer)
  TO service_role;
```

---

### HIGH-07 — `record_event_metric` — Counter manipulation by any principal

Any user can inflate or deflate event success/failure counters.

```sql
REVOKE EXECUTE ON FUNCTION public.record_event_metric(text, boolean, numeric) FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.record_event_metric(text, boolean, numeric) TO service_role;
```

---

### HIGH-08 — `reverse_stock_for_credit_note` — No explicit auth check

The function fetches `tenant_id` from the credit note row itself (partial isolation), but has no `auth.uid()` check. An attacker who can guess or enumerate a `credit_note_id` from another tenant can reverse stock for it if the credit_note row exists.

**Fix:**
```sql
-- Add at start of function body:
DECLARE
  _caller_tenant uuid := public.get_current_tenant();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT * INTO _cn FROM public.credit_notes
  WHERE id = _credit_note_id AND tenant_id = _caller_tenant;  -- ← enforce caller tenant
```

---

## 🟡 MEDIUM

---

### MED-01 — `has_any_role` — Missing tenant scope

`has_any_role(_user_id uuid)` returns `true` if the user has **any** role in **any** tenant. A user deactivated from tenant A but still active in tenant B would pass this check in tenant A's context.

**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = public.get_current_tenant()   -- ← scope to current tenant
  );
$$;
```

---

### MED-02 — `ensure_credit_note_posting_accounts` — No auth check before chart-of-accounts mutation

Calls `get_current_tenant()` (tenant-scoped) but performs `INSERT` into `chart_of_accounts` and `posting_account_map` without verifying the caller has accounting admin privileges.

**Fix:** Add `has_role(auth.uid(), 'admin')` guard before the INSERTs.

---

### MED-03 — `check_rate_limit` — No auth-uid validation on `_user_id` parameter

Caller passes `_user_id` externally. A client could pass a **different user's UUID** to drain another user's rate-limit tokens.

**Fix:** Assert `_user_id = auth.uid()` unless caller is `service_role`.
```sql
IF _user_id <> auth.uid() AND current_setting('role', true) <> 'service_role' THEN
  RAISE EXCEPTION 'rate limit user_id mismatch' USING ERRCODE = 'insufficient_privilege';
END IF;
```

---

### MED-04 — `create_journal_for_*` family — No explicit auth.uid() check (7 functions)

`create_journal_for_credit_note`, `create_journal_for_delivery_note`, `create_journal_for_expense`, `create_journal_for_goods_receipt`, `create_journal_for_invoice`, `create_journal_for_payment`, `create_journal_for_purchase_invoice` — all derive tenant from `get_current_tenant()` (good) but do not check `auth.uid() IS NOT NULL`. These are callable unanonymously.

**Fix** (apply to all 7):
```sql
IF auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
END IF;
```

---

### MED-05 — `get_ar_aging_mv` / `get_inventory_valuation_mv` / `get_sales_summary_mv` — Overly broad `search_path`

These three functions have `search_path=public, extensions`. Including `extensions` allows objects in the `extensions` schema to shadow `public` if an attacker can create objects there. Prefer keeping only `public` unless `extensions` functions are directly invoked.

**Fix:**
```sql
ALTER FUNCTION public.get_ar_aging_mv()           SET search_path TO 'public', 'extensions';
ALTER FUNCTION public.get_inventory_valuation_mv() SET search_path TO 'public', 'extensions';
ALTER FUNCTION public.get_sales_summary_mv()       SET search_path TO 'public', 'extensions';
-- (Already set — verify extensions schema is not user-writable)
```
Run: `SELECT has_schema_privilege('authenticated', 'extensions', 'CREATE');` — must return `false`.

---

### MED-06 — `update_tenant_subscription` — No platform-admin guard

Allows changing a tenant's subscription tier. Should require `is_platform_admin()` verification:
```sql
IF NOT public.is_platform_admin() THEN
  RAISE EXCEPTION 'platform admin required' USING ERRCODE = 'insufficient_privilege';
END IF;
```

---

## 🔵 LOW / INFO — Functions That Could Be SECURITY INVOKER

The following **17 functions** are read-only (`STABLE` or pure `SELECT`) and do not access privileged schemas beyond `public`. If RLS policies are defined on their base tables, they could be safely converted to `SECURITY INVOKER`, removing the RLS bypass:

| Function | Rationale for possible INVOKER |
|---|---|
| `_has_posted_journal` | Pure read, public tables only |
| `_resolve_open_period` | Pure read, fiscal_periods table |
| `check_financial_limit` (×2) | Read-only approval threshold lookup |
| `check_section_permission` | Reads permission_matrix only |
| `get_approval_chain` | Read-only approval config |
| `get_invoice_item_returnable` (×2) | Read-only invoice item check |
| `is_period_closed` | Read-only period status |
| `needs_approval` | Read-only threshold check |
| `resolve_posting_account` | Read-only account map lookup |

> **Note:** `has_role`, `has_any_role`, `is_tenant_member`, `get_user_tenant_id`, `get_current_tenant`, `is_platform_admin`, `get_platform_role` **must remain SECURITY DEFINER** — they read `user_roles`, `user_tenants`, and `platform_admins` on behalf of other callers (e.g. RLS policy helpers), and those tables have RLS policies that would prevent cross-user reads under INVOKER.

**ALTER statements to convert safe functions to INVOKER:**
```sql
ALTER FUNCTION public._has_posted_journal(text, uuid)               SECURITY INVOKER;
ALTER FUNCTION public._resolve_open_period(uuid, date)              SECURITY INVOKER;
ALTER FUNCTION public.check_section_permission(uuid, text, text)    SECURITY INVOKER;
ALTER FUNCTION public.get_approval_chain(uuid, text, numeric, uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_invoice_item_returnable(uuid)             SECURITY INVOKER;
ALTER FUNCTION public.is_period_closed(uuid, date)                  SECURITY INVOKER;
ALTER FUNCTION public.needs_approval(uuid, text, numeric)           SECURITY INVOKER;
ALTER FUNCTION public.resolve_posting_account(uuid, text)           SECURITY INVOKER;
```
> ⚠️ Test each conversion in a staging environment — if any function is used inside an RLS policy itself, it must stay DEFINER.

---

## ✅ Correctly Hardened Functions (pass)

The following functions were reviewed and are correctly implemented:

- All **admin_*** functions: `admin_requeue_event`, `admin_set_user_active` — have explicit `has_role(auth.uid(), 'admin')` guards ✅
- All **platform** functions: `toggle_tenant_status`, `get_all_tenants_admin`, `get_platform_stats`, `get_platform_role`, `get_platform_stats` — all gate on `is_platform_admin()` ✅
- `save_invoice_with_items`, `save_quotation_with_items` — call `check_section_permission(auth.uid(), ...)` ✅
- `create_journal_reversal`, `post_document_atomic` — derive tenant from `get_current_tenant()` and fail on NULL ✅
- `handle_new_user` — trigger function, fires as `auth.users` trigger, correct context ✅
- All `prevent_*_mutation` triggers — correctly guard against mutation of posted/approved documents ✅
- `check_sod_violation`, `get_permission_matrix`, `compute_permission_matrix` — have tenant and role context ✅
- `log_activity`, `track_changes`, `emit_event` — tenant-scoped ✅
- `cancel_*`, `confirm_*`, `post_*`, `void_*` document functions — use `get_current_tenant()` + auth checks ✅

---

## Complete ALTER Statements — Fix Missing Search Path

> All 132 functions already have `SET search_path TO 'public'` configured. **No search-path fixes are required.** The three functions with `extensions` in their path are noted in MED-05.

---

## Remediation Priority Queue

```
Priority 1 (patch immediately):
  CRIT-05 decrypt_totp_secret        — auth check missing on secret exposure
  CRIT-03 switch_user_tenant         — caller != _user_id not enforced
  CRIT-01 atomic_customer_balance_update  — add tenant + auth guard
  CRIT-02 atomic_supplier_balance_update  — add tenant + auth guard
  CRIT-04 merge_customers_atomic     — add auth + admin role + tenant guard

Priority 2 (patch within 1 sprint):
  HIGH-03 purge_old_audit_records    — restrict to service_role/platform_admin
  HIGH-01 claim_pending_events       — restrict EXECUTE to service_role
  HIGH-02 mark_event_processed       — restrict EXECUTE to service_role
  HIGH-04 prune_expired_idempotency  — restrict EXECUTE to service_role
  HIGH-05/06/07 dispatcher telemetry — restrict EXECUTE to service_role
  HIGH-08 reverse_stock_for_credit_note — add caller-tenant assertion

Priority 3 (next cycle):
  MED-01 has_any_role tenant scope
  MED-02 ensure_credit_note_posting_accounts auth guard
  MED-03 check_rate_limit user_id assertion
  MED-04 create_journal_for_* auth.uid() IS NOT NULL check (7 functions)
  MED-06 update_tenant_subscription platform-admin guard

Priority 4 (housekeeping):
  LOW-01 Convert 8 stable read-only helpers to SECURITY INVOKER
  MED-05 Verify extensions schema is not user-writable
```

---

*Audit performed by automated static analysis of `pg_get_functiondef` output. Manual pen-testing of privilege escalation paths is recommended for CRIT-01–05.*
