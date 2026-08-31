#!/usr/bin/env node
/**
 * CERT-REV-BND05 · empirical proof of the two high/critical classifications.
 *
 * The review must not assert reachability it has not observed. This script
 * creates a throw-away foreign tenant with one invoice and two similar
 * customers, then — as a REAL authenticated user of another tenant, through
 * PostgREST — calls:
 *
 *   P-1 rpc/find_duplicate_customers with no argument
 *       -> does it return the foreign tenant's customer PII?
 *   P-2 rpc/void_invoice on the foreign tenant's invoice
 *       -> does it cancel a foreign invoice?
 *
 * Everything created here is deleted at the end. No schema, policy or
 * application code is modified.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "output/cert-rev-bnd05-definer-proof.json");

const DB = process.env.SUPABASE_DB_URL || process.env.DB_URL;
const URL_ = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const JWT = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN;
if (!DB || !URL_ || !ANON || !JWT) {
  console.error("[cert-rev-definer-proof] missing DB url / project url / anon key / user JWT");
  process.exit(2);
}

const T = "cccccccc-0000-0000-0000-00000000000a";
const INV = "cccccccc-0000-0000-0000-0000000000f1";
const C1 = "cccccccc-0000-0000-0000-0000000000c1";
const C2 = "cccccccc-0000-0000-0000-0000000000c2";
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
  return { status: r.status, body: (await r.text()).slice(0, 1200) };
}

const results = [];
try {
  sql(`insert into public.tenants (id,name,slug,is_active)
       values ('${T}','CERT-REV definer proof','cert-rev-definer',true)
       on conflict (id) do nothing;`);
  sql(`insert into public.customers (id, tenant_id, name, phone)
       values ('${C1}','${T}','${MARK} One','01000000001'),
              ('${C2}','${T}','${MARK} Onee','01000000001')
       on conflict (id) do nothing;`);
  sql(`insert into public.invoices (id, tenant_id, invoice_number, customer_id,
                                    subtotal, total_amount, paid_amount, status)
       values ('${INV}','${T}','CERT-REV-INV-1', '${C1}', 100, 100, 0, 'pending')
       on conflict (id) do nothing;`);

  sql(`insert into public.fiscal_periods (id, tenant_id, name, start_date, end_date, is_closed)
       values ('cccccccc-0000-0000-0000-0000000000fa','${T}','CERT-REV period', current_date - 1, current_date + 1, false)
       on conflict (id) do nothing;`);

  const p1 = await rest("rpc/find_duplicate_customers", { method: "POST", body: "{}" });
  results.push({
    id: "P-1",
    call: "rpc/find_duplicate_customers()  (no argument)",
    status: p1.status,
    foreign_pii_returned: p1.body.includes(MARK),
    body_excerpt: p1.body.slice(0, 400),
  });

  const p2 = await rest("rpc/void_invoice", {
    method: "POST",
    body: JSON.stringify({ _invoice_id: INV, _reason: "cert-rev cross-tenant probe" }),
  });
  const statusAfter = sql(`select status from public.invoices where id='${INV}';`);
  results.push({
    id: "P-2",
    call: "rpc/void_invoice(foreign invoice uuid)",
    status: p2.status,
    body_excerpt: p2.body.slice(0, 400),
    foreign_invoice_status_after: statusAfter,
    foreign_invoice_cancelled: statusAfter === "cancelled",
  });
} finally {
  // cleanup — triggers disabled so audit rows do not resurrect the FK
  try {
    sql(`delete from public.journal_entries where tenant_id='${T}';
         delete from public.journals where tenant_id='${T}';
         delete from public.invoice_items where tenant_id='${T}';
         delete from public.invoices where tenant_id='${T}';
         delete from public.customers where tenant_id='${T}';
         delete from public.fiscal_periods where tenant_id='${T}';
         delete from public.activity_logs where tenant_id='${T}';
         delete from public.audit_trail where tenant_id='${T}';
         delete from public.tenants where id='${T}';`);
  } catch (e) {
    console.error("[cert-rev-definer-proof] cleanup:", e.message);
  }
}

const record = {
  id: "CERT-REV-BND05-DEFINER-PROOF",
  generatedAt: new Date().toISOString(),
  source: "live",
  method: "PostgREST with a real authenticated user JWT against a throw-away foreign tenant",
  results,
  conclusion: {
    "find_duplicate_customers": results[0]?.foreign_pii_returned
      ? "CONFIRMED cross-tenant PII disclosure"
      : "not reproduced",
    "void_invoice": results[1]?.foreign_invoice_cancelled
      ? "CONFIRMED cross-tenant write (foreign invoice cancelled)"
      : "not reproduced",
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record, null, 2));
