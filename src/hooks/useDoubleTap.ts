import { useCallback, useRef } from 'react';

interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  delay?: number;
}

export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delay = 300,
}: UseDoubleTapOptions) {
  const lastTapRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      // Double tap detected
      lastTapRef.current = 0;
      onDoubleTap();
    } else {
      // Single tap - wait to see if it becomes a double tap
      lastTapRef.current = now;
      if (onSingleTap) {
        timeoutRef.current = setTimeout(() => {
          onSingleTap();
          lastTapRef.current = 0;
        }, delay);
      }
    }
  }, [onDoubleTap, onSingleTap, delay]);

  return handleTap;
}
