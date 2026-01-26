import { useRef, useCallback, useEffect, useState } from 'react';

interface UseInfiniteScrollOptions {
  pageSize?: number;
  enabled?: boolean;
}

export function useInfiniteScroll<T>({
  pageSize = 20,
  enabled = true,
}: UseInfiniteScrollOptions = {}) {
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const observerTarget = useRef<HTMLElement | null>(null);
  const observerInstance = useRef<IntersectionObserver | null>(null);

  const fetchNextPage = useCallback(() => {
    if (hasMore && !isFetching && enabled) {
      setPage(p => p + 1);
    }
  }, [hasMore, isFetching, enabled]);

  const updateHasMore = useCallback((dataLength: number) => {
    setHasMore(dataLength === pageSize);
  }, [pageSize]);

  const observerRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerInstance.current) {
        observerInstance.current.disconnect();
      }

      if (node && hasMore && enabled) {
        observerInstance.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && !isFetching) {
              fetchNextPage();
            }
          },
          { threshold: 0.1, rootMargin: '100px' }
        );
        observerInstance.current.observe(node);
      }

      observerTarget.current = node;
    },
    [hasMore, isFetching, fetchNextPage, enabled]
  );

  useEffect(() => {
    return () => {
      observerInstance.current?.disconnect();
    };
  }, []);

  const reset = useCallback(() => {
    setPage(0);
    setHasMore(true);
  }, []);

  return {
    page,
    pageSize,
    hasNextPage: hasMore,
    isFetchingNextPage: isFetching,
    setIsFetching,
    fetchNextPage,
    updateHasMore,
    observerRef,
    reset,
  };
}
