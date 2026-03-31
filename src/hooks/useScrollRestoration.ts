import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Saves scroll position when leaving a list page and restores it on back navigation.
 * Uses sessionStorage keyed by pathname. Throttled to avoid excessive writes.
 */
export function useScrollRestoration() {
  const { pathname } = useLocation();
  const lastWriteRef = useRef(0);

  useEffect(() => {
    const key = `scroll_${pathname}`;
    const saved = sessionStorage.getItem(key);

    if (saved) {
      const y = parseInt(saved, 10);
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
      });
      sessionStorage.removeItem(key);
    }

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < 200) return;
      lastWriteRef.current = now;
      sessionStorage.setItem(key, String(window.scrollY));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);
}
