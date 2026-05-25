import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  getCachedFont,
  putCachedFont,
  deleteCachedFont,
  clearFontDiskCache,
} from './fontCache';

describe('fontCache', () => {
  beforeEach(async () => {
    await clearFontDiskCache();
  });

  it('returns null when miss', async () => {
    expect(await getCachedFont('cairo')).toBeNull();
  });

  it('persists and reads a font', async () => {
    await putCachedFont('cairo', 'AAAA');
    expect(await getCachedFont('cairo')).toBe('AAAA');
  });

  it('deletes a font', async () => {
    await putCachedFont('amiri', 'BBBB');
    await deleteCachedFont('amiri');
    expect(await getCachedFont('amiri')).toBeNull();
  });

  it('ignores empty base64', async () => {
    await putCachedFont('cairo', '');
    expect(await getCachedFont('cairo')).toBeNull();
  });

  it('clears all entries', async () => {
    await putCachedFont('cairo', 'X');
    await putCachedFont('amiri', 'Y');
    await clearFontDiskCache();
    expect(await getCachedFont('cairo')).toBeNull();
    expect(await getCachedFont('amiri')).toBeNull();
  });
});
