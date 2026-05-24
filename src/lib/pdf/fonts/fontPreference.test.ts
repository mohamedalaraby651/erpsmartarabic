import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPdfFontPreference,
  setPdfFontPreference,
  clearPdfFontPreference,
  DEFAULT_PDF_FONT,
  PDF_FONT_STORAGE_KEY,
} from './fontPreference';

const ls = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

describe('fontPreference', () => {
  beforeEach(() => {
    ls.getItem.mockReset(); ls.getItem.mockReturnValue(null);
    ls.setItem.mockReset();
    ls.removeItem.mockReset();
  });

  it('defaults to Cairo when nothing is stored', () => {
    expect(DEFAULT_PDF_FONT).toBe('cairo');
    expect(getPdfFontPreference()).toBe('cairo');
  });

  it('reads a stored, valid preference (case-insensitive)', () => {
    ls.getItem.mockReturnValue('AMIRI');
    expect(getPdfFontPreference()).toBe('amiri');
  });

  it('ignores an invalid stored preference and falls back to Cairo', () => {
    ls.getItem.mockReturnValue('comic-sans');
    expect(getPdfFontPreference()).toBe('cairo');
  });

  it('setPdfFontPreference persists valid keys only', () => {
    setPdfFontPreference('amiri');
    expect(ls.setItem).toHaveBeenCalledWith(PDF_FONT_STORAGE_KEY, 'amiri');
    setPdfFontPreference('comic' as never);
    expect(ls.setItem).toHaveBeenCalledTimes(1);
  });

  it('clearPdfFontPreference removes the entry', () => {
    clearPdfFontPreference();
    expect(ls.removeItem).toHaveBeenCalledWith(PDF_FONT_STORAGE_KEY);
  });
});
