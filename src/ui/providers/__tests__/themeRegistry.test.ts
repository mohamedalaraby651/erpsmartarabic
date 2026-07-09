/**
 * themeRegistry unit tests (Wave 2, ADR-0030).
 */
import { describe, it, expect } from "vitest";
import { getTheme, listThemes, registerTheme, __resetThemeRegistry } from "../themeRegistry";

describe("themeRegistry", () => {
  it("ships light, dark, and high-contrast by default", () => {
    __resetThemeRegistry();
    expect(getTheme("light")?.dataAttr).toBe("light");
    expect(getTheme("dark")?.prefersDark).toBe(true);
    expect(getTheme("high-contrast")?.contrast).toBe("AAA");
    expect(listThemes().length).toBeGreaterThanOrEqual(3);
  });

  it("registerTheme is idempotent and overrides existing entries", () => {
    __resetThemeRegistry();
    registerTheme({ id: "brand", label: "Brand", dataAttr: "brand" });
    expect(getTheme("brand")?.label).toBe("Brand");
    registerTheme({ id: "brand", label: "Brand v2", dataAttr: "brand" });
    expect(getTheme("brand")?.label).toBe("Brand v2");
  });

  it("rejects registrations without an id", () => {
    __resetThemeRegistry();
    expect(() => registerTheme({ id: "", label: "x", dataAttr: "x" })).toThrow();
  });
});
