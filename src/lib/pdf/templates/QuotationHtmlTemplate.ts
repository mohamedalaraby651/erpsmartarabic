/**
 * Pure HTML template for Arabic quotations (عروض الأسعار).
 * Mirrors InvoiceHtmlTemplate structure but adds: quote number,
 * validity period, payment terms, and an explicit "غير ملزم قبل القبول" stamp.
 * No DOM, no fetch — string in / string out so it runs in tests too.
 */

export interface QuotationLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface QuotationHtmlData {
  quotationNumber: string;
  issueDate: string;
  validUntil?: string;
  company: {
    name: string;
    address?: string;
    taxNumber?: string;
    phone?: string;
    logoUrl?: string;
  };
  customer: {
    name: string;
    address?: string;
    taxNumber?: string;
  };
  items: QuotationLine[];
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

export interface QuotationTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export function computeQuotationTotals(data: QuotationHtmlData): QuotationTotals {
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

export function renderQuotationHtml(data: QuotationHtmlData): string {
  const totals = computeQuotationTotals(data);
  const currency = esc(data.currency ?? 'EGP');

  const rows = data.items
    .map((it, i) => {
      const total = r2(it.total ?? it.quantity * it.unitPrice);
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(it.description)}</td>
        <td class="num">${fmtNum(it.quantity)}</td>
        <td class="num">${fmtNum(it.unitPrice)}</td>
        <td class="num">${fmtNum(total)}</td>
      </tr>`;
    })
    .join('');

  return `
<section class="quotation">
  <header class="quote-head">
    <div class="company">
      ${data.company.logoUrl ? `<img class="logo" src="${esc(data.company.logoUrl)}" alt="" />` : ''}
      <h1>${esc(data.company.name)}</h1>
      ${data.company.address ? `<div>${esc(data.company.address)}</div>` : ''}
      ${data.company.taxNumber ? `<div>الرقم الضريبي: <span class="num">${esc(data.company.taxNumber)}</span></div>` : ''}
      ${data.company.phone ? `<div>هاتف: <span class="num">${esc(data.company.phone)}</span></div>` : ''}
    </div>
    <div class="meta">
      <h2>عرض سعر</h2>
      <div>رقم العرض: <span class="num">${esc(data.quotationNumber)}</span></div>
      <div>تاريخ الإصدار: <span class="num">${esc(data.issueDate)}</span></div>
      ${data.validUntil ? `<div>صالح حتى: <span class="num">${esc(data.validUntil)}</span></div>` : ''}
    </div>
  </header>

  <section class="customer">
    <h3>بيانات العميل</h3>
    <div><strong>${esc(data.customer.name)}</strong></div>
    ${data.customer.address ? `<div>${esc(data.customer.address)}</div>` : ''}
    ${data.customer.taxNumber ? `<div>الرقم الضريبي: <span class="num">${esc(data.customer.taxNumber)}</span></div>` : ''}
  </section>

  <table class="items" data-pdf-chunk>
    <thead>
      <tr>
        <th>#</th>
        <th>الوصف</th>
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
      <tr class="grand"><th>الإجمالي التقديري</th><td class="num">${fmtNum(totals.total)} ${currency}</td></tr>
    </tbody>
  </table>

  ${data.paymentTerms ? `<section class="terms"><h4>شروط الدفع</h4><p>${esc(data.paymentTerms)}</p></section>` : ''}
  ${data.notes ? `<section class="notes"><h4>ملاحظات</h4><p>${esc(data.notes)}</p></section>` : ''}

  <footer class="stamp">
    <p>هذا العرض غير ملزم قبل القبول الرسمي من العميل.</p>
  </footer>
</section>`;
}

import { WATERMARK_IMAGE_BASE_CSS } from './watermarkImage';

export const QUOTATION_HTML_CSS = `
.quotation { padding: 4px; position: relative; }
.quote-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d4f8b; padding-bottom: 12px; margin-bottom: 16px; }
.quote-head .company h1 { margin: 0 0 4px; font-size: 18px; }
.quote-head .meta { text-align: left; }
.quote-head .meta h2 { margin: 0 0 6px; font-size: 20px; letter-spacing: 1px; color: #0d4f8b; }
.quote-head .logo { max-height: 56px; max-width: 180px; object-fit: contain; margin-bottom: 6px; }
.customer { margin: 8px 0 16px; padding: 10px 12px; background: #f3f7fb; border-right: 4px solid #0d4f8b; }
.customer h3 { margin: 0 0 6px; font-size: 13px; }
table.items th { background: #0d4f8b; color: #ffffff; font-weight: 600; }
table.items td { background: #ffffff; }
table.totals { width: 50%; margin-right: auto; margin-top: 12px; }
table.totals th { background: #eaf1f8; text-align: right; }
table.totals tr.grand th, table.totals tr.grand td { background: #0d4f8b; color: #ffffff; font-weight: 700; }
.terms, .notes { margin-top: 14px; padding: 10px; border: 1px dashed #99b6d1; }
.terms h4, .notes h4 { margin: 0 0 6px; font-size: 13px; }
.stamp { margin-top: 18px; text-align: center; font-size: 11px; color: #555; border-top: 1px solid #ddd; padding-top: 8px; }
${WATERMARK_IMAGE_BASE_CSS}
.quotation > * { position: relative; z-index: 1; }
`;

export { buildWatermarkImageCss, withWatermarkImage } from './watermarkImage';
