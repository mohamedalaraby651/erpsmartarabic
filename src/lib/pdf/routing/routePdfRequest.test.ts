import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/pdfGeneratorLazy', () => ({
  generateDocumentPDF: vi.fn(async () => undefined),
  generatePDF: vi.fn(async () => undefined),
  getCompanySettings: vi.fn(async () => ({})),
}));

vi.mock('@/lib/statementPdfGenerator', () => ({
  generateStatementPdf: vi.fn(async () => undefined),
}));

vi.mock('../printInvoiceHtmlPdf', () => ({
  printInvoiceHtmlPdf: vi.fn(async () => ({ ok: true, blob: new Blob(), filename: 'i.pdf', config: {}, durationMs: 1, warnings: [] })),
}));
vi.mock('../printQuotationHtmlPdf', () => ({
  printQuotationHtmlPdf: vi.fn(async () => ({ ok: true, blob: new Blob(), filename: 'q.pdf', config: {}, durationMs: 1, warnings: [] })),
}));
vi.mock('../printPurchaseOrderHtmlPdf', () => ({
  printPurchaseOrderHtmlPdf: vi.fn(async () => ({ ok: true, blob: new Blob(), filename: 'po.pdf', config: {}, durationMs: 1, warnings: [] })),
}));
vi.mock('../printStatementHtmlPdf', () => ({
  printStatementHtmlPdf: vi.fn(async () => ({ ok: true, blob: new Blob(), filename: 'st.pdf', config: {}, durationMs: 1, warnings: [] })),
}));

import { routePdfRequest } from './routePdfRequest';
import * as legacy from '@/lib/pdfGeneratorLazy';
import { printInvoiceHtmlPdf } from '../printInvoiceHtmlPdf';
import { getMetricsFor, resetPdfMetrics } from '../diagnostics/telemetrySink';

describe('routePdfRequest', () => {
  beforeEach(() => {
    resetPdfMetrics();
    vi.clearAllMocks();
  });

  it('uses legacy engine when forceEngine=v1 and records v1 telemetry', async () => {
    const res = await routePdfRequest({
      docType: 'invoice',
      data: { invoice_number: 'X' },
      forceEngine: 'v1',
    });
    expect(res.engine).toBe('v1');
    expect(res.fellBack).toBe(false);
    expect(legacy.generateDocumentPDF).toHaveBeenCalledTimes(1);
    expect(printInvoiceHtmlPdf).not.toHaveBeenCalled();
    const m = getMetricsFor('invoice');
    expect(m?.v1Successes).toBe(1);
    expect(m?.lastEngine).toBe('v1');
  });

  it('uses v2 when forceEngine=v2 and records v2 telemetry', async () => {
    const res = await routePdfRequest({
      docType: 'invoice',
      data: { invoice_number: 'X' },
      forceEngine: 'v2',
    });
    expect(res.engine).toBe('v2');
    expect(res.fellBack).toBe(false);
    expect(printInvoiceHtmlPdf).toHaveBeenCalledTimes(1);
    expect(legacy.generateDocumentPDF).not.toHaveBeenCalled();
    const m = getMetricsFor('invoice');
    expect(m?.v2Successes).toBe(1);
    expect(m?.lastEngine).toBe('v2');
  });

  it('falls back to v1 when v2 throws and records both events', async () => {
    (printInvoiceHtmlPdf as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('v2 render failed'),
    );
    const res = await routePdfRequest({
      docType: 'invoice',
      data: { invoice_number: 'X' },
      forceEngine: 'v2',
    });
    expect(res.engine).toBe('v1');
    expect(res.fellBack).toBe(true);
    expect(legacy.generateDocumentPDF).toHaveBeenCalledTimes(1);
    const m = getMetricsFor('invoice');
    expect(m?.v2Failures).toBe(1);
    expect(m?.v1Successes).toBe(1);
  });

  it('propagates error when both engines fail', async () => {
    (printInvoiceHtmlPdf as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('v2 boom'),
    );
    (legacy.generateDocumentPDF as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('v1 boom'),
    );
    await expect(
      routePdfRequest({ docType: 'invoice', data: {}, forceEngine: 'v2' }),
    ).rejects.toThrow('v1 boom');
    const m = getMetricsFor('invoice');
    expect(m?.v2Failures).toBe(1);
    expect(m?.v1Failures).toBe(1);
  });

  it('routes unsupported v2 doc types through fallback', async () => {
    const res = await routePdfRequest({
      docType: 'purchase_order',
      data: {},
      forceEngine: 'v2',
    });
    expect(res.fellBack).toBe(true);
    expect(res.engine).toBe('v1');
  });

  it('uses v2 quotation pipeline when forced', async () => {
    const res = await routePdfRequest({
      docType: 'quotation',
      data: { quotation_number: 'Q-1' },
      forceEngine: 'v2',
    });
    expect(res.engine).toBe('v2');
    expect(res.fellBack).toBe(false);
    const m = getMetricsFor('quotation');
    expect(m?.v2Successes).toBe(1);
  });
});
