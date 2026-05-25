/**
 * Pure HTML template for Arabic statements of account (كشف حساب).
 * Transactional log with running balance, opening + closing balances,
 * aging buckets, and totals. Used for both customer and supplier statements.
 */

export type StatementTxnType = 'invoice' | 'payment' | 'credit_note' | 'debit_note' | 'opening';

export interface StatementTransaction {
  date: string;
  reference: string;
  type: StatementTxnType;
  description?: string;
  debit?: number;
  credit?: number;
}

export interface StatementAgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90Plus: number;
}

export interface StatementHtmlData {
  statementNumber: string;
  issueDate: string;
  periodFrom: string;
  periodTo: string;
  company: {
    name: string;
    address?: string;
    taxNumber?: string;
    phone?: string;
    logoUrl?: string;
  };
  party: {
    kind: 'customer' | 'supplier';
    name: string;
    address?: string;
    taxNumber?: string;
    accountCode?: string;
  };
  openingBalance: number;
  transactions: StatementTransaction[];
  aging?: StatementAgingBuckets;
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

const TYPE_LABEL: Record<StatementTxnType, string> = {
  invoice: 'فاتورة',
  payment: 'سداد',
  credit_note: 'إشعار دائن',
  debit_note: 'إشعار مدين',
  opening: 'رصيد افتتاحي',
};

export interface StatementTotals {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  rows: Array<StatementTransaction & { balance: number }>;
}

export function computeStatementTotals(data: StatementHtmlData): StatementTotals {
  let balance = r2(data.openingBalance ?? 0);
  let totalDebit = 0;
  let totalCredit = 0;
  const rows = data.transactions.map((t) => {
    const debit = r2(t.debit ?? 0);
    const credit = r2(t.credit ?? 0);
    totalDebit = r2(totalDebit + debit);
    totalCredit = r2(totalCredit + credit);
    balance = r2(balance + debit - credit);
    return { ...t, balance };
  });
  return {
    totalDebit,
    totalCredit,
    closingBalance: balance,
    rows,
  };
}

export function renderStatementHtml(data: StatementHtmlData): string {
  const totals = computeStatementTotals(data);
  const currency = esc(data.currency ?? 'EGP');
  const partyLabel = data.party.kind === 'customer' ? 'العميل' : 'المورد';

  const txnRows = totals.rows
    .map(
      (t) => `
      <tr>
        <td class="num">${esc(t.date)}</td>
        <td>${esc(TYPE_LABEL[t.type] ?? t.type)}</td>
        <td><span class="num">${esc(t.reference)}</span>${t.description ? `<div class="desc">${esc(t.description)}</div>` : ''}</td>
        <td class="num">${t.debit ? fmtNum(t.debit) : '—'}</td>
        <td class="num">${t.credit ? fmtNum(t.credit) : '—'}</td>
        <td class="num bal">${fmtNum(t.balance)}</td>
      </tr>`,
    )
    .join('');

  const aging = data.aging;
  const agingBlock = aging
    ? `
  <table class="aging">
    <thead>
      <tr>
        <th>جارٍ</th>
        <th>1-30 يوم</th>
        <th>31-60 يوم</th>
        <th>61-90 يوم</th>
        <th>+90 يوم</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="num">${fmtNum(aging.current)}</td>
        <td class="num">${fmtNum(aging.d1_30)}</td>
        <td class="num">${fmtNum(aging.d31_60)}</td>
        <td class="num">${fmtNum(aging.d61_90)}</td>
        <td class="num">${fmtNum(aging.d90Plus)}</td>
      </tr>
    </tbody>
  </table>`
    : '';

  return `
<section class="statement">
  <header class="st-head">
    <div class="company">
      ${data.company.logoUrl ? `<img class="logo" src="${esc(data.company.logoUrl)}" alt="" />` : ''}
      <h1>${esc(data.company.name)}</h1>
      ${data.company.address ? `<div>${esc(data.company.address)}</div>` : ''}
      ${data.company.taxNumber ? `<div>الرقم الضريبي: <span class="num">${esc(data.company.taxNumber)}</span></div>` : ''}
      ${data.company.phone ? `<div>هاتف: <span class="num">${esc(data.company.phone)}</span></div>` : ''}
    </div>
    <div class="meta">
      <h2>كشف حساب ${partyLabel}</h2>
      <div>رقم الكشف: <span class="num">${esc(data.statementNumber)}</span></div>
      <div>تاريخ الإصدار: <span class="num">${esc(data.issueDate)}</span></div>
      <div>الفترة: من <span class="num">${esc(data.periodFrom)}</span> إلى <span class="num">${esc(data.periodTo)}</span></div>
    </div>
  </header>

  <section class="party">
    <h3>بيانات ${partyLabel}</h3>
    <div><strong>${esc(data.party.name)}</strong>${data.party.accountCode ? ` <span class="code">(${esc(data.party.accountCode)})</span>` : ''}</div>
    ${data.party.address ? `<div>${esc(data.party.address)}</div>` : ''}
    ${data.party.taxNumber ? `<div>الرقم الضريبي: <span class="num">${esc(data.party.taxNumber)}</span></div>` : ''}
  </section>

  <table class="txns" data-pdf-chunk>
    <thead>
      <tr>
        <th>التاريخ</th>
        <th>النوع</th>
        <th>المرجع</th>
        <th>مدين</th>
        <th>دائن</th>
        <th>الرصيد</th>
      </tr>
    </thead>
    <tbody>
      <tr class="opening">
        <td class="num">${esc(data.periodFrom)}</td>
        <td>${TYPE_LABEL.opening}</td>
        <td>—</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num bal">${fmtNum(data.openingBalance)}</td>
      </tr>
      ${txnRows}
    </tbody>
    <tfoot>
      <tr>
        <th colspan="3">الإجمالي</th>
        <td class="num">${fmtNum(totals.totalDebit)}</td>
        <td class="num">${fmtNum(totals.totalCredit)}</td>
        <td class="num bal">${fmtNum(totals.closingBalance)} ${currency}</td>
      </tr>
    </tfoot>
  </table>

  ${agingBlock}

  ${data.notes ? `<section class="notes"><h4>ملاحظات</h4><p>${esc(data.notes)}</p></section>` : ''}

  <footer class="closing">
    <div>الرصيد الختامي: <strong class="num">${fmtNum(totals.closingBalance)} ${currency}</strong></div>
  </footer>
</section>`;
}

import { WATERMARK_IMAGE_BASE_CSS } from './watermarkImage';

export const STATEMENT_HTML_CSS = `
.statement { padding: 4px; position: relative; }
.st-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #5a2a82; padding-bottom: 12px; margin-bottom: 16px; }
.st-head .company h1 { margin: 0 0 4px; font-size: 18px; }
.st-head .meta { text-align: left; }
.st-head .meta h2 { margin: 0 0 6px; font-size: 18px; color: #5a2a82; }
.st-head .logo { max-height: 56px; max-width: 180px; object-fit: contain; margin-bottom: 6px; }
.party { margin: 8px 0 16px; padding: 10px 12px; background: #f6f1fa; border-right: 4px solid #5a2a82; }
.party h3 { margin: 0 0 6px; font-size: 13px; }
.party .code { color: #666; font-size: 11px; }
table.txns th { background: #5a2a82; color: #fff; font-weight: 600; }
table.txns td.bal { font-weight: 600; background: #f0e6f7; }
table.txns tr.opening td { background: #faf6fd; font-style: italic; }
table.txns tfoot th, table.txns tfoot td { background: #5a2a82; color: #fff; font-weight: 700; }
table.txns .desc { font-size: 10px; color: #666; margin-top: 2px; }
table.aging { width: 100%; margin-top: 16px; }
table.aging th { background: #efe5f8; color: #5a2a82; font-weight: 600; }
.notes { margin-top: 14px; padding: 10px; border: 1px dashed #c0a3d8; }
.notes h4 { margin: 0 0 6px; font-size: 13px; }
.closing { margin-top: 18px; text-align: left; font-size: 13px; padding: 10px; background: #f0e6f7; border-right: 4px solid #5a2a82; }
${WATERMARK_IMAGE_BASE_CSS}
.statement > * { position: relative; z-index: 1; }
`;

export { buildWatermarkImageCss, withWatermarkImage } from './watermarkImage';
