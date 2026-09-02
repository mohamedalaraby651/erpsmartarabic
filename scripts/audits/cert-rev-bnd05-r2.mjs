#!/usr/bin/env node
/**
 * CERT-REV-BND05-R2 — independent certification review after REM-BND05-001.
 *
 * ZERO MUTATION of application code, schema or policies. The script only:
 *   1. re-proves R-1 … R-7 live, against a *fresh* throw-away foreign tenant,
 *      through PostgREST with a real authenticated user JWT;
 *   2. re-reads the live catalog for the seven remediated functions and
 *      compares their definition md5 to REM-BND05-001's declared postMd5;
 *   3. re-derives the PH1A observation set (tenant-referencing functions
 *      without an explicit predicate) from the live catalog;
 *   4. records the evidence lineage
 *      PH1A → CERT-REV-BND05 → REM-BND05-001 → migration → R2
 *      with sha256 of every upstream artifact, and any documented delta.
 *
 * It NEVER fixes anything. A failure ⇒ BND-05 stays HOLD and a new scoped
 * remediation (→ R3) is required.
 *
 * Output: scripts/audits/output/cert-rev-bnd05-r2.json
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const O = (f) => resolve(__dirname, "output", f);
const OUT = O("cert-rev-bnd05-r2.json");

const DB = process.env.SUPABASE_DB_URL || process.env.DB_URL;
const URL_ = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const JWT = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN;
if (!DB || !URL_ || !ANON || !JWT) {
  console.error("[cert-rev-bnd05-r2] missing DB url / project url / anon key / user JWT");
  process.exit(2);
}

const sql = (s) =>
  execFileSync("psql", [DB, "-At", "-c", s], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
const jsonq = (s) => {
  const raw = sql(s);
  return raw ? JSON.parse(raw) : [];
};
const sha256 = (p) => (existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : null);

async function rest(path, init) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${JWT}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return { status: r.status, body: (await r.text()).slice(0, 800) };
}
const rpc = (fn, args) => rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args ?? {}) });

// ── fresh fixture namespace, distinct from the REM post-proof run ───────────
const T = "eeeeeeee-0000-0000-0000-00000000000a";
const INV = "eeeeeeee-0000-0000-0000-0000000000f1";
const C1 = "eeeeeeee-0000-0000-0000-0000000000c1";
const C2 = "eeeeeeee-0000-0000-0000-0000000000c2";
const PER = "eeeeeeee-0000-0000-0000-0000000000fa";
const MARK = "ZZQX Testov R2 Foreign";

const CLEANUP = [
  `delete from public.invoice_items where tenant_id='${T}';`,
  `delete from public.invoices where tenant_id='${T}';`,
  `delete from public.customers where tenant_id='${T}';`,
  `delete from public.fiscal_periods where tenant_id='${T}';`,
  `delete from public.user_tenants where tenant_id='${T}';`,
  `delete from public.activity_logs where tenant_id='${T}';`,
  `delete from public.audit_trail where tenant_id='${T}';`,
  `delete from public.tenants where id='${T}';`,
];

/** Per-statement, permission-tolerant: one denied table must not abort the rest. */
function cleanup() {
  const denied = [];
  for (const stmt of CLEANUP) {
    try {
      sql(stmt);
    } catch (e) {
      denied.push({ stmt, error: e.message.split("\n").find((l) => l.includes("ERROR")) ?? "unknown" });
    }
  }
  let residual = null;
  try {
    residual = Number(sql(`select count(*) from public.tenants where id='${T}';`));
  } catch {
    /* ignore */
  }
  return { denied, residualTenantRows: residual, state: denied.length === 0 ? "deleted" : "partial" };
}

const results = [];
let cleanupState = null;
let actingTenant = null;
let actingUser = null;
let foreignUser = null;

