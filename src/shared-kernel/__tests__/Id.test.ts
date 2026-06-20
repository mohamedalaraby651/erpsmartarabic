import { describe, it, expect } from "vitest";
import { unsafeId, idEquals, type Id } from "@/shared-kernel";

describe("Id<TBrand>", () => {
  it("brands a string at the type level (runtime is plain string)", () => {
    const id = unsafeId<"Account">("acc-1");
    expect(typeof id).toBe("string");
    expect(id).toBe("acc-1");
  });

  it("idEquals compares by string value", () => {
    const a = unsafeId<"Account">("x");
    const b = unsafeId<"Account">("x");
    const c = unsafeId<"Account">("y");
    expect(idEquals(a, b)).toBe(true);
    expect(idEquals(a, c)).toBe(false);
  });

  it("rejects empty / non-string input at unsafeId", () => {
    expect(() => unsafeId<"X">("")).toThrow();
    // @ts-expect-error — runtime guard
    expect(() => unsafeId<"X">(123)).toThrow();
  });

  it("brand prevents cross-aggregate assignment at compile time", () => {
    const acc: Id<"Account"> = unsafeId<"Account">("a");
    // @ts-expect-error — different brand
    const cust: Id<"Customer"> = acc;
    void cust;
  });
});
