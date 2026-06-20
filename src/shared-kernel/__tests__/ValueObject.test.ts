import { describe, it, expect } from "vitest";
import { ValueObject } from "@/shared-kernel";

class Money extends ValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
    public readonly cachedFormatted?: string, // derived; NOT in identity
  ) {
    super();
  }
  protected identityFields(): readonly string[] {
    return ["amount", "currency"];
  }
}

describe("ValueObject", () => {
  it("equals uses only declared identity fields, ignoring derived/cache fields", () => {
    const a = new Money(100, "SAR", "100.00 SAR");
    const b = new Money(100, "SAR", "DIFFERENT-CACHE");
    expect(a.equals(b)).toBe(true);
  });

  it("differs when an identity field differs", () => {
    expect(new Money(100, "SAR").equals(new Money(101, "SAR"))).toBe(false);
    expect(new Money(100, "SAR").equals(new Money(100, "USD"))).toBe(false);
  });

  it("rejects different prototype chains", () => {
    class Other extends ValueObject {
      constructor(public readonly amount: number) {
        super();
      }
      protected identityFields(): readonly string[] {
        return ["amount"];
      }
    }
    expect(new Money(1, "SAR").equals(new Other(1))).toBe(false);
  });

  it("rejects non-ValueObject input", () => {
    expect(new Money(1, "SAR").equals(null)).toBe(false);
    expect(new Money(1, "SAR").equals({ amount: 1, currency: "SAR" })).toBe(false);
  });
});
