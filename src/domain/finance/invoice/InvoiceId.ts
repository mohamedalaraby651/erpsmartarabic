/**
 * InvoiceId — opaque branded identity (ADR-0011 §6, ADR-0006 R-0008).
 *
 * Pure technical identity. Carries no business meaning, no encoding of
 * tenant/number/date, no ordering. Immutability is structural: `Id<TBrand>`
 * is a branded string. Generation is the sole responsibility of `IdPort`
 * (ADR-0006); this module deliberately exposes NO factory — the VO never
 * mints its own identity.
 *
 * Equality goes through the kernel helper to keep brand discipline.
 */

import { idEquals } from "@/shared-kernel";
import type { Id } from "@/shared-kernel";

export type InvoiceId = Id<"InvoiceId">;

export function invoiceIdEquals(a: InvoiceId, b: InvoiceId): boolean {
  return idEquals(a, b);
}
