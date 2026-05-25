/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { applyOverflowGuard } from './overflowGuard';

function makeCell(scroll: number, client: number): HTMLElement {
  const td = document.createElement('td');
  // jsdom doesn't compute layout — stub the geometry props directly.
  Object.defineProperty(td, 'scrollWidth', { configurable: true, value: scroll });
  Object.defineProperty(td, 'clientWidth', { configurable: true, value: client });
  Object.defineProperty(td, 'scrollHeight', { configurable: true, value: 10 });
  Object.defineProperty(td, 'clientHeight', { configurable: true, value: 10 });
  return td;
}

describe('applyOverflowGuard', () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement('table');
    document.body.appendChild(root);
  });

  it('counts inspected cells', () => {
    root.appendChild(makeCell(50, 100));
    root.appendChild(makeCell(50, 100));
    const r = applyOverflowGuard(root);
    expect(r.inspected).toBe(2);
    expect(r.shrunk).toBe(0);
    expect(r.wrapped).toBe(0);
  });

  it('falls back to word-break when shrink steps fail', () => {
    const cell = makeCell(300, 100);
    root.appendChild(cell);
    // No step will fix it; isOverflowing keeps returning true.
    const r = applyOverflowGuard(root);
    expect(r.wrapped).toBe(1);
    expect(cell.style.wordBreak).toBe('break-word');
  });

  it('skips already-fitting cells', () => {
    root.appendChild(makeCell(50, 100));
    const r = applyOverflowGuard(root);
    expect(r.shrunk).toBe(0);
  });
});
