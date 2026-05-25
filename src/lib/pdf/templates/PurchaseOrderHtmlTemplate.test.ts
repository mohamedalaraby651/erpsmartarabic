import { describe, it, expect } from 'vitest';
import {
  computePurchaseOrderTotals,
  renderPurchaseOrderHtml,
  PURCHASE_ORDER_HTML_CSS,
  type PurchaseOrderHtmlData,
} from './PurchaseOrderHtmlTemplate';

const baseData: PurchaseOrderHtmlData = {
  orderNumber: 'PO-2026-001',
  issueDate: '2026-05-24',
  expectedDeliveryDate: '2026-06-01',
  buyer: { name: 'شركة المشتري', taxNumber: '300123456' },
  supplier: { name: 'شركة المورد', contact: 'أحمد علي' },
  shippingAddress: 'الرياض - حي العليا',
  items: [
    { description: 'لوحات تحكم', sku: 'CTR-1', quantity: 4, unitPrice: 250 },
    { description: 'كابلات نحاس', quantity: 10, unitPrice: 30 },
  ],
  taxRate: 0.15,
  discountRate: 0.1,
  currency: 'SAR',
  paymentTerms: 'صافي 30',
};

describe('PurchaseOrderHtmlTemplate', () => {
  it('computes subtotal, discount, tax and total with two decimals', () => {
    const t = computePurchaseOrderTotals(baseData);
    expect(t.subtotal).toBe(1300);
    expect(t.discount).toBe(130);
    expect(t.taxable).toBe(1170);
    expect(t.tax).toBe(175.5);
    expect(t.total).toBe(1345.5);
  });

  it('renders Arabic labels and SKU markup', () => {
    const html = renderPurchaseOrderHtml(baseData);
    expect(html).toContain('أمر شراء');
    expect(html).toContain('المورد');
    expect(html).toContain('PO-2026-001');
    expect(html).toContain('SKU:');
    expect(html).toContain('1,345.50 SAR');
  });

  it('escapes HTML and strips bidi markers from descriptions', () => {
    const html = renderPurchaseOrderHtml({
      ...baseData,
      items: [{ description: '<script>\u202Eevil</script>', quantity: 1, unitPrice: 1 }],
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('\u202E');
  });

  it('exports CSS with brand color', () => {
    expect(PURCHASE_ORDER_HTML_CSS).toContain('#1f5e3a');
  });
});
