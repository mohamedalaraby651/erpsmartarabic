/**
 * Finance application surface (UX-2B Wave 1).
 *
 * Re-exports the Invoice use-case barrel. New bounded application modules
 * (e.g. payment, billing) will hang off this barrel as they land.
 */
export * from "./invoice";
