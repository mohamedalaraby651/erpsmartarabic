/**
 * BND-05 — Tenant → Data · cross-tenant negative tests (PH1A exit criterion X-7).
 *
 * These are negative tests in the strict sense: they assert that an
 * authenticated user homed in tenant B can neither read, insert, update nor
 * delete rows belonging to tenant A. The behaviour is measured against the
 * live database by `scripts/audits/tenant-isolation-audit.mjs`, which runs the
 * probe inside a transaction that is aborted by design; this suite asserts the
 * recorded evidence so the guarantee is enforced in CI without credentials.
 *
 * Regenerate evidence: `node scripts/audits/tenant-isolation-audit.mjs`
 */
import { describe, it, expect } from "vitest";
import report from "../../../scripts/audits/output/tenant-isolation-report.json";

interface Probe {
  table_name: string;
  select_denied: boolean;
  update_denied: boolean;
  delete_denied: boolean;
  insert_denied: boolean | null;
  foreign_rows_visible?: number;
  update_affected?: number;
  delete_affected?: number;
  note?: string;
  denied_by?: string;
}

const probes = (report.crossTenantProbes?.results ?? []) as unknown as Probe[];

/** One representative table per business family must be probed. */
const REQUIRED_FAMILIES = [
  "customers",
  "invoices",
  "invoice_items",
  "payments",
  "products",
  "product_stock",
  "stock_movements",
  "journals",
  "journal_entries",
  "expenses",
  "suppliers",
  "purchase_orders",
  "quotations",
  "employees",
  "activity_logs",
  "audit_trail",
  "chart_of_accounts",
  "notifications",
];

describe("BND-05 · cross-tenant denial (X-7)", () => {
  it("covers every required table family", () => {
    const covered = new Set(probes.map((p) => p.table_name));
    const missing = REQUIRED_FAMILIES.filter((t) => !covered.has(t));
    expect(missing, `missing cross-tenant probes: ${missing.join(", ")}`).toEqual([]);
  });

  it.each(REQUIRED_FAMILIES)("denies cross-tenant access on %s", (table) => {
    const p = probes.find((x) => x.table_name === table);
    expect(p, `no probe evidence for ${table}`).toBeDefined();
    expect(p!.select_denied, `${table}: foreign rows were visible`).toBe(true);
    expect(p!.update_denied, `${table}: foreign rows were updatable`).toBe(true);
    expect(p!.delete_denied, `${table}: foreign rows were deletable`).toBe(true);
    expect(p!.insert_denied, `${table}: insert with a foreign tenant_id was accepted`).not.toBe(
      false,
    );
  });
});

describe("BND-05 · structural completeness (X-1 … X-5)", () => {
  const s = report.summary as Record<string, number>;
  const n = s.tenantScopedTables;

  it("has tenant-scoped tables under audit", () => {
    expect(n).toBeGreaterThan(0);
  });

  it("X-1 every tenant-scoped table has tenant_id NOT NULL + FK + index", () => {
    expect(s.x1_column_fk_index).toBe(n);
  });

  it("X-2 RLS is enabled on every tenant-scoped table", () => {
    expect(s.x2_rls_enabled).toBe(n);
  });

  it("X-3 four tenant-asserting policies per table (SELECT/INSERT/UPDATE/DELETE)", () => {
    expect(s.x3_four_verb_tenant_policies).toBe(n);
  });

  it("X-4 GRANTs are consistent with the policies", () => {
    expect(s.x4_grants).toBe(n);
  });

  it("X-1 every table without tenant_id carries a recorded exemption", () => {
    expect(s.unexplainedExemptions).toBe(0);
  });

  it("X-5 tenant identity is derived server-side from the JWT", () => {
    const fn = (report.tenantAuthority as Array<{ proname: string; uses_jwt_identity: boolean }>)
      .find((f) => f.proname === "get_current_tenant");
    expect(fn?.uses_jwt_identity).toBe(true);
  });

  it("audit reports zero failures", () => {
    expect(report.failures).toEqual([]);
  });
});
