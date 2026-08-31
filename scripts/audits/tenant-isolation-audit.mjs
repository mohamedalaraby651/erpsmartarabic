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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

/** Tables whose write was denied by a business-invariant trigger firing before RLS. */
const DENIED_BY_BUSINESS_INVARIANT = new Set(["journals", "journal_entries"]);

/**
 * Live cross-tenant denial probe (X-7).
 *
 * The probe re-homes the acting user to a throw-away tenant, drops the session
 * to `authenticated`, and asserts that SELECT / UPDATE / DELETE against the
 * original tenant return or affect zero rows and that an INSERT carrying a
 * foreign tenant_id is rejected. The whole probe runs inside a transaction
 * that is aborted by design, so nothing is persisted.
 *
 * It requires a connection role allowed to `SET ROLE authenticated`. When the
 * connection cannot do that (read-only audit roles), previously recorded probe
 * evidence in the existing report is PRESERVED verbatim and flagged as such —
 * evidence is never fabricated and never silently refreshed.
 */
function probeSql(tables) {
  const list = tables.map((t) => `'${t}'`).join(",");
  return `DO $$
DECLARE
  actor uuid; home uuid; probe uuid := '00000000-0000-4000-8000-0000000000ff';
  tbl text; vis bigint; upd bigint; del bigint; ins_denied boolean; ins_note text; src boolean;
  out jsonb := '[]'::jsonb;
  tables text[] := ARRAY[${list}];
BEGIN
  SELECT user_id, tenant_id INTO actor, home FROM public.user_tenants LIMIT 1;
  INSERT INTO public.tenants (id, name, slug) VALUES (probe, 'PH1A probe', 'ph1a-probe');
  UPDATE public.user_tenants SET tenant_id = probe WHERE user_id = actor;
  FOREACH tbl IN ARRAY tables LOOP
    ins_denied := NULL; ins_note := NULL;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE tenant_id=$1)', tbl) INTO src USING home;
    PERFORM set_config('role','authenticated',true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub',actor,'role','authenticated')::text, true);
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id=$1', tbl) INTO vis USING home;
    EXECUTE format('WITH u AS (UPDATE public.%I SET tenant_id=tenant_id WHERE tenant_id=$1 RETURNING 1) SELECT count(*) FROM u', tbl) INTO upd USING home;
    EXECUTE format('WITH d AS (DELETE FROM public.%I WHERE tenant_id=$1 RETURNING 1) SELECT count(*) FROM d', tbl) INTO del USING home;
    PERFORM set_config('role','none',true);
    IF src THEN
      BEGIN
        EXECUTE format('CREATE TEMP TABLE _ph1a_src AS SELECT * FROM public.%I WHERE tenant_id=$1 LIMIT 1', tbl) USING home;
        EXECUTE 'UPDATE _ph1a_src SET id = gen_random_uuid()';
        EXECUTE 'GRANT SELECT ON _ph1a_src TO authenticated';
        PERFORM set_config('role','authenticated',true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub',actor,'role','authenticated')::text, true);
        EXECUTE format('INSERT INTO public.%I SELECT * FROM _ph1a_src', tbl);
        ins_denied := false; ins_note := 'INSERT with foreign tenant_id SUCCEEDED — VIOLATION';
      EXCEPTION WHEN OTHERS THEN
        ins_denied := true; ins_note := left(SQLERRM, 140);
      END;
      PERFORM set_config('role','none',true);
      EXECUTE 'DROP TABLE IF EXISTS _ph1a_src';
    ELSE
      ins_note := 'no source row for this tenant — insert probe not applicable';
    END IF;
    out := out || jsonb_build_object('table_name',tbl,'foreign_rows_visible',vis,
      'update_affected',upd,'delete_affected',del,'select_denied',vis=0,
      'update_denied',upd=0,'delete_denied',del=0,'insert_denied',ins_denied,'note',ins_note);
  END LOOP;
  RAISE EXCEPTION 'PH1A_PROBE_RESULT %', out::text;
END $$;`;
}

function runProbes() {
  try {
    execFileSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", probeSql(PROBE_FAMILIES)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { supported: false, reason: "probe did not abort as designed", results: [] };
  } catch (e) {
    const msg = String(e.stderr || e.message || e);
    const m = msg.match(/PH1A_PROBE_RESULT (\[.*\])/s);
    if (m) {
      const results = JSON.parse(m[1]).map((r) => ({
        ...r,
        denied_by: DENIED_BY_BUSINESS_INVARIANT.has(r.table_name)
          ? "business-invariant trigger (fires before RLS); write denied"
          : "row-level security policy",
      }));
      return {
        supported: true,
        source: "live",
        executedAt: new Date().toISOString(),
        results,
      };
    }
    // Connection role cannot SET ROLE — preserve recorded evidence as lineage.
    let preserved = null;
    try {
      preserved = JSON.parse(readFileSync(OUT, "utf8")).crossTenantProbes;
    } catch {
      /* no prior evidence */
    }
    if (preserved && preserved.results?.length) {
      return { ...preserved, source: "preserved", preservedReason: msg.slice(0, 200) };
    }
    return { supported: false, reason: msg.slice(0, 300), results: [] };
  }
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
if (!probes.results?.length) failures.push("X-7: no cross-tenant probe evidence available");
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
