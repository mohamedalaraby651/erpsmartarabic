import { describe, it, expect, afterEach } from 'vitest';
import { isPdfEngineV2Enabled } from './featureFlags';

afterEach(() => {
  try { localStorage.removeItem('pdf_engine_v2'); } catch { /* noop */ }
});

describe('isPdfEngineV2Enabled', () => {
  it('returns false by default', () => {
    expect(isPdfEngineV2Enabled()).toBe(false);
  });
  it('respects localStorage opt-in', () => {
    localStorage.setItem('pdf_engine_v2', '1');
    expect(isPdfEngineV2Enabled()).toBe(true);
  });
  it('ignores unrelated localStorage values', () => {
    localStorage.setItem('pdf_engine_v2', 'yes');
    expect(isPdfEngineV2Enabled()).toBe(false);
  });
});
