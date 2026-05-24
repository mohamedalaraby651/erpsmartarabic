import { logErrorSafely } from '@/lib/errorHandler';
import { recordPdfSuccess, recordPdfFailure } from './telemetrySink';

/**
 * Lightweight client-side logger for PDF export events.
 * Wraps performance marks and pushes structured records to the console
 * (and optionally to performanceMonitor) without touching the network on
 * the hot path. A future v2.1 may forward to activity_logs via an Edge Function.
 */
export interface PdfEventBase {
  docType: string;
  engine: 'jspdf' | 'html2pdf' | 'edge';
  pages?: number;
  bytes?: number;
}

export interface PdfSuccessEvent extends PdfEventBase {
  durationMs: number;
}

export interface PdfFailureEvent extends PdfEventBase {
  durationMs: number;
  error: unknown;
}

const PERF_PREFIX = 'pdf-export';

export function startTimer(docType: string): () => number {
  const start = performance.now();
  const markStart = `${PERF_PREFIX}:${docType}:start`;
  try { performance.mark(markStart); } catch { /* noop */ }
  return () => performance.now() - start;
}

export function logPdfSuccess(ev: PdfSuccessEvent): void {
  recordPdfSuccess(ev);
  if (typeof console !== 'undefined') {
    console.debug('[pdf]', 'success', ev);
  }
}

export function logPdfFailure(ev: PdfFailureEvent): void {
  recordPdfFailure(ev);
  logErrorSafely(`pdf.${ev.docType}`, ev.error);
  if (typeof console !== 'undefined') {
    console.warn('[pdf]', 'failure', { ...ev, error: String((ev.error as any)?.message ?? ev.error) });
  }
}

/** Wrap an async PDF op with timing + structured logging. */
export async function withPdfTelemetry<T>(
  docType: string,
  engine: PdfEventBase['engine'],
  fn: () => Promise<T>,
): Promise<T> {
  const stop = startTimer(docType);
  try {
    const result = await fn();
    logPdfSuccess({ docType, engine, durationMs: stop() });
    return result;
  } catch (error) {
    logPdfFailure({ docType, engine, durationMs: stop(), error });
    throw error;
  }
}
