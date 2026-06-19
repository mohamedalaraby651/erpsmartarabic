/**
 * Mock list adapter — UX-1E.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Hooks-shaped glue that conforms to the read-side surface of
 * `DataGridContract`. NEVER imports from `lib/repositories`, `lib/queries`,
 * `integrations/supabase`, `@tanstack/react-query`, `axios`, raw `fetch`, or
 * `zod`. Boundary is enforced by `check-integration-scope` and an adapter
 * boundary unit test.
 */
import * as React from "react";
import type {
  ColumnDef,
  SelectionState,
  SortState,
  DensityMode,
} from "@/ui/contracts";
import { scenarios, type Scenario, type ScenarioName } from "../scenarios";
import type { MockCustomer } from "../mocks/customers.mock";
import type { MockError } from "../mocks/errors";
import { withLatency } from "../mocks/delays";

export interface MockListState<TRow extends Record<string, unknown>> {
  readonly rows: ReadonlyArray<TRow>;
  readonly columns: ReadonlyArray<ColumnDef<TRow>>;
  readonly loading: boolean;
  readonly error: MockError | null;
  readonly sort: SortState | undefined;
  readonly selection: SelectionState;
  readonly density: DensityMode;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  setSort(next: SortState | undefined): void;
  setSelection(ids: ReadonlyArray<string>): void;
  setDensity(next: DensityMode): void;
  setPage(next: number): void;
  getRowId(row: TRow): string;
}

const PAGE_SIZE = 25;

function sortRows<T extends MockCustomer>(
  rows: ReadonlyArray<T>,
  sort: SortState | undefined,
): ReadonlyArray<T> {
  if (!sort) return rows;
  const key = sort.columnId as keyof T;
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key] as unknown;
    const bv = b[key] as unknown;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

export function useMockList(
  scenarioName: ScenarioName,
): MockListState<MockCustomer> {
  const scenario: Scenario = scenarios[scenarioName];
  const [loading, setLoading] = React.useState<boolean>(
    Boolean(scenario.latencyMs),
  );
  const [sort, setSort] = React.useState<SortState | undefined>(undefined);
  const [selectedIds, setSelected] = React.useState<ReadonlyArray<string>>([]);
  const [density, setDensity] = React.useState<DensityMode>("comfortable");
  const [page, setPage] = React.useState<number>(1);

  React.useEffect(() => {
    setLoading(Boolean(scenario.latencyMs));
    setPage(1);
    setSelected([]);
    setSort(undefined);
    if (!scenario.latencyMs) return;
    let cancelled = false;
    withLatency(scenario.latencyMs).then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [scenarioName, scenario.latencyMs]);

  const sorted = React.useMemo(
    () => sortRows(scenario.rows, sort),
    [scenario.rows, sort],
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  return {
    rows: pageRows,
    columns: scenario.columns,
    loading,
    error: scenario.error ?? null,
    sort,
    selection: { mode: "multi", selectedIds },
    density,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
    setSort,
    setSelection: setSelected,
    setDensity,
    setPage,
    getRowId: (row) => row.id,
  };
}
