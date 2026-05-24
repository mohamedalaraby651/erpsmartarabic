import { describe, it, expect } from 'vitest';
import {
  computeInvoiceTotals,
  renderInvoiceHtml,
  INVOICE_HTML_CSS,
  type InvoiceHtmlData,
} from './InvoiceHtmlTemplate';

const sample: InvoiceHtmlData = {
  invoiceNumber: 'INV-2026-001',
  issueDate: '2026-05-24',
  dueDate: '2026-06-23',
  company: { name: 'شركة الاختبار', taxNumber: '123456789' },
  customer: { name: 'عميل تجريبي', taxNumber: '987654321' },
  items: [
    { description: 'منتج أ', quantity: 2, unitPrice: 100 },
    { description: 'منتج ب', quantity: 1, unitPrice: 50.555 },
  ],
  taxRate: 0.14,
  discountRate: 0.1,
  currency: 'EGP',
};

describe('InvoiceHtmlTemplate', () => {
  it('computes totals with two-decimal precision', () => {
    const t = computeInvoiceTotals(sample);
    // subtotal: 200 + 50.56 = 250.56  (50.555 rounds in display, but sum uses raw)
    // qty*unit = 50.555 → subtotal raw 250.555 → r2 = 250.56
    expect(t.subtotal).toBe(250.56);
    expect(t.discount).toBe(25.06);
    expect(t.taxable).toBe(225.5);
    expect(t.tax).toBe(31.57);
    expect(t.total).toBe(257.07);
  });

  it('renders Arabic labels and tabular number cells', () => {
    const html = renderInvoiceHtml(sample);
    expect(html).toContain('فاتورة');
    expect(html).toContain('رقم الفاتورة');
    expect(html).toContain('المجموع الفرعي');
    expect(html).toContain('الإجمالي المستحق');
    expect(html).toContain('class="num"');
    expect(html).toContain('INV-2026-001');
    expect(html).toContain('عميل تجريبي');
    expect(html).toContain('EGP');
  });

  it('escapes HTML and strips bidi markers from inputs', () => {
    const html = renderInvoiceHtml({
      ...sample,
      customer: { name: '<script>alert(1)</script>\u202Eمعكوس' },
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toMatch(/[\u202A-\u202E\u2066-\u2069]/);
  });

  it('handles empty items and missing optional fields', () => {
    const html = renderInvoiceHtml({
      invoiceNumber: 'X',
      issueDate: '2026-01-01',
      company: { name: 'C' },
      customer: { name: 'K' },
      items: [],
    });
    expect(html).toContain('<tbody></tbody>');
    expect(html).not.toContain('ملاحظات');
  });

  it('exposes a CSS overlay string', () => {
    expect(INVOICE_HTML_CSS).toContain('.invoice');
    expect(INVOICE_HTML_CSS).toContain('table.totals');
  });
});
