import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pickEngine, isHtmlEngineEnabledFor } from './pickEngine';

const getItem = window.localStorage.getItem as ReturnType<typeof vi.fn>;

function stubLs(map: Record<string, string>) {
  getItem.mockImplementation((k: string) => (k in map ? map[k] : null));
}

describe('pickEngine', () => {
  beforeEach(() => {
    getItem.mockReset();
    getItem.mockReturnValue(null);
  });

  it('defaults to jspdf when no flags are set', () => {
    expect(pickEngine({ docType: 'invoice' }).id).toBe('jspdf');
    expect(isHtmlEngineEnabledFor('invoice')).toBe(false);
  });

  it('explicit prefer wins over flags', () => {
    stubLs({ pdf_engine_html: '1' });
    expect(pickEngine({ docType: 'invoice', prefer: 'jspdf' }).id).toBe('jspdf');
    expect(pickEngine({ docType: 'invoice', prefer: 'html2pdf' }).id).toBe('html2pdf');
  });

  it('global localStorage flag enables html engine', () => {
    stubLs({ pdf_engine_html: '1' });
    expect(pickEngine({ docType: 'invoice' }).id).toBe('html2pdf');
  });

  it('per-docType csv list is honored case-insensitively', () => {
    stubLs({ pdf_engine_html_types: 'Quotation, Invoice' });
    expect(pickEngine({ docType: 'invoice' }).id).toBe('html2pdf');
    expect(pickEngine({ docType: 'quotation' }).id).toBe('html2pdf');
    expect(pickEngine({ docType: 'sales_order' }).id).toBe('jspdf');
  });

  it('blank csv does not enable anything', () => {
    stubLs({ pdf_engine_html_types: '   ,  ,' });
    expect(pickEngine({ docType: 'invoice' }).id).toBe('jspdf');
  });
});
