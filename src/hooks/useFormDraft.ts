import { useState, useEffect, useCallback, useRef } from 'react';

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface UseFormDraftOptions<T> {
  /** Unique key for this form (e.g. 'invoice_new' or 'customer_abc123') */
  key: string;
  /** Current form data to auto-save */
  data: T;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
  /** Read an existing draft even while the current form is pristine. */
  autoSave?: boolean;
  /** Save interval in ms (default: 5000) */
  interval?: number;
}

/**
 * Auto-saves form data to localStorage at regular intervals.
 * On mount, checks for an existing draft and exposes it for restoration.
 * Call `clearDraft()` on successful submit.
 */
export function useFormDraft<T>({ key, data, enabled = true, autoSave = true, interval = 5000 }: UseFormDraftOptions<T>) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const storageKey = `draft_${key}`;

  // Check for existing draft on mount
  useEffect(() => {
    setHasDraft(false);
    setDraftData(null);
    if (!enabled) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { data: T; savedAt: number };
        // Drafts are kept for 7 days (PRB-NAZRA-002)
        if (Number.isFinite(parsed.savedAt) && Date.now() - parsed.savedAt >= 0 && Date.now() - parsed.savedAt < DRAFT_TTL_MS) {
          setDraftData(parsed.data);
          setHasDraft(true);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey, enabled]);

  // Auto-save at interval
  useEffect(() => {
    if (!enabled || !autoSave || hasDraft) return;
    timerRef.current = setInterval(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ data, savedAt: Date.now() }));
      } catch {
        // Ignore quota errors
      }
    }, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [data, storageKey, enabled, autoSave, hasDraft, interval]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch { /* unavailable storage */ }
    setHasDraft(false);
    setDraftData(null);
  }, [storageKey]);

  const restoreDraft = useCallback((): T | null => {
    setHasDraft(false);
    return draftData;
  }, [draftData]);

  return { hasDraft, draftData, clearDraft, restoreDraft };
}
