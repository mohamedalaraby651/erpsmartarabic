import { useCallback } from "react";
import type { MobileSectionId } from "@/components/customers/mobile/CustomerIconStrip";

const KEY_PREFIX = "customer:last-section:";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface Stored {
  section: MobileSectionId;
  ts: number;
}

/**
 * Persists the last opened mobile section per customer in sessionStorage.
 * Entries older than TTL are ignored.
 */
export function useLastVisitedSection(customerId: string | undefined) {
  const read = useCallback((): MobileSectionId | null => {
    if (!customerId) return null;
    try {
      const raw = sessionStorage.getItem(KEY_PREFIX + customerId);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Stored;
      if (!parsed?.section || Date.now() - parsed.ts > TTL_MS) return null;
      return parsed.section;
    } catch {
      return null;
    }
  }, [customerId]);

  const write = useCallback((section: MobileSectionId) => {
    if (!customerId) return;
    try {
      const payload: Stored = { section, ts: Date.now() };
      sessionStorage.setItem(KEY_PREFIX + customerId, JSON.stringify(payload));
    } catch { /* quota — ignore */ }
  }, [customerId]);

  return { read, write };
}
