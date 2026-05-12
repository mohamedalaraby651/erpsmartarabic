import { useCallback, useEffect, useState } from "react";

export interface SuggestionHistoryEntry {
  id: string;          // suggestion id
  label: string;       // localized label at the time
  reason: string;      // hint/why
  at: number;          // timestamp ms
}

const MAX_ENTRIES = 30;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const keyFor = (customerId: string) => `customer:suggestion-history:${customerId}`;

function readStore(customerId: string): SuggestionHistoryEntry[] {
  try {
    // قراءة من localStorage مع fallback للـ sessionStorage القديم لمرة واحدة
    const raw =
      localStorage.getItem(keyFor(customerId)) ||
      sessionStorage.getItem(keyFor(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SuggestionHistoryEntry[];
    const now = Date.now();
    return parsed.filter(e => now - e.at < TTL_MS);
  } catch {
    return [];
  }
}

function writeStore(customerId: string, entries: SuggestionHistoryEntry[]) {
  try {
    localStorage.setItem(keyFor(customerId), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* ignore quota */ }
}

/**
 * Tracks a per-customer log of newly surfaced smart suggestions, with
 * timestamps and the human reason that triggered them. Persists in
 * localStorage with a 7-day TTL and a 30-entry cap.
 */
export function useSuggestionHistory(customerId: string | undefined) {
  const [entries, setEntries] = useState<SuggestionHistoryEntry[]>([]);

  useEffect(() => {
    if (!customerId) { setEntries([]); return; }
    setEntries(readStore(customerId));
  }, [customerId]);

  const append = useCallback((items: Omit<SuggestionHistoryEntry, 'at'>[]) => {
    if (!customerId || items.length === 0) return;
    const now = Date.now();
    setEntries(prev => {
      // إزالة التكرار: لا تُسجِّل نفس الاقتراح إن سُجِّل خلال آخر 5 دقائق
      const recent = new Set(
        prev.filter(e => now - e.at < 5 * 60 * 1000).map(e => e.id),
      );
      const fresh = items.filter(i => !recent.has(i.id));
      if (fresh.length === 0) return prev;
      const next = [
        ...fresh.map(i => ({ ...i, at: now })),
        ...prev,
      ].slice(0, MAX_ENTRIES);
      writeStore(customerId, next);
      return next;
    });
  }, [customerId]);

  const clear = useCallback(() => {
    if (!customerId) return;
    try { localStorage.removeItem(keyFor(customerId)); } catch { /* ignore */ }
    try { sessionStorage.removeItem(keyFor(customerId)); } catch { /* ignore */ }
    setEntries([]);
  }, [customerId]);

  return { entries, append, clear };
}
