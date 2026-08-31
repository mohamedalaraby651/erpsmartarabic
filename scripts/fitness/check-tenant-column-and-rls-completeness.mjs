#!/usr/bin/env node
/**
 * Fitness · BND-05 — Tenant → Data completeness.
 *
 * Closes the chain required by the Boundary Catalog:
 *   Invariant  → every tenant-scoped row is reachable only from its own tenant
 *   Fitness    → this check
 *   Test       → src/__tests__/security/tenant-isolation-negative.test.ts
 *   Evidence   → scripts/audits/output/tenant-isolation-report.json
 *
 * The check is offline: it validates the committed evidence artifact, so CI
 * needs no database credentials. Regenerate the artifact with
 * `node scripts/audits/tenant-isolation-audit.mjs`.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT = resolve(__dirname, "../audits/output/tenant-isolation-report.json");
const NAME = "check-tenant-column-and-rls-completeness";

let report;
try {
  report = JSON.parse(readFileSync(REPORT, "utf8"));
} catch {
  console.error(`[${NAME}] FAIL — missing evidence artifact ${REPORT}`);
  process.exit(1);
}

const violations = [];
const s = report.summary ?? {};
const n = s.tenantScopedTables ?? 0;

if (n === 0) violations.push("no tenant-scoped tables in the report");
if (s.x1_column_fk_index !== n) violations.push(`X-1 column/FK/index: ${s.x1_column_fk_index}/${n}`);
if (s.x2_rls_enabled !== n) violations.push(`X-2 RLS enabled: ${s.x2_rls_enabled}/${n}`);
if (s.x3_four_verb_tenant_policies !== n)
  violations.push(`X-3 four tenant policies: ${s.x3_four_verb_tenant_policies}/${n}`);
if (s.x4_grants !== n) violations.push(`X-4 grants: ${s.x4_grants}/${n}`);
if (s.unexplainedExemptions > 0)
  violations.push(`X-1 ${s.unexplainedExemptions} table(s) without tenant_id and without a recorded exemption`);

const authority = (report.tenantAuthority ?? []).find((f) => f.proname === "get_current_tenant");
if (!authority?.uses_jwt_identity)
  violations.push("X-5 get_current_tenant() does not derive identity from auth.uid()");

const probes = report.crossTenantProbes?.results ?? [];
if (probes.length === 0) violations.push("X-7 no cross-tenant probe evidence");
for (const p of probes) {
  if (!(p.select_denied && p.update_denied && p.delete_denied && p.insert_denied !== false))
    violations.push(`X-7 ${p.table_name}: cross-tenant access not denied`);
}

if ((report.failures ?? []).length > 0)
  violations.push(`audit reported ${report.failures.length} failure(s)`);

if (violations.length > 0) {
  console.error(`[${NAME}] FAIL`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(
  `[${NAME}] PASS — ${n} tenant-scoped tables, ${probes.length} cross-tenant denial probes, ` +
    `${report.summary.exemptTables} documented exemptions`,
);
