/**
 * Internal UI Kit — standardized component library.
 *
 * @deprecated (UX-3A Wave 2, ADR-0028)
 * `src/components/ui-kit/**` is frozen and scheduled for removal in
 * Wave 4. New feature code MUST import from `src/ui/primitives/**` or
 * `src/ui/composites/**` instead.
 *
 * Wave 2 → Freeze: `@deprecated` markers + dev-only warning. Existing
 *   call sites keep working; new imports are blocked by
 *   `check-no-new-ui-kit-imports` (allowlist-based).
 * Wave 3 → Replace: migrate call sites to `src/ui/**`.
 * Wave 4 → Delete: this module is removed.
 */
import { StandardFormDialog as _StandardFormDialog } from './StandardFormDialog';
import { UnifiedStatsDisplay as _UnifiedStatsDisplay, type StatItem as _StatItem } from './UnifiedStatsDisplay';
import { StandardPageHeader as _StandardPageHeader } from './StandardPageHeader';
import { useDeleteConfirm as _useDeleteConfirm } from './useDeleteConfirm';

// Dev-only, one-shot deprecation notice. No-op in production builds.
if (import.meta.env?.DEV) {
  const g = globalThis as { __LOVABLE_UIKIT_DEPRECATED__?: boolean };
  if (!g.__LOVABLE_UIKIT_DEPRECATED__) {
    g.__LOVABLE_UIKIT_DEPRECATED__ = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[ui-kit] `@/components/ui-kit/**` is deprecated (UX-3A Wave 2, ADR-0028). " +
        "Migrate to `@/ui/primitives/**` or `@/ui/composites/**`. " +
        "This module will be removed in Wave 4."
    );
  }
}

/** @deprecated Use `@/ui/composites/form/FormDialog` when available (Wave 4). */
export const StandardFormDialog = _StandardFormDialog;
/** @deprecated Use `@/ui/composites/data/StatGrid` when available (Wave 4). */
export const UnifiedStatsDisplay = _UnifiedStatsDisplay;
/** @deprecated */
export type StatItem = _StatItem;
/** @deprecated Use `@/ui/composites/page/PageHeader` when available (Wave 4). */
export const StandardPageHeader = _StandardPageHeader;
/** @deprecated Use `@/ui/composites/state/useDeleteConfirm` when available (Wave 4). */
export const useDeleteConfirm = _useDeleteConfirm;
