import { describe, it, expect } from 'vitest';
import { sanitizeFilename, buildDocFilename } from './filename';

describe('sanitizeFilename', () => {
  it('preserves Arabic letters and digits', () => {
    expect(sanitizeFilename('فاتورة-2025-001')).toBe('فاتورة-2025-001.pdf');
  });

  it('strips path separators and OS-illegal chars', () => {
    expect(sanitizeFilename('../../etc/passwd?<>|"')).toBe('etc_passwd.pdf');
  });

  it('strips Bidi marks and control chars', () => {
    expect(sanitizeFilename('inv\u200E\u200F\u0007_001')).toBe('inv_001.pdf');
  });

  it('collapses whitespace + repeated underscores', () => {
    expect(sanitizeFilename('hello   world___test')).toBe('hello_world_test.pdf');
  });

  it('falls back when input is empty after sanitization', () => {
    expect(sanitizeFilename('   /// ', { fallback: 'doc' })).toBe('doc.pdf');
  });

  it('honors custom extension', () => {
    expect(sanitizeFilename('report', { extension: 'csv' })).toBe('report.csv');
  });

  it('respects maxBaseLength', () => {
    const long = 'a'.repeat(300);
    const out = sanitizeFilename(long, { maxBaseLength: 50 });
    expect(out).toBe(`${'a'.repeat(50)}.pdf`);
  });
});

describe('buildDocFilename', () => {
  it('combines prefix and number safely', () => {
    expect(buildDocFilename('invoice', 'INV-001')).toBe('invoice_INV-001.pdf');
  });
  it('handles Arabic prefixes', () => {
    expect(buildDocFilename('فاتورة', 42)).toBe('فاتورة_42.pdf');
  });
  it('falls back on null number', () => {
    expect(buildDocFilename('invoice', null)).toBe('invoice_NA.pdf');
  });
});
