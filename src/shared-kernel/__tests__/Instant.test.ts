import { describe, it, expect } from "vitest";
import { Instant } from "@/shared-kernel";

describe("Instant", () => {
  it("equality depends only on epochMillis", () => {
    const a = Instant.fromEpochMillis(1_000_000);
    const b = Instant.fromEpochMillis(1_000_000);
    const c = Instant.fromEpochMillis(2_000_000);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it("round-trips through epochMillis", () => {
    const original = Instant.fromEpochMillis(1_700_000_000_000);
    const ms = original.toEpochMillis();
    const restored = Instant.fromEpochMillis(ms);
    expect(restored.equals(original)).toBe(true);
    expect(restored.toEpochMillis()).toBe(original.toEpochMillis());
  });

  it("round-trips through ISO-8601", () => {
    const original = Instant.fromEpochMillis(1_700_000_000_000);
    const iso = original.toISOString();
    const restored = Instant.fromISOString(iso);
    expect(restored.equals(original)).toBe(true);
  });

  it("compare/isBefore/isAfter agree", () => {
    const a = Instant.fromEpochMillis(1);
    const b = Instant.fromEpochMillis(2);
    expect(a.compare(b)).toBe(-1);
    expect(b.compare(a)).toBe(1);
    expect(a.compare(a)).toBe(0);
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
  });

  it("plus/minus millis", () => {
    const a = Instant.fromEpochMillis(1000);
    expect(a.plusMillis(500).toEpochMillis()).toBe(1500);
    expect(a.minusMillis(500).toEpochMillis()).toBe(500);
  });

  it("rejects non-finite input", () => {
    expect(() => Instant.fromEpochMillis(NaN)).toThrow();
    expect(() => Instant.fromEpochMillis(Infinity)).toThrow();
  });

  it("is frozen / immutable", () => {
    const a = Instant.fromEpochMillis(42);
    expect(Object.isFrozen(a)).toBe(true);
  });

  it("exports no zero-arg factory (compile-time guarantee enforced by fitness check)", () => {

    expect(() => (Instant as { now?: () => Instant }).now?.()).not.toThrow();
    expect((Instant as { now?: unknown }).now).toBeUndefined();
  });
});
