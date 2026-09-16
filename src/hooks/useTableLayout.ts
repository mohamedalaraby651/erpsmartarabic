/**
 * useTableLayout (OPA-UI-003 / COL-001..COL-003).
 *
 * Per-user, per-screen table presentation state: column widths, row density,
 * visible columns, column order and the scrollable body height. Persisted in
 * localStorage so it survives navigation and reloads. Presentation only — it
 * never touches data, permissions or queries.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type TableDensity = 'comfortable' | 'medium' | 'compact';

export interface TableLayoutState {
  widths: Record<string, number>;
  hidden: string[];
  order: string[];
  density: TableDensity;
  /** Max height of the scrollable table body in px; 0 = no limit. */
  bodyHeight: number;
}

const DEFAULT_STATE: TableLayoutState = {
  widths: {},
  hidden: [],
  order: [],
  density: 'medium',
  bodyHeight: 0,
};

export const DENSITY_CLASS: Record<TableDensity, string> = {
  comfortable: '[&_td]:py-4 [&_th]:h-12 text-sm',
  medium: '[&_td]:py-2.5 [&_th]:h-11 text-sm',
  compact: '[&_td]:py-1.5 [&_td]:px-2 [&_th]:h-9 [&_th]:px-2 text-[13px]',
};

export const DENSITY_LABEL: Record<TableDensity, string> = {
  comfortable: 'مريح',
  medium: 'متوسط',
  compact: 'مضغوط',
};

/** Preferences are scoped per user AND per screen (COL-003). */
const storageKey = (section: string, userId: string) => `table-layout:${userId}:${section}`;

function read(section: string, userId: string): TableLayoutState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(section, userId));
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<TableLayoutState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useTableLayout(section: string, allColumnKeys: string[]) {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';
  const [state, setState] = useState<TableLayoutState>(() => read(section, userId));

  // Switching account must not inherit the previous user's layout.
  useEffect(() => {
    setState(read(section, userId));
  }, [section, userId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(section, userId), JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private mode) — layout stays in memory */
    }
  }, [section, userId, state]);

  const setWidth = useCallback((key: string, width: number) => {
    setState((s) => ({ ...s, widths: { ...s.widths, [key]: Math.round(width) } }));
  }, []);

  const autoFitWidth = useCallback((key: string) => {
    setState((s) => {
      const widths = { ...s.widths };
      delete widths[key];
      return { ...s, widths };
    });
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setState((s) => ({
      ...s,
      hidden: s.hidden.includes(key) ? s.hidden.filter((k) => k !== key) : [...s.hidden, key],
    }));
  }, []);

  const moveColumn = useCallback(
    (key: string, direction: -1 | 1) => {
      setState((s) => {
        const current = s.order.length ? [...s.order] : [...allColumnKeys];
        const i = current.indexOf(key);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= current.length) return s;
        [current[i], current[j]] = [current[j], current[i]];
        return { ...s, order: current };
      });
    },
    [allColumnKeys],
  );

  const setDensity = useCallback((density: TableDensity) => {
    setState((s) => ({ ...s, density }));
  }, []);

  const setBodyHeight = useCallback((bodyHeight: number) => {
    setState((s) => ({ ...s, bodyHeight }));
  }, []);

  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  /** Column keys in the user's order, hidden ones removed. */
  const visibleKeys = useMemo(() => {
    const ordered = state.order.length
      ? [...state.order.filter((k) => allColumnKeys.includes(k)),
         ...allColumnKeys.filter((k) => !state.order.includes(k))]
      : allColumnKeys;
    return ordered.filter((k) => !state.hidden.includes(k));
  }, [state.order, state.hidden, allColumnKeys]);

  const orderedKeys = useMemo(() => {
    return state.order.length
      ? [...state.order.filter((k) => allColumnKeys.includes(k)),
         ...allColumnKeys.filter((k) => !state.order.includes(k))]
      : allColumnKeys;
  }, [state.order, allColumnKeys]);

  return {
    ...state,
    visibleKeys,
    orderedKeys,
    setWidth,
    autoFitWidth,
    toggleColumn,
    moveColumn,
    setDensity,
    setBodyHeight,
    reset,
  };
}

export type TableLayout = ReturnType<typeof useTableLayout>;
