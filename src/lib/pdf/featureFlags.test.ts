import { describe, it, expect, afterEach, vi } from 'vitest';
import { isPdfEngineV2Enabled } from './featureFlags';

const ls = window.localStorage as unknown as { getItem: ReturnType<typeof vi.fn> };

afterEach(() => {
  ls.getItem.mockReset();
});

describe('isPdfEngineV2Enabled', () => {
  it('returns false by default', () => {
    ls.getItem.mockReturnValue(null);
    expect(isPdfEngineV2Enabled()).toBe(false);
  });
  it('respects localStorage opt-in', () => {
    ls.getItem.mockReturnValue('1');
    expect(isPdfEngineV2Enabled()).toBe(true);
  });
  it('ignores unrelated localStorage values', () => {
    ls.getItem.mockReturnValue('yes');
    expect(isPdfEngineV2Enabled()).toBe(false);
  });
});
