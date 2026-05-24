/**
 * Auto-flush PDF telemetry to the backend on browser idle, with safe
 * fallbacks for environments without `requestIdleCallback` (Safari, SSR,
 * tests). Designed to be installed once at app boot — extra calls are
 * idempotent and cheap.
 *
 * Triggers a flush when ANY of these happen:
 *   - Idle window reached (every `intervalMs`, default 60s)
 *   - Page hidden / about to unload (best-effort, uses `sendBeacon` path
 *     via the regular flush — small payload, non-blocking)
 *
 * Never throws. Never blocks the PDF hot path.
 */
import { flushPdfMetrics } from './telemetryFlush';
import { getMetricsSnapshot } from './telemetrySink';

interface SchedulerOptions {
  intervalMs?: number;
  /** Flush even when the snapshot has zero entries (mostly for tests). */
  flushEmpty?: boolean;
}

let _installed = false;
let _timer: ReturnType<typeof setInterval> | null = null;
let _cleanup: Array<() => void> = [];

type IdleApi = (cb: () => void, opts?: { timeout: number }) => number;

function scheduleIdle(cb: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: IdleApi })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb, { timeout: 2_000 });
  } else {
    // Fallback: microtask + small delay so we don't fight the main thread.
    setTimeout(cb, 0);
  }
}

async function tryFlush(flushEmpty: boolean): Promise<void> {
  if (!flushEmpty && getMetricsSnapshot().length === 0) return;
  try {
    await flushPdfMetrics();
  } catch {
    // never throw from the scheduler
  }
}

/** Install once at boot. Safe to call multiple times. */
export function installPdfTelemetryAutoFlush(opts: SchedulerOptions = {}): () => void {
  if (_installed) return uninstallPdfTelemetryAutoFlush;
  if (typeof window === 'undefined') return () => undefined;
  _installed = true;

  const intervalMs = Math.max(5_000, opts.intervalMs ?? 60_000);
  const flushEmpty = opts.flushEmpty ?? false;

  _timer = setInterval(() => scheduleIdle(() => tryFlush(flushEmpty)), intervalMs);

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      void tryFlush(flushEmpty);
    }
  };
  const onPageHide = () => { void tryFlush(flushEmpty); };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);

  _cleanup = [
    () => document.removeEventListener('visibilitychange', onVisibility),
    () => window.removeEventListener('pagehide', onPageHide),
  ];

  return uninstallPdfTelemetryAutoFlush;
}

export function uninstallPdfTelemetryAutoFlush(): void {
  if (!_installed) return;
  if (_timer) { clearInterval(_timer); _timer = null; }
  _cleanup.forEach((fn) => { try { fn(); } catch { /* noop */ } });
  _cleanup = [];
  _installed = false;
}
