/**
 * Runtime Telemetry — diagnostic event emitter for client-side incidents.
 *
 * Captures four classes of events that previously failed silently:
 *   1. `react_error_boundary` — caught by AppErrorBoundary / PageErrorBoundary
 *   2. `chunk_load_error`     — dynamic import / lazy() failure (post-deploy)
 *   3. `forced_reload`        — lazyWithRetry hit reload fallback
 *   4. `white_screen`         — index.html shield triggered (root empty 10s+)
 *   5. `unhandled_error`      — global window.onerror / unhandledrejection
 *
 * Sink strategy (best-effort, never throws):
 *   - Always: console (dev pretty / prod JSON)
 *   - Always: ring-buffer in localStorage (last 20 events) — survives reload,
 *             readable by support via DevTools or a future admin page.
 *   - Best-effort: POST to `log-event` Edge Function with sendBeacon fallback
 *             so the event ships even during page-unload / reload.
 *
 * Hard rules:
 *   - Never throw from telemetry code (would mask the original error)
 *   - Never block startup; all I/O is fire-and-forget
 *   - Never send PII (email/name) — only ids, paths, error names/messages
 */

export type TelemetryEventType =
  | 'react_error_boundary'
  | 'chunk_load_error'
  | 'forced_reload'
  | 'white_screen'
  | 'unhandled_error'
  | 'unhandled_rejection'
  | 'sw_cleanup_reload';

export interface TelemetryEvent {
  type: TelemetryEventType;
  message: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
  componentStack?: string;
  errorName?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'lvbl:runtime-events:v1';
const MAX_BUFFERED = 20;
const DEDUPE_WINDOW_MS = 2000;

let lastSignature: string | null = null;
let lastSignatureAt = 0;

function signatureOf(e: Pick<TelemetryEvent, 'type' | 'message'>): string {
  return `${e.type}::${e.message}`;
}

function readBuffer(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(events: TelemetryEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_BUFFERED)));
  } catch {
    /* quota exceeded or storage disabled — ignore */
  }
}

function pushToBuffer(event: TelemetryEvent): void {
  const buf = readBuffer();
  buf.push(event);
  writeBuffer(buf);
}

/**
 * Read the persisted ring-buffer of recent runtime events.
 * Useful for support tooling and the White-Screen recovery UI.
 */
export function getBufferedEvents(): TelemetryEvent[] {
  return readBuffer();
}

/** Wipe the persisted buffer (e.g. after support has exported it). */
export function clearBufferedEvents(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Send the event to the Edge Function. Uses sendBeacon when available so the
 * event ships even during the unload phase of a forced reload.
 */
function shipToEdge(event: TelemetryEvent): void {
  if (typeof window === 'undefined') return;
  // Skip in dev to avoid noise + CORS pre-flight churn.
  if (import.meta.env.DEV) return;

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-event`;
    const payload = {
      level: event.type === 'white_screen' || event.type === 'react_error_boundary' ? 'error' : 'warn',
      message: `[runtime] ${event.type}: ${event.message}`,
      endpoint: event.url,
      metadata: {
        type: event.type,
        userAgent: event.userAgent,
        componentStack: event.componentStack,
        errorName: event.errorName,
        errorStack: event.errorStack?.slice(0, 2000),
        ...event.metadata,
      },
    };
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    };

    // Prefer sendBeacon for unload-safety. It can't set custom headers, so we
    // inline the apikey as a query param fallback if needed by the Edge fn.
    const blob = new Blob([body], { type: 'application/json' });
    const ok = 'sendBeacon' in navigator
      ? navigator.sendBeacon(`${url}?apikey=${headers.apikey}`, blob)
      : false;

    if (!ok) {
      // Fallback to fetch with keepalive
      void fetch(url, { method: 'POST', headers, body, keepalive: true }).catch(() => { /* ignore */ });
    }
  } catch {
    /* never break on telemetry */
  }
}

/**
 * Main entry point — emit a diagnostic event.
 * Safe to call from any context; never throws, never blocks.
 */
export function emitTelemetry(
  type: TelemetryEventType,
  message: string,
  extra: Partial<Omit<TelemetryEvent, 'type' | 'message' | 'timestamp'>> = {},
): void {
  try {
    const event: TelemetryEvent = {
      type,
      message: String(message || 'unknown').slice(0, 500),
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ...extra,
    };

    // Dedupe identical events fired within a short window (e.g. error loops).
    const sig = signatureOf(event);
    const now = Date.now();
    if (sig === lastSignature && now - lastSignatureAt < DEDUPE_WINDOW_MS) return;
    lastSignature = sig;
    lastSignatureAt = now;

    // 1. console — always
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[telemetry:${type}]`, message, extra);
    } else {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(event));
    }

    // 2. localStorage ring-buffer
    pushToBuffer(event);

    // 3. ship to Edge Function (best-effort)
    shipToEdge(event);
  } catch {
    /* swallow */
  }
}

/**
 * Install global handlers for window.onerror + unhandledrejection.
 * Call once from main.tsx as early as possible.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  const isChunkErr = (msg: string) =>
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg);

  window.addEventListener('error', (e) => {
    const msg = e.message || 'unknown error';
    if (isChunkErr(msg)) {
      emitTelemetry('chunk_load_error', msg, {
        errorName: e.error?.name,
        errorStack: e.error?.stack,
        metadata: { filename: e.filename, lineno: e.lineno, colno: e.colno },
      });
      return;
    }
    emitTelemetry('unhandled_error', msg, {
      errorName: e.error?.name,
      errorStack: e.error?.stack,
      metadata: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as { message?: string; name?: string; stack?: string } | undefined;
    const msg = reason?.message || String(e.reason || 'unhandled rejection');
    if (isChunkErr(msg)) {
      emitTelemetry('chunk_load_error', msg, { errorName: reason?.name, errorStack: reason?.stack });
      return;
    }
    emitTelemetry('unhandled_rejection', msg, { errorName: reason?.name, errorStack: reason?.stack });
  });
}

/**
 * Drain pre-React events the index.html shield wrote into a global before
 * the React bundle even loaded. Called once from main.tsx after React mounts.
 */
export function drainBootstrapEvents(): void {
  try {
    const w = window as unknown as { __LVBL_BOOT_EVENTS__?: TelemetryEvent[] };
    const events = w.__LVBL_BOOT_EVENTS__;
    if (!Array.isArray(events) || events.length === 0) return;
    events.forEach((e) => {
      // Skip dedupe by clearing signature so each gets through
      lastSignature = null;
      emitTelemetry(e.type, e.message, e);
    });
    w.__LVBL_BOOT_EVENTS__ = [];
  } catch {
    /* ignore */
  }
}
