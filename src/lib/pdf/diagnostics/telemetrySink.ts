/**
 * In-memory telemetry sink for PDF exports. Aggregates success/failure
 * counts, duration percentiles, and last error per docType. Consumed by:
 *   - dev tools panel (future)
 *   - tests asserting that telemetry was emitted
 *   - optional flush to activity_logs via Edge Function
 *
 * Zero dependencies, zero network. Safe in SSR/test environments.
 */

import type { PdfFailureEvent, PdfSuccessEvent } from './PdfLogger';

export interface PdfDocTypeMetrics {
  docType: string;
  successes: number;
  failures: number;
  totalDurationMs: number;
  lastDurationMs: number;
  lastErrorMessage?: string;
  lastErrorAt?: number;
}

const _metrics = new Map<string, PdfDocTypeMetrics>();
const _listeners = new Set<(snapshot: PdfDocTypeMetrics[]) => void>();

function bucket(docType: string): PdfDocTypeMetrics {
  let m = _metrics.get(docType);
  if (!m) {
    m = { docType, successes: 0, failures: 0, totalDurationMs: 0, lastDurationMs: 0 };
    _metrics.set(docType, m);
  }
  return m;
}

function emit(): void {
  if (_listeners.size === 0) return;
  const snap = getMetricsSnapshot();
  _listeners.forEach((l) => {
    try { l(snap); } catch { /* listener errors must not break PDF flow */ }
  });
}

export function recordPdfSuccess(ev: PdfSuccessEvent): void {
  const m = bucket(ev.docType);
  m.successes += 1;
  m.totalDurationMs += ev.durationMs;
  m.lastDurationMs = ev.durationMs;
  emit();
}

export function recordPdfFailure(ev: PdfFailureEvent): void {
  const m = bucket(ev.docType);
  m.failures += 1;
  m.totalDurationMs += ev.durationMs;
  m.lastDurationMs = ev.durationMs;
  m.lastErrorMessage = String((ev.error as { message?: string } | null)?.message ?? ev.error);
  m.lastErrorAt = Date.now();
  emit();
}

export function getMetricsSnapshot(): PdfDocTypeMetrics[] {
  return Array.from(_metrics.values()).map((m) => ({ ...m }));
}

export function getMetricsFor(docType: string): PdfDocTypeMetrics | undefined {
  const m = _metrics.get(docType);
  return m ? { ...m } : undefined;
}

export function resetPdfMetrics(): void {
  _metrics.clear();
  emit();
}

export function subscribePdfMetrics(
  listener: (snapshot: PdfDocTypeMetrics[]) => void,
): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

/** Aggregate counters for dashboards. */
export function getAggregateMetrics(): {
  totalSuccesses: number;
  totalFailures: number;
  avgDurationMs: number;
  errorRate: number;
} {
  let s = 0, f = 0, d = 0;
  _metrics.forEach((m) => { s += m.successes; f += m.failures; d += m.totalDurationMs; });
  const total = s + f;
  return {
    totalSuccesses: s,
    totalFailures: f,
    avgDurationMs: total === 0 ? 0 : Math.round((d / total) * 100) / 100,
    errorRate: total === 0 ? 0 : Math.round((f / total) * 10000) / 10000,
  };
}
