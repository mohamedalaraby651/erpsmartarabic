import { useCallback, useEffect, useState } from "react";

export interface SuggestionHistoryEntry {
  id: string;          // suggestion id
  label: string;       // localized label at the time
  reason: string;      // hint/why
  at: number;          // timestamp ms
}

const MAX_ENTRIES = 20;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

const keyFor = (customerId: string) => `customer:suggestion-history:${customerId}`;

function readStore(customerId: string): SuggestionHistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(keyFor(customerId));
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
    sessionStorage.setItem(keyFor(customerId), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* ignore quota */ }
}

/**
 * Tracks a per-customer log of newly surfaced smart suggestions, with
 * timestamps and the human reason that triggered them. Persists in
 * sessionStorage with a 24h TTL and a 20-entry cap.
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
      const next = [
        ...items.map(i => ({ ...i, at: now })),
        ...prev,
      ].slice(0, MAX_ENTRIES);
      writeStore(customerId, next);
      return next;
    });
  }, [customerId]);

  const clear = useCallback(() => {
    if (!customerId) return;
    sessionStorage.removeItem(keyFor(customerId));
    setEntries([]);
  }, [customerId]);

  return { entries, append, clear };
}
