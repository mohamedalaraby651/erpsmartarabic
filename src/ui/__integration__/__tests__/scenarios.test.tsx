/**
 * UX-1E — scenario rendering, event envelope + immutability, edge scenarios.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { DataGrid, Form, Pagination, EmptyState, ErrorState, LoadingState } from "@/ui/composites";
import type { CompositeEvent, EventPayload, GridUIEvent, FormUIEvent } from "@/ui/contracts";
import { scenarios, scenarioNames, type ScenarioName } from "../scenarios";
import { createRecorder } from "../events/EventRecorder";
import { integrationManifest } from "../integration.manifest";

const ALLOWED_TYPES = new Set([
  "grid.sort.change",
  "grid.selection.change",
  "grid.row.activate",
  "grid.density.change",
  "grid.page.change",
  "form.dirty",
  "form.submit",
  "form.reset",
  "form.error",
  "overlay.open",
  "overlay.close",
]);

function isShallowPayload(p: unknown): boolean {
  if (!p || typeof p !== "object") return false;
  for (const v of Object.values(p as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") continue;
    if (Array.isArray(v)) {
      if (v.some((x) => x !== null && typeof x === "object")) return false;
      continue;
    }
    if (t === "object") {
      for (const vv of Object.values(v as Record<string, unknown>)) {
        const tt = typeof vv;
        if (vv === null || tt === "string" || tt === "number" || tt === "boolean") continue;
        if (Array.isArray(vv) && vv.every((x) => x === null || typeof x !== "object")) continue;
        return false;
      }
      continue;
    }
    return false;
  }
  return true;
}

describe("UX-1E manifest", () => {
  it("schema and fingerprint are locked", () => {
    expect(integrationManifest.manifestSchema).toBe(1);
    expect(integrationManifest.fingerprint).toBe("ux1e-v3");
    expect(integrationManifest.frozenContracts).toBe(true);
    expect(integrationManifest.disposable).toBe(true);
    expect(integrationManifest.devOnly).toBe(true);
  });

  it("declares 8 scenarios and 10 composites", () => {
    expect(integrationManifest.scenarios).toHaveLength(8);
    expect(integrationManifest.composites).toHaveLength(10);
  });
});

describe("UX-1E scenario rendering", () => {
  for (const name of scenarioNames) {
    it(`renders DataGrid/Form for ${name} without crashing`, () => {
      const s = scenarios[name];
      const recorder = createRecorder();
      const onEvent = (e: CompositeEvent<string, EventPayload>) => recorder.record(e);

      if (s.rows.length === 0) {
        render(<EmptyState title="No rows" />);
        return;
      }
      render(
        <>
          <DataGrid
            rows={s.rows.slice(0, 50)}
            columns={s.columns}
            getRowId={(r) => r.id}
            ariaLabel={`grid-${name}`}
            onEvent={onEvent as (e: GridUIEvent) => void}
          />
          <Pagination page={1} pageCount={5} onEvent={onEvent as (e: GridUIEvent) => void} />
        </>,
      );
      const next = screen.getByRole("button", { name: /next/i });
      fireEvent.click(next);
      const recorded = recorder.flush();
      expect(recorded.length).toBeGreaterThan(0);
      for (const r of recorded) {
        expect(Object.isFrozen(r)).toBe(true);
        expect(Object.isFrozen(r.event)).toBe(true);
        expect(ALLOWED_TYPES.has(r.event.type)).toBe(true);
        expect(isShallowPayload(r.event.payload)).toBe(true);
      }
    });
  }
});

describe("UX-1E edge scenarios", () => {
  it("duplicateIds — DataGrid uses getRowId; React keys remain stable", () => {
    const s = scenarios.duplicateIds;
    const { container } = render(
      <DataGrid
        rows={s.rows}
        columns={s.columns}
        getRowId={(r, i = 0) => `${r.id}#${i}`}
        ariaLabel="dup"
      />,
    );
    expect(container.querySelectorAll("tbody tr").length).toBe(s.rows.length);
  });

  it("nullFields — composite renders without throwing on null/empty cells", () => {
    const s = scenarios.nullFields;
    render(
      <DataGrid
        rows={s.rows}
        columns={s.columns}
        getRowId={(r) => r.id}
        ariaLabel="null"
      />,
    );
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("unicode — RTL + mixed scripts render", () => {
    const s = scenarios.unicode;
    render(
      <div dir="rtl">
        <DataGrid
          rows={s.rows}
          columns={s.columns}
          getRowId={(r) => r.id}
          ariaLabel="uni"
        />
      </div>,
    );
    expect(screen.getByText(/شركة الأمل/)).toBeInTheDocument();
  });
});

describe("UX-1E EventRecorder immutability (E7)", () => {
  it("records events as frozen, deep-cloned envelopes", () => {
    const recorder = createRecorder();
    const payload = { columnId: "x", direction: "asc" as const };
    recorder.record({ type: "grid.sort.change", payload });
    // Mutate the source payload AFTER recording — recorded copy must be unaffected.
    (payload as { columnId: string }).columnId = "MUTATED";
    const recorded = recorder.flush()[0];
    expect(Object.isFrozen(recorded.event)).toBe(true);
    expect(recorded.event.payload.columnId).toBe("x");
  });
});

describe("UX-1E LoadingState / ErrorState render under their scenarios", () => {
  it("LoadingState mounts", () => {
    render(<LoadingState label="loading" />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });
  it("ErrorState mounts", () => {
    render(<ErrorState title="boom" description="x" />);
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
