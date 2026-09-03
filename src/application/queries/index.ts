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
export * as admin from "./admin";
export * as attendance from "./attendance";
export * as expenses from "./expenses";
export * as purchaseOrders from "./purchase-orders";
export * as quotations from "./quotations";
export * as reference from "./reference";
export * as salesOrders from "./sales-orders";
export * as treasury from "./treasury";
export * as activityLogs from "./activity-logs";
export * as priceLists from "./price-lists";
export * as supplierPayments from "./supplier-payments";
export * as tasks from "./tasks";
