/**
 * Repository purity — the adapter source MUST NOT mention the
 * `schema_version` literal in any form (refinement R2). The Codec is
 * the SOLE owner of envelope versioning.
 *
 * This is a structural test: it greps the source file rather than the
 * compiled output, so any future edit that re-introduces the literal
 * will fail in CI immediately.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(
  here,
  "../../repository/SupabaseInvoiceRepository.ts",
);

describe("SupabaseInvoiceRepository purity", () => {
  const src = readFileSync(SOURCE, "utf8");

  it("does not contain the schema_version literal", () => {
    expect(src).not.toMatch(/schema_version/);
    expect(src).not.toMatch(/\bschemaVersion\b/);
  });

  it("does not import any codec implementation module", () => {
    expect(src).not.toMatch(/InvoiceIssuedCodec|InvoiceVoidedCodec|InvoicePaymentAppliedCodec/);
  });

  it("does not import @supabase/* directly (depends only on injected client type)", () => {
    expect(src).not.toMatch(/from\s+["']@supabase\//);
  });

  it("does not import Invoice.fromHistory (rehydration is delegated)", () => {
    expect(src).not.toMatch(/fromHistory/);
  });

  it("does not throw (returns Result)", () => {
    expect(src).not.toMatch(/\bthrow\s+/);
  });
});
