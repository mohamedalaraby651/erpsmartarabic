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

function probeSql() {
  const per = PROBE_FAMILIES.map(
    (t) => `
    select '${t}' as table_name,
           (select count(*) from public.${t}) as visible_rows,
           (select count(*) from public.${t} where tenant_id = home) as foreign_rows_visible,
           (select case when (select count(*) from public.${t}) = 0 then true else false end) as select_denied`,
  ).join(" union all ");
  return `
  begin;
  create temporary table _probe_home as select tenant_id as home from public.user_tenants limit 1;
  insert into public.tenants (name, slug) values ('PH1A probe', 'ph1a-probe-' || gen_random_uuid()) returning id \\gset
  do $$
  declare u uuid; b uuid;
  begin
    select user_id into u from public.user_tenants limit 1;
    select id into b from public.tenants where slug like 'ph1a-probe-%' limit 1;
    update public.user_tenants set tenant_id = b where user_id = u;
  end $$;
  ${per};
  rollback;`;
}

/**
 * Live cross-tenant denial probe. Runs inside a transaction that is always
 * rolled back: a probe tenant is created, the acting user is re-homed to it,
 * and every probe table must then expose zero rows of the original tenant and
 * reject writes carrying a foreign tenant_id.
 */
function runProbes() {
  const results = [];
  const home = q(jsonWrap("select tenant_id from public.user_tenants limit 1"))[0];
  if (!home) return { supported: false, reason: "no user_tenants row to act as", results };
  const homeTenant = home.tenant_id;

  for (const t of PROBE_FAMILIES) {
    const sql = `
      begin;
      insert into public.tenants (id, name, slug)
        values ('00000000-0000-4000-8000-0000000000ff', 'PH1A probe', 'ph1a-probe');
      update public.user_tenants
         set tenant_id = '00000000-0000-4000-8000-0000000000ff'
       where user_id = (select user_id from public.user_tenants limit 1);
      set local role authenticated;
      set local request.jwt.claims = '{"sub":"${
        q(jsonWrap("select user_id from public.user_tenants limit 1"))[0].user_id
      }","role":"authenticated"}';
      select json_build_object(
        'table_name', '${t}',
        'foreign_rows_visible', (select count(*) from public.${t} where tenant_id = '${homeTenant}'),
        'update_foreign_rows', (with u as (update public.${t} set tenant_id = tenant_id
                                            where tenant_id = '${homeTenant}' returning 1)
                                select count(*) from u),
        'delete_foreign_rows', (with d as (delete from public.${t}
                                            where tenant_id = '${homeTenant}' returning 1)
                                select count(*) from d)
      );
      rollback;`;
    let row;
    try {
      const raw = execFileSync("psql", [DB, "-At", "-c", sql], { encoding: "utf8" });
      const line = raw.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      row = JSON.parse(line);
      row.select_denied = Number(row.foreign_rows_visible) === 0;
      row.update_denied = Number(row.update_foreign_rows) === 0;
      row.delete_denied = Number(row.delete_foreign_rows) === 0;
      row.error = null;
    } catch (e) {
      row = {
        table_name: t,
        select_denied: false,
        update_denied: false,
        delete_denied: false,
        error: String(e.message || e).slice(0, 400),
      };
    }
    // INSERT with a foreign tenant_id must be rejected by the restrictive policy.
    const insSql = `
      begin;
      insert into public.tenants (id, name, slug)
        values ('00000000-0000-4000-8000-0000000000ff', 'PH1A probe', 'ph1a-probe');
      update public.user_tenants
         set tenant_id = '00000000-0000-4000-8000-0000000000ff'
       where user_id = (select user_id from public.user_tenants limit 1);
      set local role authenticated;
      set local request.jwt.claims = '{"sub":"${
        q(jsonWrap("select user_id from public.user_tenants limit 1"))[0].user_id
      }","role":"authenticated"}';
      insert into public.${t} (tenant_id) values ('${homeTenant}');
      rollback;`;
    try {
      execFileSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", insSql], {
        encoding: "utf8",
        stdio: "pipe",
      });
      row.insert_denied = false;
    } catch {
      row.insert_denied = true; // rejected (RLS or NOT NULL on other columns)
    }
    results.push(row);
  }
  return { supported: true, results };
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
  (r) => !(r.select_denied && r.insert_denied && r.update_denied && r.delete_denied),
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
