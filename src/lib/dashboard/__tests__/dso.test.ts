import { describe, it, expect } from "vitest";
import { normalizeDso } from "../dso";
describe("normalizeDso", () => {
  it("absurd 2162 days -> null", () => expect(normalizeDso(2162)).toBeNull());
  it("no sales (0) -> null", () => expect(normalizeDso(0)).toBeNull());
  it("missing -> null", () => expect(normalizeDso(undefined)).toBeNull());
  it("normal value kept", () => expect(normalizeDso(42.4)).toBe(42));
  it("365 kept", () => expect(normalizeDso(365)).toBe(365));
});
