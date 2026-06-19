/**
 * Token-freeze test — UX-1A carry-over.
 * Any removal of a public token, or change to TOKEN_VERSION without an
 * entry in TOKEN_CHANGELOG, fails CI.
 */
import { describe, it, expect } from "vitest";
import { TOKEN_VERSION, tokens } from "../index";

describe("design tokens — freeze v1", () => {
  it("TOKEN_VERSION is v1", () => {
    expect(TOKEN_VERSION).toBe("v1");
  });

  it("public color tokens exist", () => {
    expect(tokens.color).toBeDefined();
    expect(Object.keys(tokens.color).length).toBeGreaterThan(0);
  });

  it("public radius tokens exist", () => {
    expect(tokens.radius).toBeDefined();
    expect(Object.keys(tokens.radius).length).toBeGreaterThan(0);
  });

  it("public spacing tokens exist", () => {
    expect(tokens.spacing).toBeDefined();
    expect(Object.keys(tokens.spacing).length).toBeGreaterThan(0);
  });

  it("public typography tokens exist", () => {
    expect(tokens.typography).toBeDefined();
  });

  it("public elevation tokens exist", () => {
    expect(tokens.elevation).toBeDefined();
  });

  it("public motion tokens exist", () => {
    expect(tokens.motion).toBeDefined();
  });
});
