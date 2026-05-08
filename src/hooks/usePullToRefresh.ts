import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<unknown> | unknown;
  /** Distance (px) the user must pull beyond the top to trigger a refresh. */
  threshold?: number;
  /** Disable on non-touch devices automatically. */
  enabled?: boolean;
}

/**
 * Lightweight pull-to-refresh hook for mobile lists.
 *
 * Usage:
 *   const { bindRef, pullDistance, isRefreshing } = usePullToRefresh({
 *     onRefresh: refetch,
 *   });
 *   return <div ref={bindRef}>...</div>;
 *
 * Renders nothing by itself — the consumer decides how to visualize
 * `pullDistance` (e.g. a spinner that grows as the user drags down).
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  enabled = true,
}: UsePullToRefreshOptions) {
  const ref = useRef<HTMLElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
    if (!isTouch) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || isRefreshing) return;
      startY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        // Resistance curve so it feels native, not linear.
        setPullDistance(Math.min(dy * 0.5, threshold * 1.5));
      }
    };
    const onTouchEnd = async () => {
      if (startY.current == null) return;
      const triggered = pullDistance >= threshold;
      startY.current = null;
      setPullDistance(0);
      if (triggered) {
        setIsRefreshing(true);
        try { await onRefresh(); }
        finally { setIsRefreshing(false); }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, threshold, enabled, pullDistance, isRefreshing]);

  return {
    bindRef: (node: HTMLElement | null) => { ref.current = node; },
    pullDistance,
    isRefreshing,
    progress: Math.min(pullDistance / threshold, 1),
  };
}
