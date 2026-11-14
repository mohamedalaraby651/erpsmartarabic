import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateStatementPdf } from './statementPdfGenerator';
const mocks = vi.hoisted(() => ({ doc: {} as Record<string, any>, table: vi.fn() }));
vi.mock('jspdf', () => ({ default: class { constructor() { return mocks.doc; } } }));
vi.mock('jspdf-autotable', () => ({ default: mocks.table }));
vi.mock('./pdfGenerator', () => ({ getCompanySettings: async () => null }));
vi.mock('./arabicFont', () => ({ loadArabicFont: async () => null, ARABIC_FONT_NAME: 'font', reshapeArabicText: (value: string) => value, toVisualOrder: (value: string) => value, sanitizeBidiText: (value: string) => value, loadImageAsBase64: async () => null }));
describe('statement PDF ledger and final pagination', () => {
  beforeEach(() => {
    mocks.doc = { internal: { pageSize: { width: 297, height: 210 } }, lastAutoTable: { finalY: 180 }, getNumberOfPages: () => 2 };
    for (const method of ['setFont', 'setFontSize', 'setTextColor', 'text', 'setDrawColor', 'setLineWidth', 'line', 'setFillColor', 'roundedRect', 'addPage', 'setPage', 'save']) mocks.doc[method] = vi.fn();
    mocks.table.mockClear();
  });
  it('preserves a signed running balance and prints current user on every final page', async () => {
    await generateStatementPdf({ partyType: 'customer', partyName: 'عميل', printedBy: 'المحاسب', openingBalance: -500, entries: [{ entry_date: '2026-11-14', entry_type: 'سند', reference: 'PAY', debit: 0, credit: 100, running_balance: -600 }] });
    expect(mocks.table.mock.calls[0][1].body[1][5]).toBe('-600.00');
    expect(mocks.doc.text.mock.calls.filter((call: unknown[]) => call[0] === 'المحاسب')).toHaveLength(2);
    expect(mocks.doc.setPage.mock.calls).toEqual([[1], [2]]);
  });
});