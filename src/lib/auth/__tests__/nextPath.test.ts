import { describe, it, expect } from 'vitest';
import { sanitizeNextPath } from '../nextPath';

describe('sanitizeNextPath', () => {
  it('keeps internal paths with query', () => {
    expect(sanitizeNextPath('/invoices?status=paid')).toBe('/invoices?status=paid');
  });
  it.each([null, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '/ evil', '/auth', '/auth?next=/x', '/'])(
    'rejects %s',
    (v) => { expect(sanitizeNextPath(v)).toBe('/dashboard'); },
  );
});
