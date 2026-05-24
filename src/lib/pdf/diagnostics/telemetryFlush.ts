/**
 * Flush in-memory PDF telemetry to the backend via the existing
 * `log-event` Edge Function. Best-effort — never throws, never blocks
 * the PDF hot path. Designed to be invoked from an admin panel or a
 * lightweight idle scheduler.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  getAggregateMetrics,
  getMetricsSnapshot,
  resetPdfMetrics,
} from './telemetrySink';

export interface FlushOptions {
  /** Reset the in-memory sink after a successful flush. Default true. */
  reset?: boolean;
  /** Override the log level. Default 'info', auto-escalates to 'warn'
   *  when failure count > 0. */
  level?: 'debug' | 'info' | 'warn' | 'error';
}

export interface FlushResult {
  ok: boolean;
  flushed: number;
  error?: string;
}

export async function flushPdfMetrics(opts: FlushOptions = {}): Promise<FlushResult> {
  const snapshot = getMetricsSnapshot();
  if (snapshot.length === 0) {
    return { ok: true, flushed: 0 };
  }
  const agg = getAggregateMetrics();
  const level =
    opts.level ?? (agg.totalFailures > 0 ? 'warn' : 'info');

  try {
    const { error } = await supabase.functions.invoke('log-event', {
      body: {
        level,
        message: 'pdf.telemetry.flush',
        endpoint: 'pdf-engine',
        duration_ms: Math.round(agg.avgDurationMs),
        metadata: {
          source: 'pdf-engine-v2',
          aggregate: agg,
          perDocType: snapshot,
          flushedAt: new Date().toISOString(),
        },
      },
    });
    if (error) {
      return { ok: false, flushed: 0, error: String(error.message ?? error) };
    }
    if (opts.reset !== false) resetPdfMetrics();
    return { ok: true, flushed: snapshot.length };
  } catch (e) {
    return { ok: false, flushed: 0, error: String((e as Error)?.message ?? e) };
  }
}
