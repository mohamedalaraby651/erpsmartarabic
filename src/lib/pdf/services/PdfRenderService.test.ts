import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/repositories/pdfProfilesRepository', () => ({
  pdfProfilesRepository: { findActive: vi.fn() },
}));

import {
  resolvePdfConfig,
  setProfileLoader,
  invalidatePdfRenderCache,
  _clearAllCachesForTest,
} from './PdfRenderService';
import { createDefaultProfile } from '@/domain/pdf/entities/DocumentRenderProfile';

describe('PdfRenderService', () => {
  beforeEach(() => {
    _clearAllCachesForTest();
    setProfileLoader(null); // reset
  });

  it('returns undefined when tenantId is missing', async () => {
    expect(await resolvePdfConfig(null, 'invoice')).toBeUndefined();
    expect(await resolvePdfConfig(undefined, 'invoice')).toBeUndefined();
  });

  it('returns undefined when no profile exists', async () => {
    setProfileLoader(async () => null);
    expect(await resolvePdfConfig('t1', 'invoice')).toBeUndefined();
  });

  it('returns mapped config from global profile when no scoped exists', async () => {
    const g = createDefaultProfile('global');
    g.branding.companyName = 'شركة العَلَم';
    g.layout.pageSize = 'A5';
    setProfileLoader(async (_t, scope) => (scope === 'global' ? g : null));

    const cfg = await resolvePdfConfig('t1', 'invoice');
    expect(cfg).toBeDefined();
    expect(cfg?.branding?.companyName).toBe('شركة العَلَم');
    expect((cfg?.page as { size: string } | undefined)?.size).toBe('A5');
  });

  it('merges scoped over global (scoped wins)', async () => {
    const g = createDefaultProfile('global');
    g.branding.primaryColor = '#111111';
    const s = createDefaultProfile('invoice');
    s.branding.primaryColor = '#ff0000';
    s.branding.companyName = 'Invoice-only';
    setProfileLoader(async (_t, scope) => (scope === 'global' ? g : s));

    const cfg = await resolvePdfConfig('t1', 'invoice');
    expect(cfg?.branding?.primaryColor).toBe('#ff0000');
    expect(cfg?.branding?.companyName).toBe('Invoice-only');
  });

  it('caches the second call (loader invoked once)', async () => {
    const g = createDefaultProfile('global');
    const loader = vi.fn(async () => g);
    setProfileLoader(loader);

    await resolvePdfConfig('t1', 'invoice');
    await resolvePdfConfig('t1', 'invoice');
    // 2 calls per resolve (global + scoped), expect 2 total after cache hit
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('invalidatePdfRenderCache forces a fresh fetch', async () => {
    const loader = vi.fn(async () => createDefaultProfile('global'));
    setProfileLoader(loader);

    await resolvePdfConfig('t1', 'invoice');
    invalidatePdfRenderCache('t1');
    await resolvePdfConfig('t1', 'invoice');
    expect(loader).toHaveBeenCalledTimes(4);
  });

  it('gracefully returns undefined when loader throws', async () => {
    setProfileLoader(async () => { throw new Error('db down'); });
    const cfg = await resolvePdfConfig('t1', 'invoice');
    expect(cfg).toBeUndefined();
  });
});
