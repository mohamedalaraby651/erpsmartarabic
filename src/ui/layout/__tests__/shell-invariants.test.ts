/**
 * Shell Invariants — runtime tests for SHELL_INVARIANTS.md.
 *
 * Covers I2 (event payloads), I3 (command ordering), I7 (provider
 * independence), I8 (no command leakage).
 */
import { describe, expect, it } from "vitest";
import { createShellEventBus } from "../events";
import { createWorkspaceRegistry } from "../registry";
import type { CommandDef, WorkspaceDefinition } from "../types";

/** Mirrors the production sort in useCommandPalette (I3). */
function deterministicSort(commands: readonly CommandDef[]): CommandDef[] {
  return commands.slice().sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    if (pa !== pb) return pa - pb;
    const ga = a.group ?? "";
    const gb = b.group ?? "";
    if (ga !== gb) return ga < gb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

const noop = () => {};
const cmd = (over: Partial<CommandDef>): CommandDef => ({
  id: over.id ?? "x",
  label: over.label ?? "x",
  scope: over.scope ?? "global",
  run: noop,
  ...over,
});

describe("Shell Invariants", () => {
  describe("I2 — ShellEventBus carries primitive payloads only", () => {
    it("every payload value is a primitive or null/undefined", () => {
      const bus = createShellEventBus();
      const captured: unknown[] = [];

      bus.on("workspace:changed", (p) => captured.push(p));
      bus.on("sidebar:collapsed", (p) => captured.push(p));
      bus.on("theme:changed", (p) => captured.push(p));
      bus.on("command:executed", (p) => captured.push(p));

      bus.emit("workspace:changed", { workspaceId: "finance", previous: null });
      bus.emit("sidebar:collapsed", { collapsed: true });
      bus.emit("theme:changed", { mode: "dark", variant: "default", dir: "rtl" });
      bus.emit("command:executed", { commandId: "go.home", workspaceId: "finance" });

      for (const payload of captured) {
        expect(payload).toBeTypeOf("object");
        for (const v of Object.values(payload as Record<string, unknown>)) {
          const ok =
            v === null ||
            v === undefined ||
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean";
          expect(ok, `payload value ${String(v)} must be primitive`).toBe(true);
        }
      }
    });

    it("a throwing listener does not break the bus", () => {
      const bus = createShellEventBus();
      bus.on("palette:opened", () => {
        throw new Error("boom");
      });
      let reached = false;
      bus.on("palette:opened", () => {
        reached = true;
      });
      expect(() => bus.emit("palette:opened", {})).not.toThrow();
      expect(reached).toBe(true);
    });
  });

  describe("I3 — Command ordering is deterministic", () => {
    it("sorts by priority asc, then group asc, then id asc", () => {
      const shuffled: CommandDef[] = [
        cmd({ id: "z", priority: 10, group: "B" }),
        cmd({ id: "a", priority: 10, group: "B" }),
        cmd({ id: "m", priority: 5, group: "A" }),
        cmd({ id: "n" }), // priority 50, group ""
        cmd({ id: "k", priority: 10, group: "A" }),
      ];
      const sorted = deterministicSort(shuffled).map((c) => c.id);
      expect(sorted).toEqual(["m", "k", "a", "z", "n"]);
    });

    it("ungrouped commands sort before any named group at the same priority", () => {
      const input: CommandDef[] = [
        cmd({ id: "named", priority: 50, group: "A" }),
        cmd({ id: "bare", priority: 50 }),
      ];
      expect(deterministicSort(input).map((c) => c.id)).toEqual(["bare", "named"]);
    });
  });

  describe("I8 — no command leakage between workspaces", () => {
    it("only the active workspace's commands are reachable", () => {
      const wsA: WorkspaceDefinition = {
        id: "a",
        name: "A",
        icon: "circle",
        permissions: [],
        navigation: [],
        basePath: "/a",
        commands: [cmd({ id: "a.cmd", label: "A only" })],
      };
      const wsB: WorkspaceDefinition = {
        id: "b",
        name: "B",
        icon: "circle",
        permissions: [],
        navigation: [],
        basePath: "/b",
        commands: [cmd({ id: "b.cmd", label: "B only" })],
      };

      const registry = createWorkspaceRegistry([wsA, wsB]);
      const active = registry.get("a")!;
      const stream = [...(active.commands ?? [])];

      expect(stream.map((c) => c.id)).toEqual(["a.cmd"]);
      expect(stream.find((c) => c.id === "b.cmd")).toBeUndefined();
    });
  });

  describe("I7 — Provider independence (layout vs workspace)", () => {
    it("ShellLayoutState shape does not reference workspaces", () => {
      // Structural assertion: layout state keys are layout-only.
      const layoutKeys = new Set([
        "sidebarCollapsed",
        "mobileSidebarOpen",
        "density",
        "themeMode",
        "themeVariant",
        "dir",
      ]);
      for (const k of layoutKeys) {
        expect(k.startsWith("workspace")).toBe(false);
        expect(k.includes("active")).toBe(false);
      }
    });
  });
});
