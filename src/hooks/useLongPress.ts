import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  onStart?: () => void;
  onCancel?: () => void;
  delay?: number;
  moveThreshold?: number;
}

export function useLongPress({
  onLongPress,
  onPress,
  onStart,
  onCancel,
  delay = 500,
  moveThreshold = 10,
}: UseLongPressOptions) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      // Don't preventDefault — allow native scroll
      longPressTriggeredRef.current = false;

      if ('touches' in e) {
        startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      }

      setIsPressed(true);
      onStart?.();

      timeoutRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        onLongPress();
        setIsPressed(false);
      }, delay);
    },
    [onLongPress, onStart, delay]
  );

  const move = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current || !timeoutRef.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPosRef.current.x);
      const dy = Math.abs(touch.clientY - startPosRef.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clearTimer();
        setIsPressed(false);
        onCancel?.();
      }
    },
    [moveThreshold, clearTimer, onCancel]
  );

  const cancel = useCallback(
    (_e: React.TouchEvent | React.MouseEvent) => {
      if (longPressTriggeredRef.current) {
        // Long press already fired, don't trigger onPress
        clearTimer();
        setIsPressed(false);
        return;
      }
      if (timeoutRef.current) {
        clearTimer();
        // Cancelled before long press — treat as tap
        if (onPress) {
          onPress();
        }
      }
      setIsPressed(false);
      onCancel?.();
    },
    [onPress, onCancel, clearTimer]
  );

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    isPressed,
  };
}
