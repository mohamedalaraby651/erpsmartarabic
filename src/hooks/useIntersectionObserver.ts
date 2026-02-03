import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const frozen = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || (frozen.current && freezeOnceVisible)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setIsVisible(isIntersecting);
        
        if (isIntersecting && freezeOnceVisible) {
          frozen.current = true;
          observer.disconnect();
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, root, rootMargin, freezeOnceVisible]);

  return [elementRef, isVisible];
}

/**
 * Hook to lazy-load content when it becomes visible
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  options?: UseIntersectionObserverOptions
): [React.RefObject<HTMLDivElement>, T | null, boolean] {
  const [ref, isVisible] = useIntersectionObserver({
    ...options,
    freezeOnceVisible: true,
  });
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible && data === null && !isLoading) {
      setIsLoading(true);
      loader()
        .then(setData)
        .finally(() => setIsLoading(false));
    }
  }, [isVisible, loader, data, isLoading]);

  return [ref, data, isLoading];
}
