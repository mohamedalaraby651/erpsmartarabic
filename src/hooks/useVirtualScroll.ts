import { useRef, useCallback, useState, useEffect } from 'react';
import { useVirtualizer, VirtualizerOptions } from '@tanstack/react-virtual';

interface UseVirtualScrollOptions {
  count: number;
  estimateSize: number;
  overscan?: number;
  maxHeight?: number;
}

export function useVirtualScroll({
  count,
  estimateSize,
  overscan = 10,
  maxHeight = 600,
}: UseVirtualScrollOptions) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    const timeout = setTimeout(() => setIsScrolling(false), 150);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const element = parentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' }) => {
      virtualizer.scrollToIndex(index, options);
    },
    [virtualizer]
  );

  const scrollToTop = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, []);

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    isScrolling,
    scrollToIndex,
    scrollToTop,
    containerStyle: {
      maxHeight,
      overflow: 'auto' as const,
    },
    innerStyle: {
      height: `${virtualizer.getTotalSize()}px`,
      width: '100%',
      position: 'relative' as const,
    },
  };
}
