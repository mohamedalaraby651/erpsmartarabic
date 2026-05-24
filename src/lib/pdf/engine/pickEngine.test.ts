import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pickEngine, isHtmlEngineEnabledFor } from './pickEngine';

describe('pickEngine', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('defaults to jspdf when no flags are set', () => {
    expect(pickEngine({ docType: 'invoice' }).id).toBe('jspdf');
    expect(isHtmlEngineEnabledFor('invoice')).toBe(false);
  });

  it('explicit prefer wins over flags', () => {
    localStorage.setItem('pdf_engine_html', '1');
    expect(pickEngine({ docType: 'invoice', prefer: 'jspdf' }).id).toBe('jspdf');
    expect(pickEngine({ docType: 'invoice', prefer: 'html2pdf' }).id).toBe('html2pdf');
  });

  it('global localStorage flag enables html engine', () => {
    localStorage.setItem('pdf_engine_html', '1');
    expect(pickEngine({ docType: 'invoice' }).id).toBe('html2pdf');
  });

  it('per-docType csv list is honored case-insensitively', () => {
    localStorage.setItem('pdf_engine_html_types', 'Quotation, Invoice');
    expect(pickEngine({ docType: 'invoice' }).id).toBe('html2pdf');
    expect(pickEngine({ docType: 'quotation' }).id).toBe('html2pdf');
    expect(pickEngine({ docType: 'sales_order' }).id).toBe('jspdf');
  });

  it('blank csv does not enable anything', () => {
    localStorage.setItem('pdf_engine_html_types', '   ,  ,');
    expect(pickEngine({ docType: 'invoice' }).id).toBe('jspdf');
  });
});
