/**
 * UX-1E — adapter contract conformance + boundary tests.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderHook, act } from "@testing-library/react";
import { useMockList } from "../adapters/useMockList";
import { useMockForm } from "../adapters/useMockForm";
import { useMockOverlay } from "../adapters/useMockOverlay";
import { scenarioNames } from "../scenarios";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADAPTERS_DIR = resolve(__dirname, "../adapters");

const FORBIDDEN = [
  /from\s+["']@\/lib\/repositories\//,
  /from\s+["']@\/lib\/queries\//,
  /from\s+["']@\/integrations\/supabase/,
  /from\s+["']@supabase\//,
  /from\s+["']@tanstack\/react-query["']/,
  /from\s+["']axios["']/,
  /from\s+["']zod["']/,
  /\bfetch\s*\(/,
];

describe("UX-1E adapter boundary", () => {
  it("no adapter imports forbidden runtime modules", () => {
    const files = readdirSync(ADAPTERS_DIR).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const f of files) {
      const src = readFileSync(resolve(ADAPTERS_DIR, f), "utf8");
      for (const r of FORBIDDEN) if (r.test(src)) violations.push(`${f} — ${r}`);
    }
    expect(violations).toEqual([]);
  });
});

describe("UX-1E adapter contract conformance", () => {
  it("useMockList exposes the DataGrid contract surface for every scenario", () => {
    for (const name of scenarioNames) {
      const { result } = renderHook(() => useMockList(name));
      const s = result.current;
      expect(Array.isArray(s.rows)).toBe(true);
      expect(Array.isArray(s.columns)).toBe(true);
      expect(["multi", "single", "none"]).toContain(s.selection.mode);
      expect(typeof s.getRowId).toBe("function");
      expect(typeof s.setSort).toBe("function");
      expect(typeof s.setSelection).toBe("function");
      expect(typeof s.setDensity).toBe("function");
      expect(typeof s.setPage).toBe("function");
      expect(s.pageCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("useMockForm exposes the Form contract surface for every scenario", () => {
    for (const name of scenarioNames) {
      const { result } = renderHook(() => useMockForm(name));
      const f = result.current;
      expect(typeof f.id).toBe("string");
      expect(["idle", "dirty", "submitting", "submitted", "error"]).toContain(f.phase);
      expect(typeof f.setField).toBe("function");
      expect(typeof f.submit).toBe("function");
      expect(typeof f.reset).toBe("function");
    }
  });

  it("useMockOverlay consumes an OverlaySpec and toggles open state", () => {
    const spec = {
      id: "ovl",
      title: "T",
      bodySlot: "b",
      size: "md" as const,
      dismissible: true,
    };
    const { result } = renderHook(() => useMockOverlay(spec));
    expect(result.current.open).toBe(false);
    act(() => result.current.openOverlay());
    expect(result.current.open).toBe(true);
    act(() => result.current.closeOverlay("cancel"));
    expect(result.current.open).toBe(false);
    expect(result.current.lastCloseReason).toBe("cancel");
  });
});
