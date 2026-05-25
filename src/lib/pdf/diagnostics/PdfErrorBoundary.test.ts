import { describe, it, expect, vi } from 'vitest';
import { safeRender, classifyPdfError } from './PdfErrorBoundary';

describe('classifyPdfError', () => {
  it('classifies timeout', () => {
    expect(classifyPdfError(new Error('Render timed out')).code).toBe('timeout');
  });
  it('classifies font errors', () => {
    expect(classifyPdfError(new Error('font failed to load')).code).toBe('font-load');
  });
  it('classifies engine missing', () => {
    expect(classifyPdfError(new Error('html2pdf module missing')).code).toBe('engine-missing');
  });
  it('falls back to unknown', () => {
    expect(classifyPdfError(new Error('totally weird')).code).toBe('unknown');
  });
});

describe('safeRender', () => {
  it('returns ok=true on success', async () => {
    const r = await safeRender(async () => 42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('returns ok=false on thrown error', async () => {
    const r = await safeRender(async () => {
      throw new Error('font missing');
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('font-load');
  });

  it('honors timeout', async () => {
    const r = await safeRender(() => new Promise(() => {}), { timeoutMs: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('timeout');
  });

  it('fires telemetry callback', async () => {
    const spy = vi.fn();
    await safeRender(async () => 1, { onTelemetry: spy });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
