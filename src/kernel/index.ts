/**
 * @kernel — public façade (UX3A §Kernel)
 *
 * Pure primitives only. No React, DOM, network, Supabase, or browser globals.
 * See DEPENDENCY_RULES.md §Kernel and ADR-0015.
 */
export * from "./identity";
export * from "./clock";
export * from "./culture";
export * from "./i18n";
export * from "./env";
export * from "./flags";
export * from "./tenant";
export * from "./permissions";
