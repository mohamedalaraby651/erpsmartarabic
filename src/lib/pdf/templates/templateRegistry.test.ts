import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/pdfGenerator', () => ({
  generateDocumentPDF: vi.fn(async () => undefined),
  generatePDF: vi.fn(async () => undefined),
  getCompanySettings: vi.fn(async () => ({})),
}));

import {
  getTemplate,
  listTemplates,
  overrideTemplate,
  renderDocument,
} from './templateRegistry';
import { jsPdfEngine } from '../engine/JsPdfEngine';

const validInvoice = {
  invoice_number: 'INV-42',
  items: [{ name: 'A', quantity: 2, unit_price: 5, total_price: 10 }],
  subtotal: 10,
  total: 10,
};

describe('templateRegistry', () => {
  it('seeds all 7 supported document types', () => {
    const types = listTemplates();
    expect(types).toEqual(
      expect.arrayContaining([
        'invoice',
        'quotation',
        'sales_order',
        'purchase_order',
        'payment_receipt',
        'expense_receipt',
        'credit_note',
      ]),
    );
  });

  it('returns the jsPdf engine by default for invoice', () => {
    const b = getTemplate('invoice');
    expect(b.engine).toBe(jsPdfEngine);
    expect(b.docType).toBe('invoice');
    expect(b.filename(validInvoice)).toBe('invoice_INV-42.pdf');
  });

  it('sanitizes unsafe characters in filename', () => {
    const b = getTemplate('quotation');
    expect(b.filename({ quotation_number: 'Q/2026?01' })).toBe('quotation_Q_2026_01.pdf');
  });

  it('falls back to "document" when no number field present', () => {
    const b = getTemplate('credit_note');
    expect(b.filename({})).toBe('credit_note_document.pdf');
  });

  it('overrideTemplate merges the theme patch', () => {
    overrideTemplate('invoice', { theme: { primaryColor: '#ff0000' } as never });
    expect(getTemplate('invoice').theme.primaryColor).toBe('#ff0000');
  });

  it('renderDocument returns a PdfRenderResult', async () => {
    const res = await renderDocument('invoice', validInvoice);
    expect(res.engine).toBe('jspdf');
    expect(res.filename).toBe('invoice_INV-42.pdf');
  });

  it('throws for unknown doc types', () => {
    expect(() => getTemplate('foo' as never)).toThrow(/No PDF template/);
  });
});
