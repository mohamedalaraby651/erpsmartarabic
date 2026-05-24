import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPdfSuccess,
  recordPdfFailure,
  getMetricsSnapshot,
  getMetricsFor,
  resetPdfMetrics,
  subscribePdfMetrics,
  getAggregateMetrics,
} from './telemetrySink';

describe('telemetrySink', () => {
  beforeEach(() => resetPdfMetrics());

  it('records successes and failures per docType', () => {
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 120 });
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 80 });
    recordPdfFailure({ docType: 'invoice', engine: 'jspdf', durationMs: 50, error: new Error('boom') });

    const m = getMetricsFor('invoice');
    expect(m).toBeDefined();
    expect(m!.successes).toBe(2);
    expect(m!.failures).toBe(1);
    expect(m!.totalDurationMs).toBe(250);
    expect(m!.lastErrorMessage).toBe('boom');
  });

  it('aggregates across docTypes and computes error rate', () => {
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 100 });
    recordPdfSuccess({ docType: 'quotation', engine: 'jspdf', durationMs: 200 });
    recordPdfFailure({ docType: 'quotation', engine: 'jspdf', durationMs: 100, error: 'x' });

    const agg = getAggregateMetrics();
    expect(agg.totalSuccesses).toBe(2);
    expect(agg.totalFailures).toBe(1);
    expect(agg.avgDurationMs).toBeCloseTo(133.33, 1);
    expect(agg.errorRate).toBeCloseTo(0.3333, 3);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const calls: number[] = [];
    const unsub = subscribePdfMetrics((snap) => calls.push(snap.length));
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 10 });
    recordPdfSuccess({ docType: 'quotation', engine: 'jspdf', durationMs: 10 });
    unsub();
    recordPdfSuccess({ docType: 'sales_order', engine: 'jspdf', durationMs: 10 });
    expect(calls).toEqual([1, 2]);
  });

  it('reset clears all metrics', () => {
    recordPdfSuccess({ docType: 'invoice', engine: 'jspdf', durationMs: 10 });
    resetPdfMetrics();
    expect(getMetricsSnapshot()).toHaveLength(0);
  });
});
