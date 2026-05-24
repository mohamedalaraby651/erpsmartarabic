import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const flushMock = vi.fn().mockResolvedValue({ ok: true, flushed: 1 });
const snapshotMock = vi.fn(() => [] as unknown[]);

vi.mock('./telemetryFlush', () => ({
  flushPdfMetrics: (...a: unknown[]) => flushMock(...a),
}));
vi.mock('./telemetrySink', () => ({
  getMetricsSnapshot: () => snapshotMock(),
}));

import {
  installPdfTelemetryAutoFlush,
  uninstallPdfTelemetryAutoFlush,
} from './telemetryScheduler';

describe('telemetryScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    flushMock.mockClear();
    snapshotMock.mockReset();
    snapshotMock.mockReturnValue([{ docType: 'invoice' }]);
  });
  afterEach(() => {
    uninstallPdfTelemetryAutoFlush();
    vi.useRealTimers();
  });

  it('flushes on interval when metrics exist', async () => {
    installPdfTelemetryAutoFlush({ intervalMs: 5_000 });
    vi.advanceTimersByTime(5_000);
    await vi.runAllTimersAsync();
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it('skips flush when snapshot is empty (default)', async () => {
    snapshotMock.mockReturnValue([]);
    installPdfTelemetryAutoFlush({ intervalMs: 5_000 });
    vi.advanceTimersByTime(5_000);
    await vi.runAllTimersAsync();
    expect(flushMock).not.toHaveBeenCalled();
  });

  it('flushes when page becomes hidden', async () => {
    installPdfTelemetryAutoFlush();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(flushMock).toHaveBeenCalled();
  });

  it('is idempotent — second install is a no-op', () => {
    installPdfTelemetryAutoFlush({ intervalMs: 5_000 });
    installPdfTelemetryAutoFlush({ intervalMs: 5_000 });
    vi.advanceTimersByTime(5_000);
    // Only one timer registered, so one flush per tick max.
    return vi.runAllTimersAsync().then(() => {
      expect(flushMock).toHaveBeenCalledTimes(1);
    });
  });

  it('uninstall stops the interval', async () => {
    installPdfTelemetryAutoFlush({ intervalMs: 5_000 });
    uninstallPdfTelemetryAutoFlush();
    vi.advanceTimersByTime(20_000);
    await vi.runAllTimersAsync();
    expect(flushMock).not.toHaveBeenCalled();
  });
});
