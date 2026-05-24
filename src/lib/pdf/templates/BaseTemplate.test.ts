import { describe, it, expect, vi } from 'vitest';
import {
  drawPageNumber,
  drawWatermark,
  drawHeaderRule,
  applyPageChrome,
} from './BaseTemplate';
import { DEFAULT_PAGE_CONFIG } from '../config/PageConfig';
import { DEFAULT_THEME } from '../config/ThemeConfig';

function makeFakeDoc() {
  return {
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    saveGraphicsState: vi.fn(),
    restoreGraphicsState: vi.fn(),
    setGState: vi.fn(),
    GState: vi.fn(),
  };
}

describe('BaseTemplate.drawPageNumber', () => {
  it('draws the formatted page label when enabled', () => {
    const doc = makeFakeDoc();
    drawPageNumber({
      doc: doc as never,
      page: DEFAULT_PAGE_CONFIG,
      theme: DEFAULT_THEME,
      currentPage: 2,
      totalPages: 5,
    });
    expect(doc.text).toHaveBeenCalledTimes(1);
    const [label] = doc.text.mock.calls[0];
    expect(label).toContain('2');
    expect(label).toContain('5');
  });

  it('respects showPageNumbers=false', () => {
    const doc = makeFakeDoc();
    drawPageNumber({
      doc: doc as never,
      page: DEFAULT_PAGE_CONFIG,
      theme: { ...DEFAULT_THEME, showPageNumbers: false },
      currentPage: 1,
      totalPages: 1,
    });
    expect(doc.text).not.toHaveBeenCalled();
  });
});

describe('BaseTemplate.drawWatermark', () => {
  it('is a no-op when watermark is unset', () => {
    const doc = makeFakeDoc();
    drawWatermark({
      doc: doc as never,
      page: DEFAULT_PAGE_CONFIG,
      currentPage: 1,
      totalPages: 1,
    });
    expect(doc.text).not.toHaveBeenCalled();
  });

  it('draws when a watermark is configured', () => {
    const doc = makeFakeDoc();
    drawWatermark({
      doc: doc as never,
      page: DEFAULT_PAGE_CONFIG,
      theme: { ...DEFAULT_THEME, watermark: { text: 'مسودة', opacity: 0.1 } },
      currentPage: 1,
      totalPages: 1,
    });
    expect(doc.text).toHaveBeenCalledTimes(1);
    expect(doc.saveGraphicsState).toHaveBeenCalled();
    expect(doc.restoreGraphicsState).toHaveBeenCalled();
  });
});

describe('BaseTemplate.drawHeaderRule', () => {
  it('draws a single line at the top margin', () => {
    const doc = makeFakeDoc();
    drawHeaderRule({
      doc: doc as never,
      page: DEFAULT_PAGE_CONFIG,
      currentPage: 1,
      totalPages: 1,
    });
    expect(doc.line).toHaveBeenCalledTimes(1);
  });
});

describe('BaseTemplate.applyPageChrome', () => {
  it('invokes rule + page number', () => {
    const doc = makeFakeDoc();
    applyPageChrome({
      doc: doc as never,
      page: DEFAULT_PAGE_CONFIG,
      currentPage: 1,
      totalPages: 3,
    });
    expect(doc.line).toHaveBeenCalled();
    expect(doc.text).toHaveBeenCalled(); // page number
  });
});
