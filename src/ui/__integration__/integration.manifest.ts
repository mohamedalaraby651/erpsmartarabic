/**
 * UX-1E Integration Manifest — version-locked.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Single source of truth for the spike. Any structural change to this file
 * MUST bump `manifestSchema` and `fingerprint`; the fitness check
 * `check-integration-scope` rejects mismatches.
 *
 * Compile-time only. Do not import React, IO, data-layer, or contracts here.
 */

export const integrationManifest = {
  manifestSchema: 1,
  fingerprint: "ux1e-v3",
  version: "1.0",
  scope: "UX-1E",
  frozenContracts: true,
  disposable: true,
  devOnly: true,
  scenarios: [
    "happy",
    "empty",
    "error",
    "slow",
    "large",
    "duplicateIds",
    "nullFields",
    "unicode",
  ] as const,
  composites: [
    "DataGrid",
    "Form",
    "FormDialog",
    "PageHeader",
    "StatGrid",
    "DescriptionList",
    "EmptyState",
    "ErrorState",
    "LoadingState",
    "Pagination",
  ] as const,
  perfPoints: [
    "firstRender",
    "sort",
    "selectionToggle",
    "dialogOpen",
  ] as const,
} as const;

export type ManifestScenario = (typeof integrationManifest.scenarios)[number];
export type ManifestComposite = (typeof integrationManifest.composites)[number];
export type ManifestPerfPoint = (typeof integrationManifest.perfPoints)[number];
