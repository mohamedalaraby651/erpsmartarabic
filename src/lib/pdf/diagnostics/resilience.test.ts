import { describe, it, expect, vi } from 'vitest';
import { withTimeout, withRetry } from './resilience';
import { PdfTimeoutError, PdfFontLoadError } from './errors';

describe('withTimeout', () => {
  it('resolves when the promise finishes in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });
  it('rejects with PdfTimeoutError on overrun', async () => {
    const slow = new Promise((r) => setTimeout(() => r('late'), 30));
    await expect(withTimeout(slow, 5)).rejects.toBeInstanceOf(PdfTimeoutError);
  });
  it('propagates the underlying error', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom');
  });
});

describe('withRetry', () => {
  it('returns first-try result without re-invoking', async () => {
    const fn = vi.fn().mockResolvedValue('a');
    await expect(withRetry(fn)).resolves.toBe('a');
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('retries once on a retryable error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new PdfFontLoadError('amiri', 'fail'))
      .mockResolvedValue('b');
    await expect(withRetry(fn)).resolves.toBe('b');
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('hard'));
    await expect(withRetry(fn)).rejects.toThrow('hard');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
