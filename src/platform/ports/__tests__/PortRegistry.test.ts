import { describe, it, expect } from "vitest";
import { PortRegistry, DECLARED_PORTS } from "../PortRegistry";

describe("PortRegistry", () => {
  it("in-memory registry exposes every declared port", () => {
    const reg = PortRegistry.inMemory();
    for (const name of DECLARED_PORTS) {
      expect(reg.has(name)).toBe(true);
      expect(reg.get(name)).toBeDefined();
    }
  });

  it("in-memory adapters implement their contract", async () => {
    const reg = PortRegistry.inMemory();
    reg.get("notification").notify({ level: "info", title: "hi" });
    reg.get("storage").set("k", { a: 1 });
    expect(reg.get("storage").get("k")).toEqual({ a: 1 });
    await reg.get("clipboard").writeText("hello");
    expect(await reg.get("clipboard").readText()).toBe("hello");
    reg.get("navigation").navigate({ path: "/x" });
    expect(reg.get("navigation").current()).toBe("/x");
  });
});
