# `useListState` — Unified List State Pattern

> Status: **Mandatory** for every list/index page in the app.
> Last updated: 2026‑06‑17 (Phase 1A · Round C closure).

## Why this exists

Before this pattern, every list page re‑implemented the same conditional
ladder — `isLoading`, `error`, `data.length === 0` — with slight differences
in copy, icons, retry behavior, and treatment of "no results vs. no data".
That drift produced:

- Inconsistent UX (some pages hid the retry button on error, others crashed).
- Repeated dead code (5+ ad‑hoc "empty wrapper" components).
- Bugs where a filtered empty state was indistinguishable from "user has zero
  records", removing the user's path back.

`useListState` is a **pure classifier** that collapses those branches into
five canonical kinds: `loading | error | empty-filtered | empty | data`.

## When to use it

Use it on **any page that renders a list/table/grid backed by a query**:

- Index pages (`/customers`, `/invoices`, `/suppliers`, …).
- Tabs that show their own list (`InventoryMovementsTab`, …).
- Modals/drawers that paginate items.

## When NOT to use it

- Detail pages where the "list" is a small inline section that already lives
  inside a larger composed view — e.g. reminders inside `CustomerDetailsPage`.
  Those sections render `<EmptyState compact />` directly without the
  full ladder, because there is no dedicated retry surface.
- Forms (use the upcoming `useFormState` instead — Phase 1B).
- Pure derived/computed lists with no async source.

## Minimum usage

```tsx
import { useListState } from '@/hooks/useListState';
import { ListErrorState } from '@/components/shared/ListErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { MobileListSkeleton } from '@/components/mobile/MobileListSkeleton';

const { data = [], isLoading, error, refetch } = useQuery(/* … */);

const state = useListState({
  data,
  isLoading,
  error,
  hasFilters: searchQuery.trim().length > 0 || statusFilter !== 'all',
});

if (state === 'loading')        return <MobileListSkeleton count={6} />;
if (state === 'error')          return <ListErrorState onRetry={() => refetch()} />;
if (state === 'empty-filtered') return <EmptyState icon={Search} title="لا توجد نتائج" ... />;
if (state === 'empty')          return <EmptyState icon={Package} title="لا توجد بيانات" action={{ label: 'إضافة', onClick: openCreate }} />;

// state === 'data' — render the list
return <List items={data} />;
```

For new pages prefer `<ListStateRenderer />` which wraps the same five
branches behind a single component.

## Standards (Definition of Done)

A list page is compliant when **all** of the following hold:

1. Uses `useListState` (or `ListStateRenderer`) — never an ad‑hoc ladder.
2. Loading state uses `MobileListSkeleton` on mobile, table skeletons on
   desktop.
3. Error state uses `<ListErrorState onRetry={…} />` with a working retry.
4. Empty‑filtered state offers a "Clear filters" affordance.
5. Empty‑no‑data state offers the primary create action when the user has
   permission.
6. Copy comes from `@/lib/uiCopy.ts` (no literals in `aria-label` /
   `tooltip`).
7. Retry button height ≥ 44px (mobile tap target).

## Documented exceptions

| Page / component             | Why exempt                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `CustomerDetailsPage` → reminders section | Embedded sub‑section of a details view; uses `<EmptyState compact />`.    |
| `Dashboard widgets`          | Wrapped in `WidgetErrorBoundary`; each widget renders its own focused state.         |
| `NotificationsPage` feed     | Uses realtime stream + virtual list; loading is incremental, not all‑or‑nothing.     |

Any new exception MUST be added to this table in the same PR that introduces
it, with a one‑line justification.

## Regression checklist

When touching a compliant page, re‑verify:

- [ ] Search (debounced) still narrows results.
- [ ] Sort still works after retry.
- [ ] All filters still combine correctly with the `hasFilters` flag.
- [ ] Retry on error refetches and clears the error state.
- [ ] Empty → data transition does not flash a skeleton.
- [ ] Tab switching does not leak state between tabs.
- [ ] No new TS or ESLint errors.
