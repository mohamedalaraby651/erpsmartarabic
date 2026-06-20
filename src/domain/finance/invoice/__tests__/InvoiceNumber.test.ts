import { describe, test, expect } from "vitest";
import { isOk } from "@/shared-kernel";
import { InvoiceNumber } from "../InvoiceNumber";

describe("InvoiceNumber VO — construction & normalization", () => {
  test("accepts a simple alphanumeric value", () => {
    const r = InvoiceNumber.of("INV2026001");
    expect(isOk(r) && r.value.value === "INV2026001").toBe(true);
  });

  test("accepts hyphen, underscore and slash separators", () => {
    expect(isOk(InvoiceNumber.of("INV-2026-0001"))).toBe(true);
    expect(isOk(InvoiceNumber.of("INV_2026_0001"))).toBe(true);
    expect(isOk(InvoiceNumber.of("INV/2026/0001"))).toBe(true);
  });

  test("preserves case (does not uppercase)", () => {
    const r = InvoiceNumber.of("inv-2026-0001");
    expect(isOk(r) && r.value.value === "inv-2026-0001").toBe(true);
  });

  test("trims surrounding whitespace", () => {
    const r = InvoiceNumber.of("   INV-1   ");
    expect(isOk(r) && r.value.value === "INV-1").toBe(true);
  });

  test("rejects empty string", () => {
    const r = InvoiceNumber.of("");
    expect(
      !isOk(r) &&
        r.error.kind === "InvalidInvoiceNumber" &&
        r.error.reason === "Empty",
    ).toBe(true);
  });

  test("rejects whitespace-only string as Empty", () => {
    const r = InvoiceNumber.of("    ");
    expect(
      !isOk(r) &&
        r.error.kind === "InvalidInvoiceNumber" &&
        r.error.reason === "Empty",
    ).toBe(true);
  });

  test("rejects values over 64 chars with TooLong + length", () => {
    const longVal = "A".repeat(65);
    const r = InvoiceNumber.of(longVal);
    expect(
      !isOk(r) &&
        r.error.kind === "InvalidInvoiceNumber" &&
        r.error.reason === "TooLong" &&
        r.error.length === 65 &&
        r.error.max === 64,
    ).toBe(true);
  });

  test("accepts exactly 64 chars", () => {
    const val = "A".repeat(64);
    const r = InvoiceNumber.of(val);
    expect(isOk(r)).toBe(true);
  });

  test("rejects spaces inside the value (InvalidCharset)", () => {
    const r = InvoiceNumber.of("INV 2026 1");
    expect(
      !isOk(r) &&
        r.error.kind === "InvalidInvoiceNumber" &&
        r.error.reason === "InvalidCharset",
    ).toBe(true);
  });

  test("rejects unicode / non-ASCII letters (InvalidCharset)", () => {
    const r = InvoiceNumber.of("فاتورة-1");
    expect(
      !isOk(r) &&
        r.error.kind === "InvalidInvoiceNumber" &&
        r.error.reason === "InvalidCharset",
    ).toBe(true);
  });

  test("rejects non-string input defensively (NotAString)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = InvoiceNumber.of(123 as any);
    expect(
      !isOk(r) &&
        r.error.kind === "InvalidInvoiceNumber" &&
        r.error.reason === "NotAString",
    ).toBe(true);
  });
});

describe("InvoiceNumber VO — equality & immutability", () => {
  test("equals returns true for same value", () => {
    const a = InvoiceNumber.of("INV-1");
    const b = InvoiceNumber.of("INV-1");
    expect(isOk(a) && isOk(b) && a.value.equals(b.value)).toBe(true);
  });

  test("equals is case-sensitive (preserves business identity intent)", () => {
    const a = InvoiceNumber.of("inv-1");
    const b = InvoiceNumber.of("INV-1");
    expect(isOk(a) && isOk(b) && a.value.equals(b.value)).toBe(false);
  });

  test("instance is frozen", () => {
    const r = InvoiceNumber.of("INV-1");
    if (!isOk(r)) throw new Error("setup");
    expect(Object.isFrozen(r.value)).toBe(true);
  });

  test("exposes no static generator (business-identity rule)", () => {
    // The VO must not mint identifiers; only validates supplied input.
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (InvoiceNumber as any).generate,
    ).toBe("undefined");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (InvoiceNumber as any).next).toBe("undefined");
  });
});
