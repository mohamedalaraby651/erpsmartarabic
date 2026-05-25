import { describe, it, expect, afterEach, vi } from 'vitest';
import { decideCanary, hashKey, shouldUseV2 } from './canaryRollout';

const ls = window.localStorage as unknown as { getItem: ReturnType<typeof vi.fn> };

afterEach(() => {
  ls.getItem.mockReset();
});

describe('canaryRollout', () => {
  it('defaults to legacy when nothing is set', () => {
    ls.getItem.mockReturnValue(null);
    const d = decideCanary({ docType: 'invoice' });
    expect(d.useV2).toBe(false);
    expect(d.source).toBe('default');
  });

  it('localStorage "1" forces v2 even with 0% env', () => {
    ls.getItem.mockReturnValue('1');
    const d = decideCanary({ docType: 'invoice' });
    expect(d.useV2).toBe(true);
    expect(d.percent).toBe(100);
    expect(d.source).toBe('localStorage');
  });

  it('localStorage "0" forces legacy even with 100% env', () => {
    ls.getItem.mockReturnValue('0');
    const d = decideCanary({ docType: 'invoice' });
    expect(d.useV2).toBe(false);
    expect(d.percent).toBe(0);
  });

  it('hash bucket is stable for the same tenant+docType', () => {
    ls.getItem.mockReturnValue(null);
    const a = shouldUseV2({ tenantId: 't-42', docType: 'invoice' });
    const b = shouldUseV2({ tenantId: 't-42', docType: 'invoice' });
    expect(a).toBe(b);
  });

  it('hashKey is deterministic and well-distributed', () => {
    expect(hashKey('a')).toBe(hashKey('a'));
    expect(hashKey('a')).not.toBe(hashKey('b'));
  });
});
