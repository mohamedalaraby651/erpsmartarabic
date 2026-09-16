/**
 * DataGrid contract — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Invariant C9: DataGrid handles UI state only — sort UI state, selection UI
 * state, density, column visibility. It does NOT decide pagination strategy,
 * does NOT know about server semantics, and does NOT fetch data.
 *
 * Compile-time only (Invariant C8). No runtime, no React, no fetch types.
 */
import type { CompositeEvent, EventPayload } from "./CompositeEvent";

export type RowId = string;

export type SortDirection = "asc" | "desc";

export interface SortState {
  readonly columnId: string;
  readonly direction: SortDirection;
}

export interface SelectionState {
  readonly mode: "none" | "single" | "multi";
  readonly selectedIds: ReadonlyArray<RowId>;
}

export type DensityMode = "comfortable" | "medium" | "compact";

/** Filter vocabulary exposed by the UI. Query adapters own its translation. */
export type GridFilterKind = "options" | "text" | "date" | "number";

/**
 * Presentation/interaction metadata only. Database column names and business
 * predicates are deliberately excluded and stay in the application layer.
 */
export interface GridColumnInteractionSpec {
  readonly id: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly filterKind?: GridFilterKind;
  readonly resizable?: boolean;
  readonly hideable?: boolean;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly derived?: boolean;
}

/** Per-user, per-screen presentation state. It must never invalidate data. */
export interface GridPresentationState {
  readonly version: number;
  readonly widths: Readonly<Record<string, number>>;
  readonly hidden: ReadonlyArray<string>;
  readonly order: ReadonlyArray<string>;
  readonly density: DensityMode;
  readonly bodyHeight: number;
}

/**
 * Column definition — presentation-only.
 *
 * `accessor` is a plain string key into the row record. `render` is an
 * optional cell renderer. No async, no validators, no formatters tied to
 * domain types.
 */
export interface ColumnDef<TRow extends Record<string, unknown>> {
  readonly id: string;
  readonly header: string;
  readonly accessor?: keyof TRow & string;
  readonly sortable?: boolean;
  readonly align?: "start" | "center" | "end";
  readonly width?: number | string;
  readonly render?: (row: TRow) => unknown;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Grid UI events — every variant flows through the CompositeEvent envelope.
 * ────────────────────────────────────────────────────────────────────────── */

export interface GridSortChangePayload extends EventPayload {
  readonly columnId: string;
  readonly direction: SortDirection;
}

export interface GridSelectionChangePayload extends EventPayload {
  readonly selectedIds: ReadonlyArray<RowId>;
}

export interface GridRowActivatePayload extends EventPayload {
  readonly rowId: RowId;
}

export interface GridDensityChangePayload extends EventPayload {
  readonly density: DensityMode;
}

export interface GridPageChangePayload extends EventPayload {
  readonly page: number;
}

export type GridUIEvent =
  | CompositeEvent<"grid.sort.change", GridSortChangePayload>
  | CompositeEvent<"grid.selection.change", GridSelectionChangePayload>
  | CompositeEvent<"grid.row.activate", GridRowActivatePayload>
  | CompositeEvent<"grid.density.change", GridDensityChangePayload>
  | CompositeEvent<"grid.page.change", GridPageChangePayload>;
