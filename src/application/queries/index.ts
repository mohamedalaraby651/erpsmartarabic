/**
 * Application Query Facades — Public Surface (Sprint 3.1 Batch A v3)
 *
 * Sanctioned import path for UI consumption of read models.
 * Bypasses direct presentation → repository imports (which are
 * flagged by dep-graph fitness as critical layer violations).
 *
 * Consumers: `src/pages/**`, `src/components/**`, `src/hooks/**`
 */
export * as customers from "./customers";
export * as suppliers from "./suppliers";
export * as products from "./products";
export * as customerSearch from "./customer-search";
