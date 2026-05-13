import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://erpsmartarabic1.lovable.app';

/**
 * Per-route canonical link tag.
 *
 * Maintains a single <link rel="canonical"> in document.head that always
 * points to the current pathname under the canonical site origin. Strips
 * route params from /:id paths to avoid indexing thousands of duplicate
 * detail URLs (we canonicalize them to the list page instead).
 *
 * Mount once near the router root; it tracks `useLocation()` and updates
 * on every navigation.
 */
export function useCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Skip private/auth-gated routes — we don't want Google to index a
    // detail URL it can't actually crawl. Only landing + auth + root are
    // truly public; everything else we point back to the landing page.
    const PUBLIC_PATHS = new Set(['/', '/landing', '/auth']);
    const path = PUBLIC_PATHS.has(pathname) ? pathname : '/landing';
    const href = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [pathname]);
}
