# SmartERP / Nazra — RLS & GRANT Security Audit Report
**Schema:** `public`  
**Audit Date:** 2025-06-02  
**Auditor:** Automated static analysis of Supabase migration files  
**Total Tables Audited:** 101  
**Method:** Full migration-file analysis (`rg` / `grep` across all `.sql` files)

---

## Executive Summary

| Finding Category | Count | Max Severity |
|---|---|---|
| Tables Missing Explicit GRANTs | 94 / 101 | High |
| Tables With RLS Disabled | 0 | — |
| RLS Enabled But No / Incomplete Policies | 5 | Critical |
| Policies Missing `tenant_id` Filter | 28 tables / ~55 policies | Critical |
| Over-Permissive anon Grants | Systemic (schema default) | High |
| Sensitive Column Exposure | 5 tables | Critical |

---

## Section 1 — Tables Missing Explicit GRANTs

**Background:** Supabase initialises all projects with schema-level default privileges that grant `SELECT / INSERT / UPDATE / DELETE` to **both `authenticated` AND `anon`** on every table in `public`. No migration in this repo issues `ALTER DEFAULT PRIVILEGES ... REVOKE` or per-table `REVOKE` (except `user_2fa_settings` columns and `document_posting_log`). This means every table listed below silently inherits blanket anon+authenticated DML rights — the only gate is RLS. If Supabase ever changes those defaults, or if the project is migrated to a self-hosted instance, all ~94 tables become world-readable.

Only **7 tables** have explicit `GRANT` statements:

| Table | Explicit Grant |
|---|---|
| `tenant_cost_centers` | SELECT/INSERT/UPDATE/DELETE → authenticated; ALL → service_role |
| `tenant_departments` | SELECT/INSERT/UPDATE/DELETE → authenticated; ALL → service_role |
| `tenant_projects` | SELECT/INSERT/UPDATE/DELETE → authenticated; ALL → service_role |
| `customers_safe` (view) | SELECT → authenticated |
| `event_dispatcher_backlog` (view) | SELECT → authenticated |
| `event_dispatcher_metrics` (view) | SELECT → authenticated |
| `user_2fa_status` (view) | SELECT → authenticated |

### Tables Requiring Explicit GRANTs (representative — all others)

| Table | Severity | Recommended Fix |
|---|---|---|
| `profiles` | **High** | `GRANT SELECT, UPDATE ON public.profiles TO authenticated; REVOKE ALL ON public.profiles FROM anon;` |
| `user_roles` | **High** | `GRANT SELECT ON public.user_roles TO authenticated; REVOKE ALL ON public.user_roles FROM anon;` |
| `invoices` | **High** | `GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated; REVOKE ALL FROM anon;` |
| `payments` | **High** | Same pattern as invoices |
| `employees` | **High** | Same pattern; REVOKE anon explicitly |
| `user_2fa_settings` | **Critical** | `REVOKE ALL ON public.user_2fa_settings FROM authenticated, anon; GRANT SELECT(id,user_id,is_enabled,...) TO authenticated;` |
| `platform_admins` | **Critical** | `REVOKE ALL FROM authenticated, anon; GRANT SELECT ON public.platform_admins TO service_role;` |
| `platform_audit_logs` | **High** | `REVOKE ALL FROM anon; GRANT SELECT, INSERT ON public.platform_audit_logs TO authenticated;` |
| `audit_trail` | **High** | `REVOKE ALL FROM anon; GRANT INSERT ON public.audit_trail TO authenticated;` |
| `chart_of_accounts` | **High** | `REVOKE ALL FROM anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_of_accounts TO authenticated;` |
| `journals` | **High** | Same as chart_of_accounts |
| `journal_entries` | **High** | Same as chart_of_accounts |
| `rate_limits` | **Medium** | `REVOKE ALL FROM anon; GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO authenticated;` |
| `domain_events` | **Medium** | `REVOKE ALL FROM anon, authenticated; GRANT INSERT ON public.domain_events TO authenticated;` |
| `slow_queries_log` | **Medium** | `REVOKE ALL FROM anon; GRANT INSERT ON public.slow_queries_log TO authenticated;` |
| `sod_rules` | **Medium** | `REVOKE ALL FROM anon; GRANT SELECT ON public.sod_rules TO authenticated;` |
| *(82 further tables)* | **High** | Apply `REVOKE ALL FROM anon` + explicit authenticated GRANT on every table |

> **Systemic Fix:** Add a migration that issues `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` followed by targeted per-table `GRANT` statements. Then set `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;` so future tables are safe by default.

