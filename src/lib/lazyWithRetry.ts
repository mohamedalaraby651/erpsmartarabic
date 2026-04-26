/**
 * lazyWithRetry — wrapper around React.lazy that recovers from chunk-load failures.
 *
 * Why this exists:
 * After a deploy, the user's HTML may reference chunk hashes that no longer exist
 * on the CDN (because the new build replaced them). The dynamic import then throws
 * a `ChunkLoadError` and the user sees a white screen forever.
 *
 * Strategy:
 *  1. Try the import.
 *  2. On failure, wait briefly and retry up to `RETRIES` times.
 *  3. If still failing, force a one-time hard reload to fetch the fresh HTML —
 *     guarded by sessionStorage so we never enter an infinite reload loop.
 */
import { lazy, type ComponentType } from 'react';

const RETRIES = 2;
const RETRY_DELAY_MS = 500;
const RELOAD_FLAG = 'lwr:hardReloadAttempted';

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as Error)?.message || '';
  const name = (err as Error)?.name || '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        const mod = await factory();
        // success — clear any previous reload flag
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
        return mod;
      } catch (err) {
        lastErr = err;
        if (!isChunkLoadError(err)) throw err;
        if (attempt < RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        // Out of retries — try a single hard reload to get fresh HTML.
        try {
          const alreadyTried = sessionStorage.getItem(RELOAD_FLAG) === '1';
          if (!alreadyTried) {
            sessionStorage.setItem(RELOAD_FLAG, '1');
            window.location.reload();
            // Return a never-resolving promise so React doesn't render an error
            // while the page is reloading.
            return new Promise<{ default: T }>(() => { /* pending */ });
          }
        } catch { /* ignore storage errors */ }
        throw lastErr;
      }
    }
    throw lastErr;
  });
}
