import { useEffect } from 'react';

const APP_NAME = 'ERP Smart';

/**
 * Sets document.title dynamically for SEO and better UX.
 * Format: "Page Title | ERP Smart"
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
    return () => { document.title = prev; };
  }, [title]);
}
