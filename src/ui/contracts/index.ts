/**
 * Composition Contracts — public surface — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Single entry point for all composite contracts. Compile-time only
 * (Invariant C8); no runtime exports may be added here.
 */
export type {
  CompositeEvent,
  CompositeEventHandler,
  EventPayload,
  EventScalar,
} from "./CompositeEvent";

export type {
  ColumnDef,
  DensityMode,
  GridColumnInteractionSpec,
  GridDensityChangePayload,
  GridFilterKind,
  GridPageChangePayload,
  GridPresentationState,
  GridRowActivatePayload,
  GridSelectionChangePayload,
  GridSortChangePayload,
  GridUIEvent,
  RowId,
  SelectionState,
  SortDirection,
  SortState,
} from "./DataGridContract";

export type {
  FieldDescriptor,
  FormDirtyPayload,
  FormErrorPayload,
  FormLifecyclePhase,
  FormResetPayload,
  FormSubmitPayload,
  FormUIEvent,
} from "./FormContract";

export type {
  OverlayClosePayload,
  OverlayOpenPayload,
  OverlaySize,
  OverlaySpec,
  OverlayUIEvent,
} from "./OverlaySpec";