try {
  cleanup();
  sql(`insert into public.tenants (id,name,slug,is_active)
       values ('${T}','CERT-REV-BND05-R2','cert-rev-bnd05-r2',true) on conflict (id) do nothing;`);
  sql(`insert into public.customers (id, tenant_id, name, phone)
       values ('${C1}','${T}','${MARK} One','01000000019'),
              ('${C2}','${T}','${MARK} Onee','01000000019') on conflict (id) do nothing;`);
  sql(`insert into public.invoices (id, tenant_id, invoice_number, customer_id,
                                    subtotal, total_amount, paid_amount, status)
       values ('${INV}','${T}','CERT-R2-INV-1','${C1}',100,100,0,'pending') on conflict (id) do nothing;`);
  sql(`insert into public.fiscal_periods (id, tenant_id, name, start_date, end_date, is_closed)
       values ('${PER}','${T}','CERT-R2 period', current_date - 1, current_date + 1, false)
       on conflict (id) do nothing;`);

  actingTenant = (await rpc("get_current_tenant")).body.replaceAll('"', "");
  const me = await fetch(`${URL_}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: `Bearer ${JWT}` },
  }).then((r) => r.json());
  actingUser = me?.id;
  if (!actingUser) throw new Error("could not resolve the acting user id from the JWT");
  foreignUser =
    sql(`select user_id from public.user_tenants where user_id <> '${actingUser}' limit 1;`) ||
    sql(`select id from public.profiles where id <> '${actingUser}' limit 1;`) ||
    "00000000-0000-0000-0000-0000000000ff";
  if (foreignUser !== actingUser) {
    try {
      sql(`insert into public.user_tenants (user_id, tenant_id, is_default)
           values ('${foreignUser}','${T}',false) on conflict do nothing;`);
    } catch {
      /* membership row is a convenience, not a precondition */
    }
  }

  const statusBefore = sql(`select status from public.invoices where id='${INV}';`);
  const r1 = await rpc("void_invoice", { _invoice_id: INV, _reason: "cert-rev-bnd05-r2" });
  const statusAfter = sql(`select status from public.invoices where id='${INV}';`);
  results.push({
    id: "R-1",
    severity: "critical",
    call: "void_invoice(foreign invoice)",
    ...r1,
    foreign_invoice_status_before: statusBefore,
    foreign_invoice_status_after: statusAfter,
    mutation_occurred: statusBefore !== statusAfter,
    // both properties are required: denial AND absence of mutation
    pass: r1.status >= 400 && statusAfter === statusBefore && statusAfter !== "cancelled",
  });

  const r2 = await rpc("find_duplicate_customers");
  results.push({
    id: "R-2",
    severity: "medium",
    call: "find_duplicate_customers()  (no argument)",
    ...r2,
    foreign_pii_returned: r2.body.includes(MARK),
    pass: !r2.body.includes(MARK),
    note:
      "Security containment achieved (no foreign PII disclosed). Functional capability is NOT restored: " +
      "pg_trgm is absent so similarity() is unresolvable — PRE-EXT-001, OPEN, outside BND-05 scope.",
  });

  const r2b = await rpc("find_duplicate_customers", { p_tenant_id: T });
  results.push({
    id: "R-2b",
    severity: "medium",
    call: "find_duplicate_customers(foreign tenant)",
    ...r2b,
    foreign_pii_returned: r2b.body.includes(MARK),
    pass: !r2b.body.includes(MARK) && r2b.status >= 400,
  });

  const r3 = await rpc("get_user_tenant_id", { _user_id: foreignUser });
  results.push({
    id: "R-3", severity: "low", call: "get_user_tenant_id(foreign user)", ...r3,
    pass: r3.status >= 400 || r3.body.trim() === "null",
  });

  const r4 = await rpc("get_user_tenants", { _user_id: foreignUser });
  results.push({
    id: "R-4", severity: "low", call: "get_user_tenants(foreign user)", ...r4,
    pass: r4.status >= 400 || r4.body.trim() === "[]",
  });

  const r5 = await rpc("is_period_closed", {
    _tenant_id: T, _date: new Date().toISOString().slice(0, 10),
  });
  results.push({ id: "R-5", severity: "low", call: "is_period_closed(foreign tenant)", ...r5, pass: r5.status >= 400 });

  const roleId = sql(`select id from public.custom_roles limit 1;`) || "00000000-0000-0000-0000-000000000000";
  const r6 = await rpc("is_admin_equivalent_custom_role", { _role_id: roleId, _tenant_id: T });
  results.push({
    id: "R-6", severity: "low", call: "is_admin_equivalent_custom_role(_, foreign tenant)", ...r6,
    pass: r6.status >= 400,
  });

  const r7 = await rpc("check_financial_limit", {
    _user_id: foreignUser, _tenant: T, _limit_type: "invoice", _amount: 1,
  });
  results.push({
    id: "R-7", severity: "low", call: "check_financial_limit(4-arg, foreign tenant)", ...r7,
    pass: r7.status >= 400,
  });

  // cross-tenant READ probes (BND-05 property, independent of the 7 functions)
  const readInv = await rest(`invoices?select=id,status&tenant_id=eq.${T}`);
  results.push({
    id: "X-READ-1", severity: "critical", call: "GET invoices?tenant_id=eq.<foreign>",
    ...readInv, pass: readInv.body.trim() === "[]",
  });
  const readCus = await rest(`customers?select=id,name&tenant_id=eq.${T}`);
  results.push({
    id: "X-READ-2", severity: "critical", call: "GET customers?tenant_id=eq.<foreign>",
    ...readCus, pass: readCus.body.trim() === "[]" && !readCus.body.includes(MARK),
  });
  const writeCus = await rest("customers", {
    method: "POST",
    body: JSON.stringify({ tenant_id: T, name: `${MARK} Injected`, phone: "01000000029" }),
  });
  results.push({
    id: "X-WRITE-1", severity: "critical", call: "POST customers with foreign tenant_id",
    ...writeCus, pass: writeCus.status >= 400,
  });

  // non-regression on the legitimate paths
  const n1 = await rpc("get_user_tenant_id", { _user_id: actingUser });
  results.push({
    id: "N-1", severity: "regression", call: "get_user_tenant_id(self)", ...n1,
    pass: n1.status === 200 && n1.body.replaceAll('"', "") === actingTenant,
  });
  const n2 = await rpc("check_financial_limit", { _user_id: actingUser, _limit_type: "invoice", _value: 1 });
  results.push({ id: "N-2", severity: "regression", call: "check_financial_limit(3-arg, self)", ...n2, pass: n2.status === 200 });
  const n3 = await rpc("get_dashboard_overview");
  results.push({ id: "N-3", severity: "regression", call: "get_dashboard_overview()", ...n3, pass: n3.status === 200 });
  const n4 = await rest("invoices?select=id&limit=1");
  results.push({ id: "N-4", severity: "regression", call: "GET own-tenant invoices", ...n4, pass: n4.status === 200 });
} finally {
  cleanupState = cleanup();
}

// ── definer re-audit of the seven remediated functions ──────────────────────
const scope = JSON.parse(readFileSync(O("rem-bnd05-001-scope.json"), "utf8"));
const liveDefs = jsonq(`
  select coalesce(json_agg(x), '[]'::json)::text from (
    select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as ident,
           md5(pg_get_functiondef(p.oid)) as md5,
           case p.prosecdef when true then 'DEFINER' else 'INVOKER' end as security,
           coalesce(p.proconfig::text, '') as config,
           coalesce((
             select string_agg(distinct a.rolname, ',' order by a.rolname)
             from pg_roles a
             where has_function_privilege(a.rolname, p.oid, 'EXECUTE')
               and a.rolname in ('anon','authenticated','service_role','public')
           ), '') as execute_grants
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ) x;`);
const byIdent = new Map(liveDefs.map((d) => [d.ident, d]));

const definerAudit = scope.declaredScope.map((s) => {
  const ident = s.function.replace(/^public\./, "").replace(/\(([^)]*)\)/, (_m, a) => `(${a})`);
  // scope stores `name(type,type)`; live stores `name(argname type, …)` → match on name+arity
  const name = ident.split("(")[0];
  const arity = ident.slice(ident.indexOf("(") + 1, ident.lastIndexOf(")"));
  const arityN = arity.trim() === "" ? 0 : arity.split(",").length;
  const live = liveDefs.find(
    (d) =>
      d.ident.split("(")[0] === name &&
      (d.ident.slice(d.ident.indexOf("(") + 1, d.ident.lastIndexOf(")")).trim() === ""
        ? 0
        : d.ident.slice(d.ident.indexOf("(") + 1, d.ident.lastIndexOf(")")).split(",").length) === arityN,
  );
  return {
    id: s.id,
    function: s.function,
    declaredPostMd5: s.postMd5,
    liveMd5: live?.md5 ?? null,
    md5Match: live?.md5 === s.postMd5,
    security: live?.security ?? null,
    searchPath: live?.config ?? null,
    executeGrants: live?.execute_grants ?? null,
    anonExecutable: (live?.execute_grants ?? "").split(",").includes("anon"),
  };
});
void byIdent;

// ── PH1A observation set, re-derived live ───────────────────────────────────
const obs = jsonq(`
  select coalesce(json_agg(x), '[]'::json)::text from (
    select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as ident
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public'
      and pg_get_functiondef(p.oid) ilike '%tenant%'
      and pg_get_functiondef(p.oid) !~* '(get_current_tenant|current_tenant\\(\\)|is_tenant_member|get_user_tenant_id)'
  ) x;`);

const failures = results.filter((r) => !r.pass).map((r) => r.id);
const md5Drift = definerAudit.filter((d) => !d.md5Match).map((d) => d.function);
const anonExposed = definerAudit.filter((d) => d.anonExecutable).map((d) => d.function);

const lineage = [
  { step: "PH1A Evidence", artifact: "tenant-isolation-report.json", sha256: sha256(O("tenant-isolation-report.json")) },
  { step: "CERT-REV-BND05", artifact: "cert-rev-bnd05.json", sha256: sha256(O("cert-rev-bnd05.json")) },
  { step: "CERT-REV-BND05 journal proof", artifact: "cert-rev-bnd05-journal-proof.json", sha256: sha256(O("cert-rev-bnd05-journal-proof.json")) },
  { step: "CERT-REV-BND05 definer proof (pre-remediation)", artifact: "cert-rev-bnd05-definer-proof.json", sha256: sha256(O("cert-rev-bnd05-definer-proof.json")) },
  { step: "REM-BND05-001 scope", artifact: "rem-bnd05-001-scope.json", sha256: sha256(O("rem-bnd05-001-scope.json")) },
  { step: "REM-BND05-001 post proof", artifact: "rem-bnd05-001-post-proof.json", sha256: sha256(O("rem-bnd05-001-post-proof.json")) },
  { step: "Migration", artifact: "drizzle/migrations/0005_rem_bnd05_001_definer_surface.sql", sha256: sha256(resolve(__dirname, "../../drizzle/migrations/0005_rem_bnd05_001_definer_surface.sql")) },
];

const record = {
  id: "CERT-REV-BND05-R2",
  boundary: "BND-05 — Tenant → Data",
  generatedAt: new Date().toISOString(),
  source: "live",
  mutation: "none — review only",
  method: "PostgREST with a real authenticated user JWT against a fresh throw-away foreign tenant, plus live catalog re-read",
  actingTenant,
  foreignTenant: T,
  lineage,
  scopeHash: scope.scopeHash,
  results,
  definerAudit,
  observationSetSize: obs.length,
  fixtureCleanup: cleanupState,
  findings: {
    probeFailures: failures,
    md5Drift,
    anonExecutable: anonExposed,
    preExt001: {
      id: "PRE-EXT-001",
      status: "OPEN",
      statement: "Security containment achieved / functional capability not restored",
      detail: "pg_trgm is not installed; find_duplicate_customers cannot resolve similarity(). Outside BND-05 scope.",
    },
  },
  verdict:
    failures.length === 0 && md5Drift.length === 0 && anonExposed.length === 0
      ? "R2 EVIDENCE PASS — certification decision belongs to human review"
      : "R2 EVIDENCE FAIL — BND-05 remains HOLD, a new scoped remediation (R3) is required",
  certification: "NOT CLAIMED — human review required",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ ...record, definerAudit, results }, null, 2));
process.exit(failures.length === 0 && md5Drift.length === 0 && anonExposed.length === 0 ? 0 : 1);
