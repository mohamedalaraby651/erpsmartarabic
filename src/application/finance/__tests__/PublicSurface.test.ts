/**
 * Application public-surface runtime probe (UX-2B Wave 1.5).
 *
 * Asserts that the barrel exposes the expected shape at runtime:
 *   - handler classes are constructible
 *   - sealed error namespace is reachable
 *   - no accidental `undefined` exports
 *
 * The full logical-surface snapshot lives in
 * `scripts/audits/output/ux2b-wave1_5-surface.manifest.json` — this test
 * is the runtime tripwire that catches a broken barrel before CI does.
 */
import { describe, it, expect } from "vitest";
import * as Surface from "@/application/finance";

describe("Application/Finance public surface", () => {
  it("exposes handler classes as constructors", () => {
    expect(typeof Surface.IssueInvoiceHandler).toBe("function");
    expect(typeof Surface.ApplyInvoicePaymentHandler).toBe("function");
    expect(typeof Surface.VoidInvoiceHandler).toBe("function");
  });

  it("exposes the sealed error-code namespace", () => {
    expect(Surface.INVOICE_APP_ERR).toBeDefined();
    expect(typeof Surface.INVOICE_APP_ERR.NOT_FOUND).toBe("string");
    expect(Surface.INVOICE_APP_ERR.CONCURRENCY_CONFLICT).toMatch(
      /CONCURRENCY_CONFLICT$/,
    );
  });

  it("has no undefined exports", () => {
    for (const [name, value] of Object.entries(Surface)) {
      expect(value, `export ${name} should not be undefined`).toBeDefined();
    }
  });
});
