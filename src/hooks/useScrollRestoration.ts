import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Saves scroll position when leaving a list page and restores it on back navigation.
 * Uses sessionStorage keyed by pathname.
 */
export function useScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    const key = `scroll_${pathname}`;
    const saved = sessionStorage.getItem(key);

    if (saved) {
      const y = parseInt(saved, 10);
      // Delay to allow DOM to render
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
      });
      sessionStorage.removeItem(key);
    }

    const handleScroll = () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);
}
