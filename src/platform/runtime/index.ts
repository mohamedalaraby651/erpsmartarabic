/**
 * Platform · runtime — public sub-façade.
 * See ADR-0024 (Runtime Lifecycle) and DEPENDENCY_RULES.md §Runtime.
 */
export { PlatformRuntime } from "./PlatformRuntime";
export type {
  RuntimeState,
  RuntimePhase,
  RuntimePhaseEvent,
  RuntimeConfig,
} from "./PlatformRuntime";
export { RuntimeContext, useRuntimePhase } from "./RuntimeContext";
