import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the legacy generator before importing the engine so the dynamic
// `import('../../pdfGenerator')` inside JsPdfEngine resolves to our stub.
vi.mock('@/lib/pdfGenerator', () => ({
  generateDocumentPDF: vi.fn(async () => undefined),
  generatePDF: vi.fn(async () => undefined),
  getCompanySettings: vi.fn(async () => ({})),
}));

import { jsPdfEngine } from './JsPdfEngine';
import { DEFAULT_PAGE_CONFIG } from '../config/PageConfig';
import { DEFAULT_THEME } from '../config/ThemeConfig';
import { PdfValidationError } from '../diagnostics/errors';

const ctx = { page: DEFAULT_PAGE_CONFIG, theme: DEFAULT_THEME };

describe('JsPdfEngine', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes a stable id and availability flag', () => {
    expect(jsPdfEngine.id).toBe('jspdf');
    expect(jsPdfEngine.isAvailable()).toBe(true);
  });

  it('rejects invalid payloads with PdfEngineError', async () => {
    await expect(
      jsPdfEngine.render(ctx, null as unknown, 'x.pdf'),
    ).rejects.toThrow(/invalid payload/);
  });

  it('runs validation before reaching the legacy generator', async () => {
    await expect(
      jsPdfEngine.render(
        ctx,
        { documentType: 'invoice', data: { items: [] } },
        'inv.pdf',
      ),
    ).rejects.toBeInstanceOf(PdfValidationError);
  });

  it('returns a result with the requested filename on success', async () => {
    const res = await jsPdfEngine.render(
      ctx,
      {
        documentType: 'invoice',
        data: {
          invoice_number: 'INV-1',
          date: '2026-05-24',
          items: [{ name: 'X', quantity: 1, unit_price: 10, total_price: 10 }],
          subtotal: 10,
          total: 10,
        },
      },
      'inv.pdf',
    );
    expect(res.filename).toBe('inv.pdf');
    expect(res.engine).toBe('jspdf');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });
});
