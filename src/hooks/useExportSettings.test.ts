import { describe, it, expect, beforeEach } from 'vitest';
import {
  readExportSettings,
  writeExportSettings,
  resetExportSettings,
  EXPORT_DEFAULTS,
} from './useExportSettings';

describe('useExportSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    expect(readExportSettings()).toEqual(EXPORT_DEFAULTS);
  });

  it('persists and rereads each field', () => {
    writeExportSettings({
      pdfEngine: 'on',
      pdfFont: 'amiri',
      defaultFormat: 'csv',
      csvDelimiter: ';',
      includeBom: false,
      language: 'en',
    });
    expect(readExportSettings()).toEqual({
      pdfEngine: 'on',
      pdfFont: 'amiri',
      defaultFormat: 'csv',
      csvDelimiter: ';',
      includeBom: false,
      language: 'en',
    });
  });

  it('maps pdfEngine "auto" by removing the key (legacy compat)', () => {
    writeExportSettings({ pdfEngine: 'off' });
    expect(window.localStorage.getItem('pdf_engine_v2')).toBe('0');
    writeExportSettings({ pdfEngine: 'auto' });
    expect(window.localStorage.getItem('pdf_engine_v2')).toBeNull();
  });

  it('resetExportSettings clears all keys', () => {
    writeExportSettings({ pdfFont: 'amiri', includeBom: false, language: 'en' });
    resetExportSettings();
    expect(readExportSettings()).toEqual(EXPORT_DEFAULTS);
  });

  it('rejects invalid stored values and falls back to defaults', () => {
    window.localStorage.setItem('export_default_format', 'docx');
    window.localStorage.setItem('export_csv_delimiter', '|');
    window.localStorage.setItem('export_language', 'fr');
    const s = readExportSettings();
    expect(s.defaultFormat).toBe('xlsx');
    expect(s.csvDelimiter).toBe(',');
    expect(s.language).toBe('ar');
  });

  it('dispatches export-settings-changed event on write', () => {
    let fired = 0;
    const h = () => fired++;
    window.addEventListener('export-settings-changed', h);
    writeExportSettings({ language: 'en' });
    window.removeEventListener('export-settings-changed', h);
    expect(fired).toBe(1);
  });
});
