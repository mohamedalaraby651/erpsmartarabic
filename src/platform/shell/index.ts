/**
 * Platform · shell — public sub-façade. The ONLY module allowed to
 * instantiate `PlatformRuntime` or provide `RuntimeContext`. Enforced by
 * `check-platform-shell-single-entry.mjs`.
 */
export { PlatformShell } from "./PlatformShell";
export type { PlatformShellProps } from "./PlatformShell";
