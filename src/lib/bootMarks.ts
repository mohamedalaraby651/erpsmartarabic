/**
 * Boot performance marks — measure cold-start phases (auth, first RPC, dashboard
 * paint) so we can correlate "the app feels slow" with concrete numbers.
 *
 * Usage: `markPhase('auth_ready')` once per phase. Each subsequent call also
 * emits a telemetry event with deltaMs since `nav_start` and since the
 * previous mark. In production we ship the mark to the Edge log function so
 * support can see slow cold-starts even without DevTools.
 */
import { emitTelemetry } from './runtimeTelemetry';

export type BootPhase =
  | 'js_executed'
  | 'react_mounted'
  | 'auth_init_start'
  | 'auth_ready'
  | 'first_rpc_start'
  | 'first_rpc_done'
  | 'dashboard_painted';

const seen = new Set<BootPhase>();
let lastTime = 0;

export function markPhase(phase: BootPhase, metadata?: Record<string, unknown>): void {
  if (typeof performance === 'undefined') return;
  if (seen.has(phase)) return; // each phase only fires once per session
  seen.add(phase);

  try {
    const now = performance.now();
    const deltaSinceStart = Math.round(now);
    const deltaSinceLast = lastTime ? Math.round(now - lastTime) : deltaSinceStart;
    lastTime = now;

    // Native Performance API mark — visible in DevTools Performance panel
    try { performance.mark(`lvbl:${phase}`); } catch { /* ignore */ }

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[boot] ${phase} +${deltaSinceLast}ms (total ${deltaSinceStart}ms)`);
    }

    // Only ship "interesting" marks to the backend to avoid noise.
    // We care about the late phases that indicate slow cold-starts.
    const shouldShip =
      phase === 'auth_ready' ||
      phase === 'first_rpc_done' ||
      phase === 'dashboard_painted';

    if (shouldShip) {
      emitTelemetry('perf_mark', phase, {
        metadata: { phase, deltaSinceStart, deltaSinceLast, ...metadata },
      });
    }
  } catch {
    /* never break on telemetry */
  }
}

/** Drain the marks Set — useful for testing. */
export function _resetBootMarks(): void {
  seen.clear();
  lastTime = 0;
}
