import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  delay?: number;
}

export function useLongPress({
  onLongPress,
  onPress,
  delay = 500,
}: UseLongPressOptions) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<EventTarget | null>(null);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      targetRef.current = e.target;
      setIsPressed(true);

      timeoutRef.current = setTimeout(() => {
        onLongPress();
        setIsPressed(false);
      }, delay);
    },
    [onLongPress, delay]
  );

  const cancel = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        
        // If we cancelled before the long press triggered, it was a regular tap
        if (isPressed && onPress) {
          onPress();
        }
      }
      setIsPressed(false);
    },
    [isPressed, onPress]
  );

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    isPressed,
  };
}
