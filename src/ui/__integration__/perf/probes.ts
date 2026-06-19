/**
 * Performance probes — UX-1E.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Tiny `performance.now()` wrappers — used by the harness to populate the
 * Performance Matrix in the readiness report. No third-party perf libs.
 */
import type { ManifestPerfPoint } from "../integration.manifest";

export type PerfMeasurements = Record<ManifestPerfPoint, number | null>;

export interface PerfEnvironment {
  readonly node: string | null;
  readonly vitest: string | null;
  readonly jsdom: string | null;
  readonly userAgent: string | null;
  readonly seed: number;
}

export interface PerfSample {
  readonly scenario: string;
  readonly environment: PerfEnvironment;
  readonly measurements: PerfMeasurements;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}

export function timeSync<T>(fn: () => T): { ms: number; value: T } {
  const start = now();
  const value = fn();
  return { ms: now() - start, value };
}

export async function timeAsync<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const start = now();
  const value = await fn();
  return { ms: now() - start, value };
}

export function makeEnvironment(seed: number): PerfEnvironment {
  // Read minimal, non-secret info. Node version is undefined in browser.
  const ua =
    typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
      ? navigator.userAgent
      : null;
  return {
    node: typeof process !== "undefined" ? process.versions?.node ?? null : null,
    vitest: null,
    jsdom: ua && ua.includes("jsdom") ? ua : null,
    userAgent: ua,
    seed,
  };
}

export function emptyMeasurements(): PerfMeasurements {
  return {
    firstRender: null,
    sort: null,
    selectionToggle: null,
    dialogOpen: null,
  };
}
