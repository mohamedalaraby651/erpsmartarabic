# RCA Report: Recurring Auth Loop in `event-dispatcher` Edge Function

**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")  
**Severity:** Medium (noisy logs, failed event dispatch every ~60 s, Auth API load)  
**Project:** erpsmartarabic1 (`npwofemokwddtutugmas`)

---

## 1. Root Cause

A cron-based caller (operating on Supabase's AWS infrastructure, identifiable from the multiple rotating AWS IPs and the ~60-second cadence) is invoking the `event-dispatcher` edge function without a valid credential. The function (`supabase/functions/event-dispatcher/index.ts`) implements its own two-path auth: (a) a shared-secret header `x-dispatcher-secret` checked against the `DISPATCHER_SECRET` environment variable, or (b) a Bearer JWT that is validated against `auth.getUser()` and must resolve to a user with a platform-admin role (`owner`, `admin`, or `super_admin`). The cron caller supplies neither a dispatcher secret nor a service-role JWT; instead it presents the project's **anon key** (or no token at all). The Supabase Auth API rejects the anon key with HTTP 403 `"invalid claim: missing sub claim"` because the anon JWT is a role-scoped token with no `sub` (user-id) field — it represents no authenticated user. The `auth.getUser()` call therefore returns `null`, `isAuthorized` stays `false`, and the function logs `auth.unauthorized` and returns HTTP 401. This cycle repeats every ~60 seconds for as long as the cron trigger remains misconfigured.

---

## 2. Exact Misconfigured Caller Location

### Codebase migrations — no `net.http_post` call found
A full search of all migration files reveals **no `pg_cron`/`pg_net` schedule that calls the edge function**:

```
rg -n "net\.http_post|cron\.schedule" supabase/migrations/
```

Results:
| File | Line | Content |
|------|------|---------|
| `20260331173504_…sql` | 181–182 | `CREATE EXTENSION IF NOT EXISTS pg_cron` (setup only) |
| `20260514055529_…sql` | 12 | `cron.schedule('refresh-mv-dashboard-counts', '*/5 * * * *', …)` — **calls a SQL function, not the edge function** |

The `pg_net` extension is never used in any migration. Therefore the cron trigger **was configured directly in the Supabase Dashboard** (Edge Functions → Schedules UI), outside of version-controlled migrations. That is the architectural gap.

### Evidence of the call pattern
- Source IPs rotate across AWS ranges → Supabase's own scheduler infrastructure.
- Referer: `https://erpsmartarabic1.lovable.app` — injected by the browser-originated anon key embedded in the schedule config.
- Error `"invalid claim: missing sub claim"` is the exact error Supabase Auth returns for the anon JWT at `POST /auth/v1/user`.
- `event-dispatcher/index.ts` line ~106: `const { data: userData } = await userClient.auth.getUser();` — this is the call that triggers the Auth API 403.
- `event-dispatcher/index.ts` line ~120–122: if `userData?.user` is null → `isAuthorized` stays `false` → line ~126: `log(correlationId, 'warn', 'auth.unauthorized')`.

---

## 3. Fix

### Option A — Preferred: pg_cron with `DISPATCHER_SECRET` via `pg_net` (migration-controlled, auditable)

Create a new migration that schedules the cron properly using `pg_net`:

```sql
-- Migration: YYYYMMDDHHMMSS_fix-event-dispatcher-cron.sql

-- 1. Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Remove any Dashboard-configured schedule for event-dispatcher
--    (must also delete it manually in Supabase Dashboard → Edge Functions → Schedules)
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'invoke-event-dispatcher';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Schedule event-dispatcher every 60 seconds using the DISPATCHER_SECRET
--    Replace <PROJECT_REF> with npwofemokwddtutugmas
--    DISPATCHER_SECRET must be set as an Edge Function secret in the Supabase Dashboard.
SELECT cron.schedule(
  'invoke-event-dispatcher',
  '* * * * *',    -- every 60 seconds (pg_cron minimum granularity is 1 minute)
  $$
    SELECT extensions.http_post(
      url       := 'https://npwofemokwddtutugmas.supabase.co/functions/v1/event-dispatcher',
      headers   := jsonb_build_object(
                     'Content-Type',       'application/json',
                     'x-dispatcher-secret', current_setting('app.dispatcher_secret', true)
                   ),
      body      := '{"batch_size": 50}'
    );
  $$
);
```

**And** set the PostgreSQL configuration variable so the secret is available to pg_cron:

```sql
-- Run once in Supabase SQL Editor (not a migration — secret must not be committed):
ALTER DATABASE postgres SET app.dispatcher_secret = '<your-DISPATCHER_SECRET-value>';
```

> **Security note:** Alternatively, hard-code the secret value directly in the `cron.schedule` body if the `app.dispatcher_secret` approach is not available — but treat the migration as a secret and do not commit it to a public repo. The preferred pattern is to store it as a Supabase Vault secret and read it via `vault.decrypted_secrets`.

---

### Option B — Quick mitigation: use `service_role` JWT (less recommended)

If `DISPATCHER_SECRET` is not yet configured, you can temporarily authenticate via the service role key. **The service role JWT does contain a `sub`-equivalent claim (`role: service_role`) but `auth.getUser()` still rejects it.** The function's auth code would need to be updated to also accept service-role tokens, OR the preferred `x-dispatcher-secret` path should be used instead.

---

### Option C — Minimum viable fix right now (no migration needed)

1. Open Supabase Dashboard → **Edge Functions → event-dispatcher → Schedules**.
2. Find the existing every-minute schedule.
3. Edit it to add the HTTP header `x-dispatcher-secret: <DISPATCHER_SECRET value>`.
4. Save. The cron will then pass the shared-secret check on line 94 of `index.ts` and `isAuthorized` will be set to `true` before the Auth API is ever called.

This immediately stops both the `auth.unauthorized` log spam and the Auth API 403 flood.

---

## 4. Other Recurring Errors Spotted

### 4.1 Missing `DISPATCHER_SECRET` environment variable
If `Deno.env.get('DISPATCHER_SECRET')` returns `undefined` (i.e., the secret has not been set in the Edge Function's environment), then `expectedSecret` is falsy and the entire secret-check branch (`if (expectedSecret && ...)`) is skipped unconditionally. This means even a caller who sends the correct header value will never be authorized via that path — only admin-role users can authorize. **Verify `DISPATCHER_SECRET` is set** in Supabase Dashboard → Edge Functions → event-dispatcher → Secrets.

### 4.2 All edge functions have `verify_jwt = false`
`supabase/config.toml` disables Supabase's built-in JWT verification for every single function including `log-event`, `restore-backup`, `rollback-restore`, etc. These functions must each implement their own auth (some do, some may not be as hardened). This is a defence-in-depth gap worth a separate audit pass.

### 4.3 Auth API amplification risk
The current loop makes one `auth.getUser()` call per cron tick. At ~60 s intervals that is ~1,440 calls/day from the scheduler alone, on top of real user traffic. Each call incurs Auth API quota and adds latency to the edge function cold-start path. Fixing the cron (Options A–C above) eliminates this entirely.

### 4.4 `pg_cron` installed in two different schemas
Two migrations create the `pg_cron` extension:
- `20260331173504_…sql` line 182: `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;`
- `20260514055529_…sql` line 1: `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;`

PostgreSQL will ignore the second `IF NOT EXISTS`, so in practice whichever ran first wins, but this is a latent inconsistency. Both should be harmonised to `SCHEMA extensions` (the Supabase-preferred location).

---

## 5. Remediation Checklist

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Add `x-dispatcher-secret` header to the Dashboard schedule (Option C) | DevOps | **Immediate** |
| 2 | Confirm `DISPATCHER_SECRET` secret is set in Edge Function env | DevOps | **Immediate** |
| 3 | Create migration to move the schedule into pg_cron/pg_net (Option A) | Engineering | High |
| 4 | Delete the misconfigured Dashboard schedule after migration deploys | DevOps | High |
| 5 | Review all `verify_jwt = false` functions for internal auth hardening | Security | Medium |
| 6 | Harmonise pg_cron extension schema in migrations | Engineering | Low |

