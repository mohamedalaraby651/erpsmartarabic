/**
 * Pure HTML template for Arabic purchase orders (أمر شراء).
 * Buyer-facing document: header with supplier block, requested delivery date,
 * shipping address, payment terms, and authorisation stamp area.
 * String in / string out — no DOM access, runs in tests.
 */

export interface PurchaseOrderLine {
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface PurchaseOrderHtmlData {
  orderNumber: string;
  issueDate: string;
  expectedDeliveryDate?: string;
  buyer: {
    name: string;
    address?: string;
    taxNumber?: string;
    phone?: string;
    logoUrl?: string;
  };
  supplier: {
    name: string;
    address?: string;
    taxNumber?: string;
    contact?: string;
  };
  shippingAddress?: string;
  items: PurchaseOrderLine[];
  taxRate?: number;
  discountRate?: number;
  currency?: string;
  paymentTerms?: string;
  notes?: string;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
}

function r2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function fmtNum(n: number): string {
  return r2(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface PurchaseOrderTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export function computePurchaseOrderTotals(
  data: PurchaseOrderHtmlData,
): PurchaseOrderTotals {
  const subtotal = r2(
    data.items.reduce(
      (sum, it) => sum + (it.total ?? it.quantity * it.unitPrice),
      0,
    ),
  );
  const discount = r2(subtotal * (data.discountRate ?? 0));
  const taxable = r2(subtotal - discount);
  const tax = r2(taxable * (data.taxRate ?? 0));
  const total = r2(taxable + tax);
  return { subtotal, discount, taxable, tax, total };
}

export function renderPurchaseOrderHtml(data: PurchaseOrderHtmlData): string {
  const totals = computePurchaseOrderTotals(data);
  const currency = esc(data.currency ?? 'EGP');

  const rows = data.items
    .map((it, i) => {
      const total = r2(it.total ?? it.quantity * it.unitPrice);
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(it.description)}${it.sku ? `<div class="sku">SKU: <span class="num">${esc(it.sku)}</span></div>` : ''}</td>
        <td class="num">${fmtNum(it.quantity)}</td>
        <td class="num">${fmtNum(it.unitPrice)}</td>
        <td class="num">${fmtNum(total)}</td>
      </tr>`;
    })
    .join('');

  return `
<section class="purchase-order">
  <header class="po-head">
    <div class="buyer">
      ${data.buyer.logoUrl ? `<img class="logo" src="${esc(data.buyer.logoUrl)}" alt="" />` : ''}
      <h1>${esc(data.buyer.name)}</h1>
      ${data.buyer.address ? `<div>${esc(data.buyer.address)}</div>` : ''}
      ${data.buyer.taxNumber ? `<div>الرقم الضريبي: <span class="num">${esc(data.buyer.taxNumber)}</span></div>` : ''}
      ${data.buyer.phone ? `<div>هاتف: <span class="num">${esc(data.buyer.phone)}</span></div>` : ''}
    </div>
    <div class="meta">
      <h2>أمر شراء</h2>
      <div>رقم الأمر: <span class="num">${esc(data.orderNumber)}</span></div>
      <div>تاريخ الإصدار: <span class="num">${esc(data.issueDate)}</span></div>
      ${data.expectedDeliveryDate ? `<div>تاريخ التسليم المتوقع: <span class="num">${esc(data.expectedDeliveryDate)}</span></div>` : ''}
    </div>
  </header>

  <section class="parties">
    <div class="party supplier">
      <h3>المورد</h3>
      <div><strong>${esc(data.supplier.name)}</strong></div>
      ${data.supplier.address ? `<div>${esc(data.supplier.address)}</div>` : ''}
      ${data.supplier.taxNumber ? `<div>الرقم الضريبي: <span class="num">${esc(data.supplier.taxNumber)}</span></div>` : ''}
      ${data.supplier.contact ? `<div>المسؤول: ${esc(data.supplier.contact)}</div>` : ''}
    </div>
    ${data.shippingAddress ? `<div class="party shipping"><h3>عنوان التسليم</h3><div>${esc(data.shippingAddress)}</div></div>` : ''}
  </section>

  <table class="items">
    <thead>
      <tr>
        <th>#</th>
        <th>الصنف</th>
        <th>الكمية</th>
        <th>سعر الوحدة</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    <tbody>
      <tr><th>المجموع الفرعي</th><td class="num">${fmtNum(totals.subtotal)} ${currency}</td></tr>
      <tr><th>الخصم</th><td class="num">${fmtNum(totals.discount)} ${currency}</td></tr>
      <tr><th>الوعاء الخاضع</th><td class="num">${fmtNum(totals.taxable)} ${currency}</td></tr>
      <tr><th>الضريبة</th><td class="num">${fmtNum(totals.tax)} ${currency}</td></tr>
      <tr class="grand"><th>الإجمالي</th><td class="num">${fmtNum(totals.total)} ${currency}</td></tr>
    </tbody>
  </table>

  ${data.paymentTerms ? `<section class="terms"><h4>شروط الدفع</h4><p>${esc(data.paymentTerms)}</p></section>` : ''}
  ${data.notes ? `<section class="notes"><h4>ملاحظات</h4><p>${esc(data.notes)}</p></section>` : ''}

  <footer class="signatures">
    <div class="sig"><div class="line"></div><div>المُعِدّ</div></div>
    <div class="sig"><div class="line"></div><div>المُراجع</div></div>
    <div class="sig"><div class="line"></div><div>المُعتمِد</div></div>
  </footer>
</section>`;
}

export const PURCHASE_ORDER_HTML_CSS = `
.purchase-order { padding: 4px; }
.po-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1f5e3a; padding-bottom: 12px; margin-bottom: 16px; }
.po-head .buyer h1 { margin: 0 0 4px; font-size: 18px; }
.po-head .meta { text-align: left; }
.po-head .meta h2 { margin: 0 0 6px; font-size: 20px; letter-spacing: 1px; color: #1f5e3a; }
.po-head .logo { max-height: 56px; margin-bottom: 6px; }
.parties { display: flex; gap: 12px; margin: 8px 0 16px; }
.parties .party { flex: 1; padding: 10px 12px; background: #f2f8f3; border-right: 4px solid #1f5e3a; }
.parties .party h3 { margin: 0 0 6px; font-size: 13px; }
.sku { font-size: 10px; color: #666; margin-top: 2px; }
table.items th { background: #1f5e3a; color: #fff; font-weight: 600; }
table.items td { background: #fff; }
table.totals { width: 50%; margin-right: auto; margin-top: 12px; }
table.totals th { background: #eaf3ec; text-align: right; }
table.totals tr.grand th, table.totals tr.grand td { background: #1f5e3a; color: #fff; font-weight: 700; }
.terms, .notes { margin-top: 14px; padding: 10px; border: 1px dashed #99c2a7; }
.terms h4, .notes h4 { margin: 0 0 6px; font-size: 13px; }
.signatures { display: flex; justify-content: space-around; margin-top: 32px; gap: 16px; }
.signatures .sig { text-align: center; flex: 1; font-size: 11px; color: #444; }
.signatures .sig .line { border-top: 1px solid #888; margin-bottom: 6px; height: 40px; }
`;
