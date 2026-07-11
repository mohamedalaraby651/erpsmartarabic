/**
 * Pure HTML template for Arabic invoices. No DOM, no fetch — just a
 * string builder consumed by HtmlPdfEngine. Numbers are wrapped with
 * class="num" so the embedded RTL stylesheet applies tabular numerals
 * and LTR direction inside RTL cells.
 */

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  /** Optional precomputed total. If absent, qty * unitPrice is used. */
  total?: number;
}

export interface InvoiceHtmlData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
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
  items: InvoiceLine[];
  /** Tax rate as decimal, e.g. 0.14 for 14%. Default 0. */
  taxRate?: number;
  /** Discount as decimal, e.g. 0.05. Default 0. */
  discountRate?: number;
  currency?: string;
  notes?: string;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    // Strip invisible bidi markers (memory: data sanitization policy).
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
}

function r2(n: number): number {
  // Financial precision standard.
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function fmtNum(n: number): string {
  return r2(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export function computeInvoiceTotals(data: InvoiceHtmlData): InvoiceTotals {
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

export function renderInvoiceHtml(data: InvoiceHtmlData): string {
  const totals = computeInvoiceTotals(data);
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
<section class="invoice">
  <header class="invoice-head">
    <div class="company">
      ${data.company.logoUrl ? `<img class="logo" src="${esc(data.company.logoUrl)}" alt="" />` : ''}
      <h1>${esc(data.company.name)}</h1>
      ${data.company.address ? `<div>${esc(data.company.address)}</div>` : ''}
      ${data.company.taxNumber ? `<div>الرقم الضريبي: <span class="num">${esc(data.company.taxNumber)}</span></div>` : ''}
      ${data.company.phone ? `<div>هاتف: <span class="num">${esc(data.company.phone)}</span></div>` : ''}
    </div>
    <div class="meta">
      <h2>فاتورة</h2>
      <div>رقم الفاتورة: <span class="num">${esc(data.invoiceNumber)}</span></div>
      <div>تاريخ الإصدار: <span class="num">${esc(data.issueDate)}</span></div>
      ${data.dueDate ? `<div>تاريخ الاستحقاق: <span class="num">${esc(data.dueDate)}</span></div>` : ''}
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
      <tr class="grand"><th>الإجمالي المستحق</th><td class="num">${fmtNum(totals.total)} ${currency}</td></tr>
    </tbody>
  </table>

  ${data.notes ? `<footer class="notes"><h4>ملاحظات</h4><p>${esc(data.notes)}</p></footer>` : ''}
</section>`;
}

import { WATERMARK_IMAGE_BASE_CSS } from './watermarkImage';

/** Style overlay layered on top of the engine's Arabic base CSS. */
export const INVOICE_HTML_CSS = `
.invoice { padding: 4px; position: relative; }
.invoice-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
.invoice-head .company h1 { margin: 0 0 4px; font-size: 18px; }
.invoice-head .meta { text-align: left; }
.invoice-head .meta h2 { margin: 0 0 6px; font-size: 20px; letter-spacing: 1px; }
.invoice-head .logo { max-height: 56px; max-width: 180px; object-fit: contain; margin-bottom: 6px; }
.customer { margin: 8px 0 16px; padding: 10px 12px; background: #f7f7f8; border-right: 4px solid #111; }
.customer h3 { margin: 0 0 6px; font-size: 13px; }
table.items th { background: #111; color: hsl(var(--background)); font-weight: 600; }
table.items td { background: hsl(var(--background)); }
table.totals { width: 50%; margin-right: auto; margin-top: 12px; }
table.totals th { background: #f1f1f2; text-align: right; }
table.totals tr.grand th, table.totals tr.grand td { background: #111; color: hsl(var(--background)); font-weight: 700; }
.notes { margin-top: 18px; padding: 10px; border: 1px dashed #bbb; }
.notes h4 { margin: 0 0 6px; font-size: 13px; }
${WATERMARK_IMAGE_BASE_CSS}
.invoice > * { position: relative; z-index: 1; }
`;

// Re-exported from shared module for backwards compatibility with existing imports.
export { buildWatermarkImageCss, withWatermarkImage } from './watermarkImage';

