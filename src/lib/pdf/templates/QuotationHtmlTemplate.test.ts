import { describe, it, expect } from 'vitest';
import {
  renderQuotationHtml,
  computeQuotationTotals,
  QUOTATION_HTML_CSS,
  type QuotationHtmlData,
} from './QuotationHtmlTemplate';

const baseData: QuotationHtmlData = {
  quotationNumber: 'Q-2026-001',
  issueDate: '2026-05-25',
  validUntil: '2026-06-25',
  company: { name: 'شركة الاختبار', taxNumber: '123456789' },
  customer: { name: 'عميل افتراضي' },
  items: [
    { description: 'منتج أول', quantity: 2, unitPrice: 100 },
    { description: 'خدمة استشارية', quantity: 1, unitPrice: 50, total: 50 },
  ],
  taxRate: 0.14,
  discountRate: 0.1,
  currency: 'EGP',
  paymentTerms: '50% مقدم — الباقي عند التسليم',
};

describe('QuotationHtmlTemplate', () => {
  it('computes totals with discount and tax (financial precision)', () => {
    const t = computeQuotationTotals(baseData);
    // subtotal = 200 + 50 = 250
    expect(t.subtotal).toBe(250);
    // discount = 25
    expect(t.discount).toBe(25);
    // taxable = 225
    expect(t.taxable).toBe(225);
    // tax = 31.5
    expect(t.tax).toBe(31.5);
    expect(t.total).toBe(256.5);
  });

  it('renders Arabic headings and quote metadata', () => {
    const html = renderQuotationHtml(baseData);
    expect(html).toContain('عرض سعر');
    expect(html).toContain('Q-2026-001');
    expect(html).toContain('صالح حتى');
    expect(html).toContain('شركة الاختبار');
    expect(html).toContain('عميل افتراضي');
    expect(html).toContain('شروط الدفع');
    expect(html).toContain('غير ملزم');
  });

  it('strips bidi marks and escapes HTML', () => {
    const dirty: QuotationHtmlData = {
      ...baseData,
      customer: { name: 'A\u202E<script>B' },
    };
    const html = renderQuotationHtml(dirty);
    expect(html).not.toContain('\u202E');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('omits optional sections when missing', () => {
    const minimal: QuotationHtmlData = {
      quotationNumber: 'Q-1',
      issueDate: '2026-05-25',
      company: { name: 'X' },
      customer: { name: 'Y' },
      items: [{ description: 'a', quantity: 1, unitPrice: 1 }],
    };
    const html = renderQuotationHtml(minimal);
    expect(html).not.toContain('صالح حتى');
    expect(html).not.toContain('شروط الدفع');
    expect(html).not.toContain('ملاحظات');
  });

  it('exposes a non-empty CSS overlay', () => {
    expect(QUOTATION_HTML_CSS).toMatch(/\.quotation/);
    expect(QUOTATION_HTML_CSS).toMatch(/table\.items/);
  });
});
