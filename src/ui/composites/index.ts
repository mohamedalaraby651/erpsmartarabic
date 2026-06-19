/**
 * Composites — public surface — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 */
export { EmptyState, type EmptyStateProps } from "./state/EmptyState";
export { ErrorState, type ErrorStateProps } from "./state/ErrorState";
export { LoadingState, type LoadingStateProps } from "./state/LoadingState";

export { PageHeader, type PageHeaderProps } from "./page/PageHeader";
export { Stat, StatGrid, type StatProps, type StatGridProps } from "./page/StatGrid";
export {
  DescriptionList,
  type DescriptionListItem,
  type DescriptionListProps,
} from "./page/DescriptionList";

export { Form, type FormProps } from "./form/Form";
export {
  FormSection,
  FormRow,
  FormActions,
  type FormSectionProps,
  type FormRowProps,
} from "./form/FormSection";
export { FieldArray, type FieldArrayProps } from "./form/FieldArray";
export {
  FormDialog,
  useFormDialog,
  type FormDialogConfig,
  type FormDialogProps,
  type FormDialogResult,
} from "./form/FormDialog";

export { DataGrid, type DataGridProps } from "./data/DataGrid";
export {
  DataGridToolbar,
  type DataGridToolbarProps,
} from "./data/DataGridToolbar";
export { Pagination, type PaginationProps } from "./data/Pagination";
