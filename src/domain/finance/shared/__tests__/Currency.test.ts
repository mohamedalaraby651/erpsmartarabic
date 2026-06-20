import { describe, test, expect } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { Currency, type CurrencyCode } from "../Currency";

describe("Currency VO", () => {
  test("USD valid with exponent 2", () => {
    const c = Currency.of("USD");
    expect(isOk(c)).toBe(true);
    if (isOk(c)) {
      expect(c.value.exponent).toBe(2);
      expect(c.value.code).toBe("USD");
    }
  });

  test("JPY valid with exponent 0", () => {
    const c = Currency.of("JPY");
    expect(isOk(c) && c.value.exponent === 0).toBe(true);
  });

  test("KWD valid with exponent 3", () => {
    const c = Currency.of("KWD");
    expect(isOk(c) && c.value.exponent === 3).toBe(true);
  });

  test("normalizes via trim + upper-case", () => {
    const c = Currency.of("  usd ");
    expect(isOk(c)).toBe(true);
    if (isOk(c)) {
      expect(c.value.code).toBe("USD");
    }
  });

  test("rejects unknown currency code", () => {
    const c = Currency.of("XYZ");
    expect(isErr(c)).toBe(true);
    if (isErr(c)) {
      expect(c.error.kind).toBe("UnknownCurrency");
      expect(c.error.input).toBe("XYZ");
    }
  });

  test("rejects empty string", () => {
    const c = Currency.of("");
    expect(isErr(c)).toBe(true);
  });

  test("rejects too-short code", () => {
    const c = Currency.of("US");
    expect(isErr(c)).toBe(true);
  });

  test("equals returns true for same currency", () => {
    const a = Currency.of("USD");
    const b = Currency.of("USD");
    if (isOk(a) && isOk(b)) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  test("equals returns false for different currency", () => {
    const a = Currency.of("USD");
    const b = Currency.of("EUR");
    if (isOk(a) && isOk(b)) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  test("toString returns the code", () => {
    const c = Currency.of("USD");
    if (isOk(c)) {
      expect(c.value.toString()).toBe("USD");
    }
  });

  test("instance is frozen (mutation silently ignored)", () => {
    const c = Currency.of("USD");
    if (isOk(c)) {
      const obj = c.value as unknown as { code: string };
      try {
        obj.code = "EUR";
      } catch {
        // strict mode throws — acceptable
      }
      expect(c.value.code).toBe("USD");
    }
  });

  test("every supported currency has a valid exponent ∈ {0,2,3}", () => {
    const validExponents = [0, 2, 3];
    const codes: readonly CurrencyCode[] = [
      "USD",
      "EUR",
      "SAR",
      "AED",
      "EGP",
      "KWD",
      "BHD",
      "JOD",
      "OMR",
      "QAR",
      "JPY",
    ];
    codes.forEach((code) => {
      const c = Currency.of(code);
      expect(isOk(c)).toBe(true);
      if (isOk(c)) {
        expect(validExponents).toContain(c.value.exponent);
      }
    });
  });
});