---

## Section 2 — Tables With RLS Disabled

**Result: NONE.** All 101 tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the migrations. ✅

> Note: `chart_of_accounts`, `fiscal_periods`, `journals`, `journal_entries`, and `user_2fa_settings` were created without the `public.` prefix but still land in the `public` schema and have RLS enabled.

---

## Section 3 — RLS Enabled But No / Incomplete Policies

These tables have RLS on but lack policies for one or more DML operations, leaving those operations silently blocked for all PostgREST roles (service_role bypasses RLS).

| Table | Missing Policies | Impact | Severity | Fix |
|---|---|---|---|---|
| `platform_admins` | INSERT, UPDATE, DELETE | No admin can be added/removed via PostgREST; bootstrap only via service_role or migrations — **intentional but undocumented** | **High** | Add explicit service_role-only INSERT/UPDATE/DELETE policies or document that management is migration-only |
| `rate_limit_config` | DELETE | Stale rate-limit config rows cannot be removed via API | **Medium** | Add `DELETE` policy gated on `platform_admins` membership |
| `sod_rules` | INSERT, UPDATE, DELETE (no DROPs found for old ALL policy; check live DB) | Segregation-of-duties rules may be unmanageable via API | **Medium** | Add admin-scoped DML policies with tenant isolation |
| `document_posting_log` | SELECT | `REVOKE INSERT, UPDATE, DELETE FROM authenticated, anon` was applied but no SELECT policy exists → log is write-only from PostgREST | **High** | Add `SELECT` policy for `admin` role scoped to `tenant_id`; or keep fully service_role-only and document it |
| `event_metrics` | INSERT, UPDATE, DELETE | Metrics can only be read by admins, never written via PostgREST (likely correct, but undocumented) | **Low** | Add comment; grant INSERT to service_role only |

---

## Section 4 — Policies Missing `tenant_id` Filter

This is the **most critical systemic finding**. The project added `tenant_id` columns to 30+ tables via `ALTER TABLE ... ADD COLUMN tenant_id UUID` migrations, but **never dropped the original RLS policies** on many of those tables. As a result, an authenticated user from Tenant A can read and write Tenant B's data.

### Confirmed Un-isolated Tables (old policy never dropped, no tenant_id guard)

| Table | Offending Policy | Operation | USING / WITH CHECK Clause | Severity |
|---|---|---|---|---|
| `company_settings` | "Authenticated users can view settings" | SELECT | `USING (true)` | **Critical** |
| `company_settings` | "Admins can manage settings" | ALL | `USING (has_role(...,'admin'))` | **Critical** |
| `product_categories` | "Authenticated can view categories" | SELECT | `USING (true)` | **Critical** |
| `product_categories` | "Admin or warehouse can manage categories" | ALL | `USING (has_role(...))` | **Critical** |
| `product_variants` | "Authenticated can view variants" | SELECT | `USING (true)` | **Critical** |
| `product_variants` | "Admin or warehouse can manage variants" | ALL | `USING (has_role(...))` | **Critical** |
| `customer_categories` | "Authenticated can view customer categories" | SELECT | `USING (true)` | **Critical** |
| `customer_categories` | "Admin can manage customer categories" | ALL | `USING (has_role(...,'admin'))` | **Critical** |
| `custom_roles` | "Authenticated can view custom roles" | SELECT | `USING (true)` | **Critical** |
| `custom_roles` | "Admins can manage custom roles" | ALL | `USING (has_role(...,'admin'))` | **Critical** |
| `role_section_permissions` | "Authenticated can view section permissions" | SELECT | `USING (true)` | **High** |
| `role_field_permissions` | "Authenticated can view field permissions" | SELECT | `USING (true)` | **High** |
| `role_limits` | "Authenticated can view role limits" | SELECT | `USING (true)` | **High** |
| `section_customizations` | "Authenticated can view section customizations" | SELECT | `USING (true)` | **High** |
| `tasks` | "Users can view assigned tasks" | SELECT | `USING (assigned_to = auth.uid() OR created_by = auth.uid() OR has_role(...))` | **High** |
| `tasks` | "Authenticated can create tasks" | INSERT | `WITH CHECK (true)` | **High** |
| `notifications` | "Users can view own notifications" | SELECT | `USING (user_id = auth.uid())` *(no tenant check)* | **High** |
| `export_templates` | "Users can view templates" | SELECT | `USING (true)` | **High** |
| `activity_logs` | "Authenticated can insert activity logs" | INSERT | `WITH CHECK (true)` | **High** |
| `system_settings` | (various) | SELECT/INSERT/UPDATE | `USING (true)` | **High** |
| `report_templates` | "Users can manage own templates" | ALL | No tenant_id check | **High** |
| `expense_categories` | "Authenticated can view expense categories" | SELECT | `USING (true)` | **High** |
| `cash_registers` | (SELECT policy) | SELECT | `USING (true)` | **High** |
| `cash_transactions` | (SELECT policy) | SELECT | `USING (true)` | **High** |
| `bank_accounts` | (SELECT policy) | SELECT | `USING (true)` | **High** |
| `customer_communications` | (SELECT policy) | SELECT | `USING (true)` | **High** |
| `customer_reminders` | "Users can view reminders" | SELECT | `USING (true)` | **High** |
| `rate_limit_config` | (SELECT + ALL policy) | ALL | `USING (true)` | **Medium** |

