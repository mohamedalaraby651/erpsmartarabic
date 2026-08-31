#!/usr/bin/env node
/**
 * CERT-REV-BND05 · journal / journal_entries enforcement proof (LIVE).
 *
 * The privileged psql session in this environment holds BYPASSRLS and is not a
 * member of `authenticated`, so `SET ROLE authenticated` is refused. The proof
 * is therefore taken where a real client actually sits: PostgREST, with a real
 * authenticated user JWT. Nothing is inferred.
 *
 *   Test A  foreign tenant_id + ordinary payload            -> expect denial
 *   Test B  foreign tenant_id + payload that SATISFIES the
 *           business trigger (open fiscal period of the
 *           foreign tenant, date in range)                  -> expect RLS denial (42501)
 *   Test C  journal_entries child row with foreign tenant   -> expect denial
 *   Test D  SELECT of foreign-tenant journals               -> expect 0 rows
 *
 * A throw-away foreign tenant + fiscal period + parent journal are created with
 * the privileged connection and deleted again at the end; no schema, policy or
 * application code is touched.
 *
 * Requires SUPABASE_DB_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and
 * LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN. Missing any of them => exit 2, no output.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "output/cert-rev-bnd05-journal-proof.json");

const DB = process.env.SUPABASE_DB_URL || process.env.DB_URL;
const URL_ = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const JWT = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN;
if (!DB || !URL_ || !ANON || !JWT) {
  console.error("[cert-rev-journal-proof] missing DB url / project url / anon key / user JWT");
  process.exit(2);
}

const T = "bbbbbbbb-0000-0000-0000-00000000000a"; // throw-away foreign tenant
const P = "bbbbbbbb-0000-0000-0000-00000000000f"; // its open fiscal period
const J = "bbbbbbbb-0000-0000-0000-00000000000b"; // a journal owned by it

const sql = (s) => execFileSync("psql", [DB, "-At", "-c", s], { encoding: "utf8" }).trim();

async function rest(path, init) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${JWT}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {}),
    },
  });
  const body = await r.text();
  return { status: r.status, body: body.slice(0, 500) };
}

function cleanup() {
  try {
    sql(`delete from public.journal_entries where tenant_id='${T}';
         delete from public.journals where tenant_id='${T}';
         delete from public.fiscal_periods where tenant_id='${T}';
         delete from public.tenants where id='${T}';`);
  } catch (e) {
    console.error("[cert-rev-journal-proof] cleanup failed:", e.message);
  }
}

const results = [];
let actingTenant = null;
try {
  cleanup();
  sql(`insert into public.tenants (id,name,slug,is_active) values ('${T}','CERT-REV foreign tenant','cert-rev-foreign',true);`);
  sql(`insert into public.fiscal_periods (id,tenant_id,name,start_date,end_date,is_closed)
       values ('${P}','${T}','CERT-REV period', current_date - 1, current_date + 1, false);`);
  const account = sql(`select id from public.chart_of_accounts limit 1;`);
  sql(`insert into public.journals (id,tenant_id,journal_number,journal_date,description,fiscal_period_id,is_posted,total_debit,total_credit)
       values ('${J}','${T}','CERT-REV-1', current_date, 'cert-rev parent','${P}', false, 0, 0);`);

  const who = await rest("rpc/get_current_tenant", { method: "POST", body: "{}" });
  actingTenant = who.body.replaceAll('"', "");

  // Test A — ordinary payload, foreign tenant
  const a = await rest("journals", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: T, journal_date: new Date().toISOString().slice(0, 10),
      description: "cert-rev test A", is_posted: false, total_debit: 0, total_credit: 0,
    }),
  });
  results.push({ test: "A", intent: "foreign tenant_id + ordinary payload", ...a });

  // Test B — payload satisfying the business trigger, foreign tenant
  const b = await rest("journals", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: T, journal_date: new Date().toISOString().slice(0, 10),
      description: "cert-rev test B", fiscal_period_id: P,
      is_posted: false, total_debit: 0, total_credit: 0,
    }),
  });
  results.push({ test: "B", intent: "foreign tenant_id + trigger-satisfying payload", ...b });

  // Test C — journal_entries child row under a foreign-tenant journal
  const c = await rest("journal_entries", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: T, journal_id: J, line_number: 1, account_id: account,
      debit_amount: 0, credit_amount: 0,
    }),
  });
  results.push({ test: "C", intent: "foreign journal_entries insert", ...c });

  // Test D — read visibility
  const d = await rest(`journals?tenant_id=eq.${T}&select=id`, { method: "GET" });
  results.push({ test: "D", intent: "SELECT foreign-tenant journals", ...d });
} finally {
  cleanup();
}

const denied = (r) => r.status >= 400 || r.body === "[]";
const classify = (r) => {
  if (r.test === "D") return r.body === "[]" ? "DENIED (0 rows)" : "VISIBLE — FAILURE";
  if (!denied(r)) return "ACCEPTED — FAILURE";
  return /42501|row-level security/i.test(r.body) ? "DENIED BY RLS" : "DENIED (other)";
};

const record = {
  id: "CERT-REV-BND05-JOURNAL-PROOF",
  boundary: "BND-05 — Tenant → Data",
  generatedAt: new Date().toISOString(),
  source: "live",
  method:
    "PostgREST with a real authenticated user JWT; throw-away foreign tenant/period/journal created and deleted with the privileged connection",
  actingTenant,
  foreignTenant: T,
  results: results.map((r) => ({ ...r, verdict: classify(r) })),
  failures: results.filter((r) => classify(r).includes("FAILURE")).map((r) => r.test),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record, null, 2));
process.exit(record.failures.length === 0 ? 0 : 1);
