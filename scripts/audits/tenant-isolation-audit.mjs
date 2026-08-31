#!/usr/bin/env node
/**
 * PH1A-NAZRA-001 · BND-05 — Tenant → Data completeness audit.
 *
 * Produces `scripts/audits/output/tenant-isolation-report.json`, the single
 * evidence artifact for exit criteria X-1 … X-8:
 *
 *   X-1 tenant_id uuid NOT NULL + FK + index on every tenant-scoped table
 *   X-2 RLS enabled on every one of them
 *   X-3 four tenant-asserting policies (SELECT/INSERT/UPDATE/DELETE)
 *   X-4 explicit GRANTs consistent with the policies
 *   X-5 tenant identity derived server-side (get_current_tenant → auth.uid())
 *   X-6 tenant-scoped RPC inventory
 *   X-7 live cross-tenant denial probes (executed inside a rolled-back tx)
 *   X-8 the chain is closed by check-tenant-column-and-rls-completeness.mjs
 *
 * Requires `SUPABASE_DB_URL` (or PG* env). Without it the script exits 2 and
 * writes nothing — evidence is never fabricated.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "output/tenant-isolation-report.json");

/** Tables that legitimately carry no tenant_id, with the reason. */
export const EXEMPTIONS = {
  tenants: "tenant registry itself — the root of the boundary",
  user_tenants: "membership table — cross-tenant by design, authority source",
  platform_admins: "platform plane, above tenants",
  platform_audit_logs: "platform plane, above tenants",
  rate_limit_config: "platform-wide configuration",
  event_metrics: "platform-wide aggregate metrics",
  dispatcher_batch_runs: "platform dispatcher plane",
  profiles: "user-scoped (auth.uid), not tenant-scoped",
  sync_logs: "user-scoped (auth.uid)",
  user_2fa_settings: "user-scoped (auth.uid)",
  user_dashboard_settings: "user-scoped (auth.uid)",
  user_login_history: "user-scoped (auth.uid)",
  user_notification_settings: "user-scoped (auth.uid)",
  user_offline_settings: "user-scoped (auth.uid)",
  user_preferences: "user-scoped (auth.uid)",
  user_sidebar_settings: "user-scoped (auth.uid)",
};

const DB = process.env.SUPABASE_DB_URL || process.env.DB_URL;
if (!DB) {
  console.error("[tenant-isolation-audit] SUPABASE_DB_URL is required");
  process.exit(2);
}