### Tables Correctly Updated (tenant_id filter present) ✅

`customers`, `invoices`, `invoice_items`, `payments`, `quotations`, `quotation_items`, `sales_orders`, `sales_order_items`, `purchase_orders`, `purchase_order_items`, `suppliers`, `products`, `employees`, `journals`, `journal_entries`, `chart_of_accounts`, `fiscal_periods`, `audit_trail`, `domain_events`, `slow_queries_log`, `warehouses`, `product_stock`, `stock_movements`

### Systemic Fix Pattern

```sql
-- Example for company_settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.company_settings;

CREATE POLICY "Tenant-scoped view settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant-scoped admin manage settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (
    tenant_id = public.get_current_tenant()
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND public.has_role(auth.uid(), 'admin')
  );
```

Apply the same pattern to all 28 tables listed above.

---

## Section 5 — Over-Permissive anon Grants

No explicit `GRANT ... TO anon` was found in any migration file. However, the **Supabase project default privileges** grant `SELECT, INSERT, UPDATE, DELETE` on all `public` schema tables to the `anon` role. Since 94 tables have no explicit REVOKE, anon clients can reach every table's PostgREST endpoint. Protection relies entirely on RLS policies specifying `TO authenticated`.

### Risk Matrix

| Scenario | Tables Affected | Risk |
|---|---|---|
| RLS policy omits `TO authenticated` clause (applies to ALL roles incl. anon) | `profiles`, `user_roles`, `notifications` (older policies), `company_settings`, etc. | **High** — anon `auth.uid()` returns NULL; USING clauses that compare to NULL evaluate false, so practically blocked, but this is fragile |
| Supabase default grants removed (e.g., self-hosted migration) | All 94 tables without explicit GRANT | **High** — PostgREST would return permission-denied for authenticated users |
| `USING (true)` policy without `TO authenticated` | `system_settings`, `expense_categories`, old policies | **Critical** — anon can read these if default grants remain |

### Recommended Fix

```sql
-- Run once as superuser / migration
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- Then for each table that truly needs anon access (none identified):
-- GRANT SELECT ON public.<table> TO anon;
```

---

## Section 6 — Sensitive Column Exposure

### `public.user_2fa_settings`

| Column | Type | Exposure Risk | Severity |
|---|---|---|---|
| `secret_key` | `TEXT` (TOTP secret, described as encrypted) | Multiple conflicting `REVOKE SELECT (secret_key, backup_codes)` statements across migrations — the **latest** revokes both from `authenticated` and `anon`, but the column-level revoke pattern is inconsistently applied across versions, raising re-exposure risk on re-run | **Critical** |
| `secret_encrypted` | `TEXT` | A later migration adds this column and revokes it in the same set, but an earlier revoke omitted it — order of migrations matters | **Critical** |
| `backup_codes` | `TEXT[]` | Same as above | **Critical** |

**Fix:** Enforce via a view pattern — expose only `(id, user_id, is_enabled, enabled_at, last_used_at)` via PostgREST and block the table entirely:
```sql
REVOKE ALL ON public.user_2fa_settings FROM authenticated, anon;
-- All 2FA operations go through SECURITY DEFINER functions only
```

### `public.user_login_history`

| Column | Concern | Severity | Fix |
|---|---|---|---|
| `ip_address TEXT` | PII — user's login IP readable by that user (policy: `user_id = auth.uid()`). No tenant isolation means cross-tenant user shadowing risk if user_id is known | **High** | Add `tenant_id` column + filter; consider masking last octet |
| `user_agent TEXT` | Device fingerprint — PII | **Medium** | Same isolation fix |

