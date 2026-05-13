import { useRef, useCallback, useEffect } from "react";

interface AnnouncerOptions {
  /** Minimum ms between identical announcements (default: 3000) */
  dedupWindow?: number;
  /** Debounce ms for rapid changes (default: 150) */
  debounceMs?: number;
}

/**
 * Controlled ARIA live announcer with deduplication and debounce.
 * Prevents screen readers from spamming identical messages on rapid re-renders.
 */
export function useAnnouncer(options: AnnouncerOptions = {}) {
  const { dedupWindow = 3000, debounceMs = 150 } = options;

  const [message, setMessageRaw] = useState("");
  const lastMsg = useRef("");
  const lastTime = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback(
    (next: string) => {
      if (!next) return;
      const now = Date.now();
      // Deduplicate identical messages within the window
      if (next === lastMsg.current && now - lastTime.current < dedupWindow) {
        return;
      }
      // Clear pending debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastMsg.current = next;
        lastTime.current = Date.now();
        setMessageRaw(next);
      }, debounceMs);
    },
    [dedupWindow, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const clear = useCallback(() => setMessageRaw(""), []);

  return { message, announce, clear };
}

import { useState } from "react";
