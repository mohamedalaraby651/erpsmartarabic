/**
 * Internal UI Kit — standardized component library.
 *
 * Provides consistent patterns across all modules for:
 * - Form Dialogs (desktop Dialog + mobile FullScreenForm)
 * - Stats Displays (auto-responsive grid/scroll)
 * - Page Headers (title + search + CTA + actions)
 * - Delete Confirmations (hook-based pattern)
 */

export { StandardFormDialog } from './StandardFormDialog';
export { UnifiedStatsDisplay, type StatItem } from './UnifiedStatsDisplay';
export { StandardPageHeader } from './StandardPageHeader';
export { useDeleteConfirm } from './useDeleteConfirm';
