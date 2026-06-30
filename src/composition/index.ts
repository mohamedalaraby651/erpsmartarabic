/**
 * Composition Root barrel (UX-2B Wave 2B).
 *
 * Re-exports the per-context factories. The app shell is the only legal
 * consumer — `check-composition-root-uniqueness` keeps this honest.
 */
export { createFinanceModule } from "./finance";
export type { FinanceModule, FinanceModuleDeps } from "./finance";
