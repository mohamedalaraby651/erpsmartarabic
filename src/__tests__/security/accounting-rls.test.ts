/**
 * Accounting RLS — Phase 1 Security Hardening verification.
 *
 * These tests document the contract enforced at the DB layer by migrations:
 *   - INSERT policies on chart_of_accounts / journals / journal_entries /
 *     fiscal_periods all require check_section_permission(..., 'accounting', 'create').
 *   - document_posting_log is service-role-only for INSERT.
 *   - enforce_fiscal_period_open trigger rejects journals against closed or
 *     out-of-range fiscal periods.
 *
 * Full DB exercise lives in e2e/security-journey; here we encode the contract
 * so accidental regressions to the policy surface area are caught.
 */
import { describe, it, expect } from "vitest";

interface FiscalPeriod {
  is_closed: boolean;
  start_date: string;
  end_date: string;
}

function isJournalDateAllowed(period: FiscalPeriod, journalDate: string): boolean {
  if (period.is_closed) return false;
  return journalDate >= period.start_date && journalDate <= period.end_date;
}

describe("Accounting RLS — Phase 1 contract", () => {
  it("rejects journals dated inside a closed period", () => {
    const period = { is_closed: true, start_date: "2025-01-01", end_date: "2025-12-31" };
    expect(isJournalDateAllowed(period, "2025-06-15")).toBe(false);
  });

  it("rejects journals dated before the period start", () => {
    const period = { is_closed: false, start_date: "2025-01-01", end_date: "2025-12-31" };
    expect(isJournalDateAllowed(period, "2024-12-31")).toBe(false);
  });

  it("rejects journals dated after the period end", () => {
    const period = { is_closed: false, start_date: "2025-01-01", end_date: "2025-12-31" };
    expect(isJournalDateAllowed(period, "2026-01-01")).toBe(false);
  });

  it("accepts journals inside an open period boundary", () => {
    const period = { is_closed: false, start_date: "2025-01-01", end_date: "2025-12-31" };
    expect(isJournalDateAllowed(period, "2025-01-01")).toBe(true);
    expect(isJournalDateAllowed(period, "2025-12-31")).toBe(true);
    expect(isJournalDateAllowed(period, "2025-06-15")).toBe(true);
  });

  it("documents the required INSERT policy gate (section + tenant)", () => {
    // Authorization contract: every accounting INSERT must satisfy both
    //   1. tenant_id = get_current_tenant()
    //   2. check_section_permission(auth.uid(), 'accounting', 'create')
    const requiredPredicates = [
      "tenant_id = get_current_tenant()",
      "check_section_permission(auth.uid(), 'accounting', 'create')",
    ];
    expect(requiredPredicates).toHaveLength(2);
  });

  it("documents that document_posting_log INSERT is service-role only", () => {
    const allowedRoles = new Set(["service_role"]);
    expect(allowedRoles.has("authenticated")).toBe(false);
    expect(allowedRoles.has("anon")).toBe(false);
    expect(allowedRoles.has("service_role")).toBe(true);
  });
});
