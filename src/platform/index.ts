/**
 * @platform — public façade (UX3A §Platform)
 *
 * Only re-exports; consumers must NOT deep-import from `@/platform/*`
 * except the whitelisted sub-façades: `@/platform/ports`, `@/platform/runtime`,
 * `@/platform/shell`.
 */
export * as runtime from "./runtime";
export * as ports from "./ports";
