import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HtmlPdfEngine } from './HtmlPdfEngine';
import { createPageConfig } from '../config/PageConfig';
import { defaultTheme } from '../config/ThemeConfig';
import { resetPdfMetrics, getMetricsFor } from '../diagnostics/telemetrySink';

const ctx = { page: createPageConfig({ size: 'A4', orientation: 'portrait' }), theme: defaultTheme };

describe('HtmlPdfEngine', () => {
  beforeEach(() => resetPdfMetrics());

  it('is available in a DOM environment', () => {
    const engine = new HtmlPdfEngine(async () => (() => ({} as never)) as never);
    expect(engine.isAvailable()).toBe(true);
    expect(engine.id).toBe('html2pdf');
  });

  it('rejects invalid payload', async () => {
    const engine = new HtmlPdfEngine(async () => (() => ({} as never)) as never);
    await expect(
      engine.render(ctx, { html: 123 as unknown as string }, 'x.pdf'),
    ).rejects.toThrow(/invalid payload/);
  });

  it('renders HTML string into a blob via the loader and records telemetry', async () => {
    const fakeBlob = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
    const html2pdfStub = vi.fn(() => ({
      outputPdf: vi.fn(async (t: string) => {
        expect(t).toBe('blob');
        return fakeBlob;
      }),
      save: vi.fn(async () => undefined),
    }));
    const engine = new HtmlPdfEngine(async () => html2pdfStub as never);

    const result = await engine.render(
      ctx,
      { html: '<h1>سلام</h1>', documentType: 'invoice' } as never,
      'invoice.pdf',
    );

    expect(result.blob).toBe(fakeBlob);
    expect(result.engine).toBe('html2pdf');
    expect(result.filename).toBe('invoice.pdf');
    expect(html2pdfStub).toHaveBeenCalledOnce();
    const m = getMetricsFor('invoice');
    expect(m?.successes).toBe(1);
  });

  it('cleans up the offscreen container after render', async () => {
    const html2pdfStub = vi.fn(() => ({
      outputPdf: async () => new Blob([], { type: 'application/pdf' }),
      save: async () => undefined,
    }));
    const engine = new HtmlPdfEngine(async () => html2pdfStub as never);
    const before = document.body.children.length;
    await engine.render(ctx, { html: '<p>x</p>' } as never, 'x.pdf');
    expect(document.body.children.length).toBe(before);
  });

  it('propagates loader failure as PdfEngineError and records failure metric', async () => {
    const engine = new HtmlPdfEngine(async () => { throw new Error('cdn down'); });
    await expect(
      engine.render(ctx, { html: '<p>x</p>', documentType: 'quotation' } as never, 'q.pdf'),
    ).rejects.toThrow();
    const m = getMetricsFor('quotation');
    expect(m?.failures).toBe(1);
  });
});
