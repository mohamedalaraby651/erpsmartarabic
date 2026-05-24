import { PdfTimeoutError } from './errors';

/**
 * Wraps a promise with a hard timeout. The original promise keeps
 * running in the background — callers must treat it as abandoned.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new PdfTimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Run `fn` with one automatic retry on failure. `shouldRetry` filters
 * which errors are worth retrying (defaults to "transient font/network").
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { shouldRetry?: (e: unknown) => boolean; delayMs?: number } = {},
): Promise<T> {
  const shouldRetry =
    opts.shouldRetry ??
    ((e: unknown) => {
      const name = (e as { name?: string })?.name ?? '';
      return name === 'PdfFontLoadError' || name === 'PdfTimeoutError';
    });
  try {
    return await fn();
  } catch (e) {
    if (!shouldRetry(e)) throw e;
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    return fn();
  }
}
