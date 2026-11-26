import { describe, it, expect } from "vitest";
import { customerSchema, isValidPhone, PHONE_INVALID_MESSAGE } from "../validations";
describe("phone validation", () => {
  it("accepts Egyptian numbers", () => { expect(isValidPhone("01012345678")).toBe(true); expect(isValidPhone("+201012345678")).toBe(true); });
  it("empty is allowed", () => expect(isValidPhone("")).toBe(true));
  it("rejects letters", () => expect(isValidPhone("01abc")).toBe(false));
  it("customer schema returns Arabic field message on phone", () => {
    const r = customerSchema.safeParse({ name: "x", customer_type: "individual", vip_level: "regular", phone: "01abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find(i => i.path[0] === "phone")?.message).toBe(PHONE_INVALID_MESSAGE);
  });
});
