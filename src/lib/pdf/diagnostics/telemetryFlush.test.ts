import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordPdfSuccess, recordPdfFailure, resetPdfMetrics, getMetricsSnapshot } from './telemetrySink';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { flushPdfMetrics } from './telemetryFlush';

describe('flushPdfMetrics', () => {
  beforeEach(() => {
    resetPdfMetrics();
    invokeMock.mockReset();
  });

  it('returns ok with zero flush when sink is empty', async () => {
    const res = await flushPdfMetrics();
    expect(res).toEqual({ ok: true, flushed: 0 });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('invokes log-event with aggregate + per-doc metrics, escalates level on failures', async () => {
    invokeMock.mockResolvedValue({ error: null });
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 120 });
    recordPdfFailure({
      docType: 'quotation',
      engine: 'jspdf',
      durationMs: 50,
      error: new Error('boom'),
    });

    const res = await flushPdfMetrics();
    expect(res.ok).toBe(true);
    expect(res.flushed).toBe(2);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [fnName, args] = invokeMock.mock.calls[0];
    expect(fnName).toBe('log-event');
    expect(args.body.level).toBe('warn');
    expect(args.body.metadata.aggregate.totalFailures).toBe(1);
    // reset by default
    expect(getMetricsSnapshot()).toEqual([]);
  });

  it('keeps metrics when reset:false', async () => {
    invokeMock.mockResolvedValue({ error: null });
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 10 });
    await flushPdfMetrics({ reset: false });
    expect(getMetricsSnapshot()).toHaveLength(1);
  });

  it('returns ok:false when edge function errors', async () => {
    invokeMock.mockResolvedValue({ error: { message: 'nope' } });
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 10 });
    const res = await flushPdfMetrics();
    expect(res.ok).toBe(false);
    expect(res.error).toBe('nope');
    // metrics retained on failure
    expect(getMetricsSnapshot()).toHaveLength(1);
  });

  it('does not throw when invoke rejects', async () => {
    invokeMock.mockRejectedValue(new Error('network'));
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 10 });
    const res = await flushPdfMetrics();
    expect(res.ok).toBe(false);
    expect(res.error).toBe('network');
  });
});
