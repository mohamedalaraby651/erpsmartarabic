/**
 * Centralized React Query staleTime / gcTime presets per data domain.
 *
 * Use these instead of inlining `staleTime: X` so the team has a single
 * place to tune cache behavior. Picked based on:
 *   - How often the data actually changes in production
 *   - Cost of a stale read (e.g. notifications must feel live)
 *   - Cost of a re-fetch (e.g. heavy aggregations should cache longer)
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const queryPresets = {
  /** Data that changes constantly — notifications, reminders, live alerts. */
  realtime: {
    staleTime: 15 * SECOND,
    gcTime: 2 * MINUTE,
    refetchOnWindowFocus: true,
  },
  /** Frequently changing operational data — invoices list, payments, orders. */
  operational: {
    staleTime: 60 * SECOND,
    gcTime: 5 * MINUTE,
    refetchOnWindowFocus: true,
  },
  /** Default for most queries — customers, suppliers, dashboards. */
  standard: {
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    refetchOnWindowFocus: false,
  },
  /** Rarely-changing reference data — categories, warehouses, settings. */
  reference: {
    staleTime: 30 * MINUTE,
    gcTime: 60 * MINUTE,
    refetchOnWindowFocus: false,
  },
  /** Heavy reports / aggregations — expensive to recompute. */
  report: {
    staleTime: 10 * MINUTE,
    gcTime: 30 * MINUTE,
    refetchOnWindowFocus: false,
  },
} as const;

export type QueryPreset = keyof typeof queryPresets;
