export const DEFAULT_AFTER_LOGIN = '/dashboard';

/** Accept only internal app paths for post-login redirects; anything else → /dashboard. */
export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_AFTER_LOGIN;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s\\]/.test(raw)) return DEFAULT_AFTER_LOGIN;
  if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_AFTER_LOGIN;
  let url: URL;
  try { url = new URL(raw, 'http://internal.local'); } catch { return DEFAULT_AFTER_LOGIN; }
  if (url.origin !== 'http://internal.local') return DEFAULT_AFTER_LOGIN;
  if (url.pathname === '/' || url.pathname === '/auth' || url.pathname.startsWith('/auth/')) return DEFAULT_AFTER_LOGIN;
  return url.pathname + url.search + url.hash;
}
