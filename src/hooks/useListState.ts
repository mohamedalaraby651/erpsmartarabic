/**
 * useListState — unified classifier for list/page-level data states.
 *
 * Centralizes the four canonical UI states used across every list page so
 * that loading / error / empty-with-filters / empty / data branches stay
 * consistent (and so refactors don't drift). Purely presentational — it does
 * NOT render anything; pair it with `<ListErrorState />`, `<EmptyState />`,
 * or the higher-level `<ListStateRenderer />`.
 *
 * Standard usage:
 *
 *   const { data = [], isLoading, error, refetch } = useQuery(...);
 *   const state = useListState({
 *     data,
 *     isLoading,
 *     error,
 *     hasFilters: searchQuery.trim().length > 0,
 *   });
 *
 *   if (state === 'loading') return <Skeleton />;
 *   if (state === 'error')   return <ListErrorState onRetry={refetch} />;
 *   if (state === 'empty-filtered') return <EmptyState type="no-results" ... />;
 *   if (state === 'empty')   return <EmptyState type="no-data" ... />;
 *   // state === 'data' — render the list
 */

export type ListStateKind =
  | 'loading'
  | 'error'
  | 'empty-filtered'
  | 'empty'
  | 'data';

export interface UseListStateInput<T> {
  data: T[] | undefined | null;
  isLoading: boolean;
  error?: unknown;
  /** True when search/filters are active and changed the visible result set. */
  hasFilters?: boolean;
}

/**
 * Pure synchronous classifier. Safe to call inline in render — no memoization
 * needed because each branch is a constant string.
 */
export function useListState<T>({
  data,
  isLoading,
  error,
  hasFilters = false,
}: UseListStateInput<T>): ListStateKind {
  const items = data ?? [];

  // Loading wins only when we have no cached data yet — otherwise we show
  // the previous list with a background refresh, matching TanStack defaults.
  if (isLoading && items.length === 0) return 'loading';

  // Errors take precedence over empty states so the user gets a retry path.
  if (error && items.length === 0) return 'error';

  if (items.length === 0) {
    return hasFilters ? 'empty-filtered' : 'empty';
  }

  return 'data';
}

/** Convenience helper — keeps the "is the search box active" check uniform. */
export function isSearchActive(searchQuery: string | undefined | null): boolean {
  return (searchQuery ?? '').trim().length > 0;
}

export default useListState;
