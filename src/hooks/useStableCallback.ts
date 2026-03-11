import { useCallback, useRef } from 'react';

type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Returns a stable callback that always calls the latest version of the passed function.
 * Useful for event handlers that need to access latest state but shouldn't trigger re-renders.
 */
export function useStableCallback<T extends AnyFunction>(callback: T): T {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Returns a debounced version of the callback.
 * The callback will only be called after the specified delay has passed since the last call.
 */
export function useDebouncedCallback<T extends AnyFunction>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

/**
 * Returns a throttled version of the callback.
 * The callback will be called at most once per specified interval.
 */
export function useThrottledCallback<T extends AnyFunction>(
  callback: T,
  interval: number
): T {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastCallRef.current >= interval) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [interval]
  );
}
