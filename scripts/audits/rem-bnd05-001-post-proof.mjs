#!/usr/bin/env node
/**
 * REM-BND05-001 · post-remediation negative proof (LIVE).
 *
 * Re-runs, as a REAL authenticated user of another tenant through PostgREST,
 * the exact attacks that CERT-REV-BND05 classified as R-1 … R-7.
 *
 *   R-1 rpc/void_invoice(foreign invoice)                  -> must be denied, invoice unchanged
 *   R-2 rpc/find_duplicate_customers()                     -> must not return foreign PII
 *   R-2b rpc/find_duplicate_customers(foreign tenant uuid) -> must be denied
 *   R-3 rpc/get_user_tenant_id(foreign user)               -> must be null
 *   R-4 rpc/get_user_tenants(foreign user)                 -> must be []
 *   R-5 rpc/is_period_closed(foreign tenant, today)        -> must be denied
 *   R-6 rpc/is_admin_equivalent_custom_role(role, foreign) -> must be denied
 *   R-7 rpc/check_financial_limit(user, foreign tenant, …) -> must be denied
 *
 * A throw-away foreign tenant with one invoice, two similar customers, an open
 * fiscal period and one membership row is created with the privileged
 * connection and removed at the end. No schema or application code is changed.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "output/rem-bnd05-001-post-proof.json");

const DB = process.env.SUPABASE_DB_URL || process.env.DB_URL;
const URL_ = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const JWT = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN;
if (!DB || !URL_ || !ANON || !JWT) {
  console.error("[rem-bnd05-post-proof] missing DB url / project url / anon key / user JWT");
  process.exit(2);
}

const T = "dddddddd-0000-0000-0000-00000000000a"; // foreign tenant
const INV = "dddddddd-0000-0000-0000-0000000000f1";
const C1 = "dddddddd-0000-0000-0000-0000000000c1";
const C2 = "dddddddd-0000-0000-0000-0000000000c2";
const PER = "dddddddd-0000-0000-0000-0000000000fa";
const MARK = "ZZQX Testov Foreign";

const sql = (s) => execFileSync("psql", [DB, "-At", "-c", s], { encoding: "utf8" }).trim();

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

function cleanup() {
  try {
    sql(`delete from public.invoice_items where tenant_id='${T}';
         delete from public.invoices where tenant_id='${T}';
         delete from public.customers where tenant_id='${T}';
         delete from public.fiscal_periods where tenant_id='${T}';
         delete from public.user_tenants where tenant_id='${T}';
         delete from public.activity_logs where tenant_id='${T}';
         delete from public.audit_trail where tenant_id='${T}';
         delete from public.tenants where id='${T}';`);
  } catch (e) {
    console.error("[rem-bnd05-post-proof] cleanup:", e.message);
  }
}

const results = [];
let foreignUser = null;
let actingTenant = null;
let actingUser = null;
let invoiceStatusAfter = null;
try {
  cleanup();
  sql(`insert into public.tenants (id,name,slug,is_active)
       values ('${T}','REM-BND05 post proof','rem-bnd05-post',true);`);
  sql(`insert into public.customers (id, tenant_id, name, phone)
       values ('${C1}','${T}','${MARK} One','01000000009'),
              ('${C2}','${T}','${MARK} Onee','01000000009');`);
  sql(`insert into public.invoices (id, tenant_id, invoice_number, customer_id,
                                    subtotal, total_amount, paid_amount, status)
       values ('${INV}','${T}','REM-BND05-INV-1','${C1}',100,100,0,'pending');`);
  sql(`insert into public.fiscal_periods (id, tenant_id, name, start_date, end_date, is_closed)
       values ('${PER}','${T}','REM-BND05 period', current_date - 1, current_date + 1, false);`);

  const who = await rpc("get_current_tenant");
  actingTenant = who.body.replaceAll('"', "");
  actingUser = sql(`select user_id from public.user_tenants where tenant_id='${actingTenant}' limit 1;`);
  foreignUser =
    sql(`select id from public.profiles where id <> '${actingUser}' limit 1;`) ||
    "00000000-0000-0000-0000-0000000000ff";
  if (foreignUser && foreignUser !== actingUser) {
    sql(`insert into public.user_tenants (user_id, tenant_id, is_default)
         values ('${foreignUser}','${T}',true) on conflict do nothing;`);
  }

  const r1 = await rpc("void_invoice", { _invoice_id: INV, _reason: "rem-bnd05 post proof" });
  invoiceStatusAfter = sql(`select status from public.invoices where id='${INV}';`);
  results.push({
    id: "R-1", severity: "critical", call: "void_invoice(foreign invoice)",
    ...r1, foreign_invoice_status_after: invoiceStatusAfter,
    pass: invoiceStatusAfter !== "cancelled" && r1.status >= 400,
  });

  const r2 = await rpc("find_duplicate_customers");
  results.push({
    id: "R-2", severity: "medium", call: "find_duplicate_customers()  (no argument)",
    ...r2, foreign_pii_returned: r2.body.includes(MARK),
    pass: r2.status === 200 && !r2.body.includes(MARK),
  });

  const r2b = await rpc("find_duplicate_customers", { p_tenant_id: T });
  results.push({
    id: "R-2b", severity: "medium", call: "find_duplicate_customers(foreign tenant)",
    ...r2b, foreign_pii_returned: r2b.body.includes(MARK),
    pass: !r2b.body.includes(MARK),
  });

  const r3 = await rpc("get_user_tenant_id", { _user_id: foreignUser });
  results.push({
    id: "R-3", severity: "low", call: "get_user_tenant_id(foreign user)",
    ...r3, pass: r3.status >= 400 || r3.body.trim() === "null",
  });

  const r4 = await rpc("get_user_tenants", { _user_id: foreignUser });
  results.push({
    id: "R-4", severity: "low", call: "get_user_tenants(foreign user)",
    ...r4, pass: r4.status >= 400 || r4.body.trim() === "[]",
  });

  const r5 = await rpc("is_period_closed", { _tenant_id: T, _date: new Date().toISOString().slice(0, 10) });
  results.push({ id: "R-5", severity: "low", call: "is_period_closed(foreign tenant)", ...r5, pass: r5.status >= 400 });

  const roleId = sql(`select id from public.custom_roles limit 1;`) || "00000000-0000-0000-0000-000000000000";
  const r6 = await rpc("is_admin_equivalent_custom_role", { _role_id: roleId, _tenant_id: T });
  results.push({ id: "R-6", severity: "low", call: "is_admin_equivalent_custom_role(_, foreign tenant)", ...r6, pass: r6.status >= 400 });

  const r7 = await rpc("check_financial_limit", {
    _user_id: foreignUser, _tenant: T, _limit_type: "invoice", _amount: 1,
  });
  results.push({ id: "R-7", severity: "low", call: "check_financial_limit(4-arg, foreign tenant)", ...r7, pass: r7.status >= 400 });

  // Non-regression: the legitimate paths must still work for the acting user.
  const n1 = await rpc("get_user_tenant_id", { _user_id: actingUser });
  results.push({
    id: "N-1", severity: "regression", call: "get_user_tenant_id(self)",
    ...n1, pass: n1.status === 200 && n1.body.replaceAll('"', "") === actingTenant,
  });
  const n2 = await rpc("check_financial_limit", { _user_id: actingUser, _limit_type: "invoice", _value: 1 });
  results.push({
    id: "N-2", severity: "regression", call: "check_financial_limit(3-arg, self)",
    ...n2, pass: n2.status === 200,
  });
  const n3 = await rpc("get_dashboard_overview");
  results.push({ id: "N-3", severity: "regression", call: "get_dashboard_overview()", ...n3, pass: n3.status === 200 });
} finally {
  cleanup();
}

const record = {
  id: "REM-BND05-001-POST-PROOF",
  boundary: "BND-05 — Tenant → Data",
  generatedAt: new Date().toISOString(),
  source: "live",
  method: "PostgREST with a real authenticated user JWT against a throw-away foreign tenant",
  actingTenant,
  foreignTenant: T,
  results,
  failures: results.filter((r) => !r.pass).map((r) => r.id),
  certification: "NOT CLAIMED — human review required",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record, null, 2));
process.exit(record.failures.length === 0 ? 0 : 1);
