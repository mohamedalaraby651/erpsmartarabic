import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceWorkbook, exportMatrix } from './workspaceExcel';
vi.mock('@/lib/pdfGeneratorLazy', () => ({ getCompanySettings: vi.fn() }));

describe('workspace export data integrity', () => {
  it('resolves related customer names and preserves selected order, zero and negatives', () => {
    expect(exportMatrix([{ customers: { name: 'عميل' }, amount: 0 }, { amount: -25 }], [{ key: 'amount', label: 'المبلغ' }, { key: 'customers.name', label: 'العميل' }])).toEqual([[0, 'عميل'], [-25, '']]);
  });
  it('produces a readable spreadsheet with embedded drawing and unchanged amounts', async () => {
    const XLSX = await import('xlsx');
    const logo = new Uint8Array([137, 80, 78, 71]);
    const bytes = await createWorkspaceWorkbook({ data: [{ amount: 125.25 }], columns: [{ key: 'amount', label: 'المبلغ' }], title: 'التحصيل', companyName: 'شركة الاختبار', logo });
    const book = XLSX.read(bytes, { type: 'array' });
    expect(book.Sheets['البيانات'].A8.v).toBe(125.25);
    const zip = XLSX.CFB.read(bytes, { type: 'buffer' });
    expect(Array.from(XLSX.CFB.find(zip, 'xl/media/company-logo.png').content)).toEqual(Array.from(logo));
  });
});