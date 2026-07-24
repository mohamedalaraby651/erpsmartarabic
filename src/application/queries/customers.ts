/**
 * Application Query Facade — Customers
 *
 * Purpose: Public application-layer surface for UI consumption of customer
 * read models. Wraps `@/lib/repositories/customerRepository` so the
 * presentation layer (pages/components) does not import the repository
 * layer directly.
 *
 * Facade Creation Rule (Sprint 3.1 Batch A v3):
 *  - Reused by ≥2 UI modules ✅
 *  - Represents a stable public application contract ✅
 *
 * Status: Pending Standardization (UX-3A Wave 2.5) — see docs/architecture/UI_API_V1.md
 * Owner Wave: UX-3A Wave 2 (Sprint 3.1)
 * ADR: 0028
 *
 * DO NOT add behavior here. Facade must remain a pure re-export until
 * standardized in Wave 2.5.
 */
export * from "@/lib/repositories/customerRepository";
