/**
 * DataGrid — UX-1D (UI-state only).
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Invariant C9: this composite handles only sort UI state, selection UI
 * state, density, and row activation. It does NOT fetch data, does NOT
 * paginate, does NOT know server semantics. All state is controlled —
 * callers own the source of truth.
 *
 * Events flow through the CompositeEvent envelope (Invariant C10).
 */
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/Table";
import { Checkbox } from "@/ui/primitives/Checkbox";
import type {
  ColumnDef,
  CompositeEventHandler,
  DensityMode,
  GridUIEvent,
  RowId,
  SelectionState,
  SortDirection,
  SortState,
} from "@/ui/contracts";
import { cn } from "@/lib/utils";

export interface DataGridProps<TRow extends Record<string, unknown>> {
  rows: ReadonlyArray<TRow>;
  columns: ReadonlyArray<ColumnDef<TRow>>;
  getRowId: (row: TRow) => RowId;
  sort?: SortState;
  selection?: SelectionState;
  density?: DensityMode;
  ariaLabel: string;
  onEvent?: CompositeEventHandler<GridUIEvent>;
  className?: string;
}

function nextDirection(prev: SortDirection | undefined): SortDirection {
  return prev === "asc" ? "desc" : "asc";
}

export function DataGrid<TRow extends Record<string, unknown>>({
  rows,
  columns,
  getRowId,
  sort,
  selection,
  density = "comfortable",
  ariaLabel,
  onEvent,
  className,
}: DataGridProps<TRow>) {
  const selectedSet = React.useMemo(
    () => new Set(selection?.selectedIds ?? []),
    [selection?.selectedIds],
  );
  const selectionMode = selection?.mode ?? "none";

  const toggleSort = (col: ColumnDef<TRow>) => {
    if (!col.sortable) return;
    const dir =
      sort?.columnId === col.id ? nextDirection(sort.direction) : "asc";
    onEvent?.({
      type: "grid.sort.change",
      payload: { columnId: col.id, direction: dir },
    });
  };

  const toggleRow = (id: RowId) => {
    if (selectionMode === "none") return;
    if (selectionMode === "single") {
      onEvent?.({
        type: "grid.selection.change",
        payload: { selectedIds: selectedSet.has(id) ? [] : [id] },
      });
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onEvent?.({
      type: "grid.selection.change",
      payload: { selectedIds: Array.from(next) },
    });
  };

  const toggleAll = () => {
    if (selectionMode !== "multi") return;
    const allIds = rows.map(getRowId);
    const allSelected = allIds.every((id) => selectedSet.has(id));
    onEvent?.({
      type: "grid.selection.change",
      payload: { selectedIds: allSelected ? [] : allIds },
    });
  };

  const allSelected =
    selectionMode === "multi" &&
    rows.length > 0 &&
    rows.every((r) => selectedSet.has(getRowId(r)));

  return (
    <div
      data-density={density}
      className={cn("w-full overflow-auto rounded-md border", className)}
    >
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow>
            {selectionMode === "multi" ? (
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all rows"
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
            ) : null}
            {columns.map((col) => {
              const isSorted = sort?.columnId === col.id;
              const ariaSort = isSorted
                ? sort?.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none";
              return (
                <TableHead
                  key={col.id}
                  aria-sort={col.sortable ? ariaSort : undefined}
                  style={{ width: col.width }}
                  className={cn(
                    col.align === "end" && "text-end",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => toggleSort(col)}
                    >
                      {col.header}
                      {isSorted ? (
                        <span aria-hidden>
                          {sort?.direction === "asc" ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const id = getRowId(row);
            const isSelected = selectedSet.has(id);
            return (
              <TableRow
                key={id}
                data-state={isSelected ? "selected" : undefined}
                onDoubleClick={() =>
                  onEvent?.({
                    type: "grid.row.activate",
                    payload: { rowId: id },
                  })
                }
              >
                {selectionMode === "multi" ? (
                  <TableCell className="w-10">
                    <Checkbox
                      aria-label={`Select row ${id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleRow(id)}
                    />
                  </TableCell>
                ) : null}
                {columns.map((col) => {
                  const value = col.render
                    ? col.render(row)
                    : col.accessor
                      ? (row[col.accessor] as React.ReactNode)
                      : null;
                  return (
                    <TableCell
                      key={col.id}
                      className={cn(
                        density === "compact" && "py-1.5",
                        col.align === "end" && "text-end",
                        col.align === "center" && "text-center",
                      )}
                    >
                      {value as React.ReactNode}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
