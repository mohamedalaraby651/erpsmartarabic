import { describe, it, expect } from 'vitest';
import {
  PAPER_DIMENSIONS_MM,
  DEFAULT_PAGE_CONFIG,
  resolvePageSize,
} from './PageConfig';

describe('PageConfig', () => {
  it('exposes every supported paper size', () => {
    expect(Object.keys(PAPER_DIMENSIONS_MM).sort()).toEqual(
      ['A3', 'A4', 'A5', 'Legal', 'Letter'].sort(),
    );
  });

  it('returns portrait dimensions unchanged', () => {
    const dims = resolvePageSize(DEFAULT_PAGE_CONFIG);
    expect(dims).toEqual(PAPER_DIMENSIONS_MM.A4);
  });

  it('swaps width/height for landscape', () => {
    const dims = resolvePageSize({ ...DEFAULT_PAGE_CONFIG, orientation: 'landscape' });
    expect(dims.width).toBe(PAPER_DIMENSIONS_MM.A4.height);
    expect(dims.height).toBe(PAPER_DIMENSIONS_MM.A4.width);
  });

  it('A3 is larger than A4 which is larger than A5', () => {
    expect(PAPER_DIMENSIONS_MM.A3.width).toBeGreaterThan(PAPER_DIMENSIONS_MM.A4.width);
    expect(PAPER_DIMENSIONS_MM.A4.width).toBeGreaterThan(PAPER_DIMENSIONS_MM.A5.width);
  });
});