### `public.audit_trail`

| Column | Concern | Severity | Fix |
|---|---|---|---|
| `before_value JSONB` | May contain full row snapshots including any sensitive fields present at time of change | **High** | Ensure SELECT policy remains admin-only; add field scrubbing in `track_changes()` trigger for known sensitive columns |
| `after_value JSONB` | Same concern | **High** | Same |

### `public.activity_logs`

| Column | Concern | Severity | Fix |
|---|---|---|---|
| `details JSONB` | Free-form action details — may include PII/sensitive business data | **Medium** | INSERT policy uses `WITH CHECK (true)` (any authenticated user can write any log entry) — add `WITH CHECK (tenant_id = get_current_tenant())` |

### `public.platform_audit_logs`

| Column | Concern | Severity | Fix |
|---|---|---|---|
| `details JSONB` | Platform-level admin actions including tenant creation, user management | **High** | Currently only platform_admins can SELECT — correct; ensure no INSERT policy allows non-platform-admins to pollute the log |

---

## Top 10 Priority Fixes

| # | Finding | Table(s) | Severity | One-Line Fix |
|---|---|---|---|---|
| 1 | `user_2fa_settings` secret columns re-exposed via incremental migrations | `user_2fa_settings` | **Critical** | `REVOKE ALL ON public.user_2fa_settings FROM authenticated, anon;` — expose only via SECURITY DEFINER functions |
| 2 | Cross-tenant data leakage: `USING (true)` policies on core config tables | `company_settings`, `custom_roles`, `product_categories`, `system_settings` | **Critical** | Drop old policies; re-create with `tenant_id = public.get_current_tenant()` guard on every USING clause |
| 3 | Cross-tenant leakage on finance/operational tables | `cash_registers`, `cash_transactions`, `bank_accounts`, `expense_categories` | **Critical** | Same tenant_id filter pattern; the tenant_id columns already exist — just update the policies |
| 4 | `task` INSERT allows cross-tenant task injection | `tasks` | **High** | Replace `WITH CHECK (true)` with `WITH CHECK (tenant_id = public.get_current_tenant())` |
| 5 | Systemic anon grant exposure (schema defaults) | All 94 tables | **High** | `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` + `ALTER DEFAULT PRIVILEGES ... REVOKE ALL ON TABLES FROM anon;` |
| 6 | No explicit GRANTs on 94 tables | All 94 non-granted tables | **High** | Add per-table `GRANT` migration; never rely on schema defaults |
| 7 | `audit_trail` SELECT policy readable only with admin+tenant — but INSERT `WITH CHECK (true)` allows any auth user to inject fake audit entries | `audit_trail` | **High** | Change INSERT `WITH CHECK` to `WITH CHECK (tenant_id = public.get_current_tenant() AND auth.uid() IS NOT NULL)` |
| 8 | `activity_logs` INSERT is unrestricted (`WITH CHECK (true)`) and has no tenant_id filter | `activity_logs` | **High** | `DROP POLICY "Authenticated can insert activity logs"; CREATE POLICY ... WITH CHECK (tenant_id = public.get_current_tenant());` |
| 9 | `user_login_history` and `notifications` (SELECT) lack tenant_id isolation | `user_login_history`, `notifications` | **High** | Add `AND tenant_id = public.get_current_tenant()` to all USING clauses on these tables |
| 10 | `document_posting_log` has no SELECT policy — write-only for all PostgREST roles; admins cannot audit posting failures | `document_posting_log` | **High** | Add `SELECT` policy restricted to `admin` role + tenant_id; or explicitly grant SELECT to service_role and document it |

---

## Appendix — Audit Methodology

All findings are derived from static analysis of `/dev-server/supabase/migrations/*.sql` using `rg`, `grep`, and `comm`. No live database was queried. Findings are based on the **net effective state** after all migrations are applied in order, accounting for `DROP POLICY IF EXISTS` / re-create patterns observed in the migrations.

**Key functions referenced in policies:**
- `public.get_current_tenant()` — tenant isolation helper (used correctly in newer policies)
- `public.has_role(auth.uid(), role)` — role check (correct but incomplete without tenant_id guard)
- `auth.uid()` — Supabase auth user ID

**Confidence levels:** Policies confirmed dropped and re-created are marked ✅. Tables where DROP was not observed retain both old and new policies simultaneously — PostgreSQL evaluates multiple policies with OR logic (permissive) meaning the less restrictive old policy wins.