function q(sql) {
  const raw = execFileSync("psql", [DB, "-At", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return raw.trim() ? JSON.parse(raw.trim()) : [];
}

const jsonWrap = (inner) => `select coalesce(json_agg(t), '[]'::json) from (${inner}) t`;

// ---------------------------------------------------------------- X-1 … X-4
const tables = q(
  jsonWrap(`
  with base as (
    select c.oid, c.relname, c.relrowsecurity,
           a.attnum, a.attnotnull,
           format_type(a.atttypid, a.atttypmod) as coltype
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
     where n.nspname = 'public' and c.relkind = 'r'
       and a.attname = 'tenant_id' and not a.attisdropped
  )
  select b.relname as table_name,
         b.coltype as tenant_id_type,
         b.attnotnull as not_null,
         b.relrowsecurity as rls_enabled,
         exists(select 1 from pg_constraint k
                 where k.conrelid = b.oid and k.contype = 'f'
                   and k.conkey = array[b.attnum]) as has_fk,
         exists(select 1 from pg_index i
                 where i.indrelid = b.oid and b.attnum = any(i.indkey)) as has_index,
         (select count(*) from pg_policy p
           where p.polrelid = b.oid and not p.polpermissive
             and p.polcmd = 'r'
             and pg_get_expr(p.polqual, p.polrelid) like '%get_current_tenant%') as tenant_select,
         (select count(*) from pg_policy p
           where p.polrelid = b.oid and not p.polpermissive
             and p.polcmd = 'a'
             and pg_get_expr(p.polwithcheck, p.polrelid) like '%get_current_tenant%') as tenant_insert,
         (select count(*) from pg_policy p
           where p.polrelid = b.oid and not p.polpermissive
             and p.polcmd = 'w'
             and pg_get_expr(p.polqual, p.polrelid) like '%get_current_tenant%'
             and pg_get_expr(p.polwithcheck, p.polrelid) like '%get_current_tenant%') as tenant_update,
         (select count(*) from pg_policy p
           where p.polrelid = b.oid and not p.polpermissive
             and p.polcmd = 'd'
             and pg_get_expr(p.polqual, p.polrelid) like '%get_current_tenant%') as tenant_delete,
         has_table_privilege('authenticated', b.oid, 'SELECT') as grant_auth_select,
         has_table_privilege('authenticated', b.oid, 'INSERT') as grant_auth_insert,
         has_table_privilege('authenticated', b.oid, 'UPDATE') as grant_auth_update,
         has_table_privilege('authenticated', b.oid, 'DELETE') as grant_auth_delete,
         has_table_privilege('service_role', b.oid, 'SELECT') as grant_service
    from base b
   order by b.relname`),
);

const missingTenantColumn = q(
  jsonWrap(`
  select c.relname as table_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from pg_attribute a
                      where a.attrelid = c.oid and a.attname = 'tenant_id'
                        and not a.attisdropped)
   order by 1`),
).map((r) => r.table_name);

// ------------------------------------------------------------------- X-5/X-6
const tenantAuthority = q(
  jsonWrap(`
  select p.proname, pg_get_functiondef(p.oid) like '%auth.uid()%' as uses_jwt_identity,
         p.prosecdef as security_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('get_current_tenant','current_tenant','get_user_tenant_id','is_tenant_member')
   order by 1`),
);

const rpcs = q(
  jsonWrap(`
  select p.proname,
         (pg_get_functiondef(p.oid) like '%get_current_tenant%'
          or pg_get_functiondef(p.oid) like '%current_tenant%'
          or pg_get_functiondef(p.oid) like '%is_tenant_member%'
          or pg_get_functiondef(p.oid) like '%is_platform_admin%') as has_tenant_check,
         pg_get_functiondef(p.oid) like '%tenant_id%' as references_tenant
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and pg_get_functiondef(p.oid) like '%tenant%'
   order by 1`),
);

// ----------------------------------------------------------------------- X-7
const PROBE_FAMILIES = [
  "customers", "invoices", "invoice_items", "payments", "products",
  "product_stock", "stock_movements", "journals", "journal_entries",
  "expenses", "suppliers", "purchase_orders", "quotations", "employees",
  "activity_logs", "audit_trail", "chart_of_accounts", "notifications",
];

/**
 * Live cross-tenant denial probe.
 *
 * Each probe runs inside a transaction that is ALWAYS rolled back:
 *   1. a probe tenant is created and the acting user is re-homed to it,
 *   2. a copy of one home-tenant row is staged (superuser, satisfies all
 *      column constraints) with a fresh id,
 *   3. the session drops to `authenticated` with the real JWT claims,
 *   4. SELECT / INSERT / UPDATE / DELETE against the *foreign* tenant must
 *      all be denied — reads return zero rows, writes affect zero rows, and
 *      the INSERT must fail with a row-level-security error.
 */
function runProbes() {
  const results = [];
  const seed = q(
    jsonWrap("select user_id, tenant_id from public.user_tenants limit 1"),
  )[0];
  if (!seed) return { supported: false, reason: "no user_tenants row to act as", results };
  const { user_id: actor, tenant_id: homeTenant } = seed;
  const PROBE_TENANT = "00000000-0000-4000-8000-0000000000ff";
  const claims = `{"sub":"${actor}","role":"authenticated"}`;

  const preamble = `
      insert into public.tenants (id, name, slug)
        values ('${PROBE_TENANT}', 'PH1A probe', 'ph1a-probe');
      update public.user_tenants set tenant_id = '${PROBE_TENANT}'
       where user_id = '${actor}';`;

  for (const t of PROBE_FAMILIES) {
    const row = { table_name: t, error: null };

    // --- SELECT / UPDATE / DELETE denial -------------------------------
    const rwSql = `begin;${preamble}
      set local role authenticated;
      set local request.jwt.claims = '${claims}';
      select json_build_object(
        'foreign_rows_visible', (select count(*) from public.${t} where tenant_id = '${homeTenant}'),
        'update_affected', (with u as (update public.${t} set tenant_id = tenant_id
                                        where tenant_id = '${homeTenant}' returning 1)
                            select count(*) from u),
        'delete_affected', (with d as (delete from public.${t}
                                        where tenant_id = '${homeTenant}' returning 1)
                            select count(*) from d));
      rollback;`;
    try {
      const raw = execFileSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", rwSql], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      const line = raw.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      const parsed = JSON.parse(line);
      row.foreign_rows_visible = Number(parsed.foreign_rows_visible);
      row.update_affected = Number(parsed.update_affected);
      row.delete_affected = Number(parsed.delete_affected);
      row.select_denied = row.foreign_rows_visible === 0;
      row.update_denied = row.update_affected === 0;
      row.delete_denied = row.delete_affected === 0;
    } catch (e) {
      row.select_denied = false;
      row.update_denied = false;
      row.delete_denied = false;
      row.error = String(e.stderr || e.message || e).slice(0, 400);
    }

    // --- INSERT denial (constraint-safe clone of a real row) -----------
    const hasSource = q(
      jsonWrap(`select 1 as x from public.${t} where tenant_id = '${homeTenant}' limit 1`),
    ).length > 0;
    if (!hasSource) {
      row.insert_denied = null;
      row.insert_note = "no source row for this tenant — insert probe not applicable";
    } else {
      const insSql = `begin;${preamble}
        create temporary table _ph1a_src on commit drop as
          select * from public.${t} where tenant_id = '${homeTenant}' limit 1;
        update _ph1a_src set id = gen_random_uuid();
        set local role authenticated;
        set local request.jwt.claims = '${claims}';
        insert into public.${t} select * from _ph1a_src;
        rollback;`;
      try {
        execFileSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", insSql], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        row.insert_denied = false;
        row.insert_note = "INSERT with foreign tenant_id succeeded — VIOLATION";
      } catch (e) {
        const msg = String(e.stderr || e.message || e);
        row.insert_denied = /row-level security/i.test(msg);
        row.insert_note = row.insert_denied
          ? "rejected by row-level security policy"
          : msg.slice(0, 300);
      }
    }

    results.push(row);
  }
  return { supported: true, actor, homeTenant, probeTenant: PROBE_TENANT, results };
}

const probes = runProbes();

// ------------------------------------------------------------------ verdicts
const scoped = tables.filter((t) => t.table_name !== "user_tenants");
const failures = [];
for (const t of scoped) {
  if (t.tenant_id_type !== "uuid" || !t.not_null) failures.push(`${t.table_name}: X-1 column`);
  if (!t.has_fk) failures.push(`${t.table_name}: X-1 fk`);
  if (!t.has_index) failures.push(`${t.table_name}: X-1 index`);
  if (!t.rls_enabled) failures.push(`${t.table_name}: X-2 rls`);
  if (!(t.tenant_select && t.tenant_insert && t.tenant_update && t.tenant_delete))
    failures.push(`${t.table_name}: X-3 verb coverage`);
  if (!(t.grant_auth_select && t.grant_auth_insert && t.grant_auth_update && t.grant_auth_delete && t.grant_service))
    failures.push(`${t.table_name}: X-4 grants`);
}
const unexplained = missingTenantColumn.filter((t) => !(t in EXEMPTIONS));
for (const t of unexplained) failures.push(`${t}: X-1 missing tenant_id without exemption`);

const probeFailures = (probes.results || []).filter(
  (r) =>
    !(r.select_denied && r.update_denied && r.delete_denied) ||
    r.insert_denied === false,
);
for (const r of probeFailures) failures.push(`${r.table_name}: X-7 cross-tenant denial`);

const report = {
  id: "PH1A-TENANT-ISOLATION",
  boundary: "BND-05",
  contract: "PH1A-NAZRA-001",
  generatedAt: new Date().toISOString(),
  authority: "public.get_current_tenant() → auth.uid() (server-side, JWT-derived)",
  summary: {
    tenantScopedTables: scoped.length,
    exemptTables: missingTenantColumn.length,
    unexplainedExemptions: unexplained.length,
    x1_column_fk_index: scoped.filter((t) => t.not_null && t.has_fk && t.has_index).length,
    x2_rls_enabled: scoped.filter((t) => t.rls_enabled).length,
    x3_four_verb_tenant_policies: scoped.filter(
      (t) => t.tenant_select && t.tenant_insert && t.tenant_update && t.tenant_delete,
    ).length,
    x4_grants: scoped.filter((t) => t.grant_auth_select && t.grant_service).length,
    x6_tenant_rpcs: rpcs.length,
    x6_tenant_rpcs_with_check: rpcs.filter((r) => r.has_tenant_check).length,
    x7_probe_tables: (probes.results || []).length,
    x7_probe_failures: probeFailures.length,
    failures: failures.length,
  },
  tables: scoped,
  exemptions: missingTenantColumn.map((t) => ({ table: t, reason: EXEMPTIONS[t] ?? null })),
  tenantAuthority,
  rpcs,
  crossTenantProbes: probes,
  failures,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[tenant-isolation-audit] tables=${scoped.length} failures=${failures.length} probes=${
    (probes.results || []).length
  } probeFailures=${probeFailures.length} → ${OUT}`,
);
process.exit(failures.length === 0 ? 0 : 1);
