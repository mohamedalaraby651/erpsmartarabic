/**
 * Application Query Facade — Admin
 *
 * See src/application/queries/customers.ts for the facade contract.
 * Pure re-export of the admin-console read repositories.
 *
 * Status: Pending Standardization (UX-3A Wave 2.5)
 * Owner Wave: UX-3A Wave 2 (Sprint 3.1 Batch B / C2)
 * ADR: 0028
 */
export * from "@/lib/repositories/adminRepository";
export * from "@/lib/repositories/adminMetricsRepository";
