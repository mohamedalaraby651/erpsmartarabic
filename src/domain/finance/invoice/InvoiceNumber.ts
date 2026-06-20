/**
 * InvoiceNumber — Business Identity (ADR-0011 §6).
 *
 * Distinct from `InvoiceId` (technical). InvoiceNumber is a human-meaningful
 * identifier owned by the business; generation policy (sequence, prefix,
 * fiscal year) depends on tenant configuration and is therefore explicitly
 * NOT performed inside this VO — the VO only validates and wraps an already
 * minted value supplied by an application-layer numbering service.
 *
 * Pure VO: no I/O, no time, no infrastructure. All failures are Results.
 *
 * Validation contract (intentionally minimal at the domain layer):
 *   - non-empty after trim
 *   - length ∈ [1, 64]
 *   - charset: ASCII letters, digits, and the separators `-` `_` `/`
 *   - normalization: trim only (case preserved; tenants may use mixed-case)
 *
 * Stricter tenant-specific formats (e.g. "INV-YYYY-####") belong in the
 * numbering service, not here. The VO must not assume any single scheme.
 */

import { ok, err } from "@/shared-kernel";
import type { Result } from "@/shared-kernel";

const MAX_LENGTH = 64;
const ALLOWED = /^[A-Za-z0-9\-_/]+$/;

export type InvoiceNumberDomainError =
  | { readonly kind: "InvalidInvoiceNumber"; readonly reason: "Empty" }
  | {
      readonly kind: "InvalidInvoiceNumber";
      readonly reason: "TooLong";
      readonly length: number;
      readonly max: number;
    }
  | {
      readonly kind: "InvalidInvoiceNumber";
      readonly reason: "InvalidCharset";
      readonly value: string;
    }
  | {
      readonly kind: "InvalidInvoiceNumber";
      readonly reason: "NotAString";
    };

export class InvoiceNumber {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static of(input: string): Result<InvoiceNumber, InvoiceNumberDomainError> {
    if (typeof input !== "string") {
      return err({ kind: "InvalidInvoiceNumber", reason: "NotAString" });
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return err({ kind: "InvalidInvoiceNumber", reason: "Empty" });
    }
    if (trimmed.length > MAX_LENGTH) {
      return err({
        kind: "InvalidInvoiceNumber",
        reason: "TooLong",
        length: trimmed.length,
        max: MAX_LENGTH,
      });
    }
    if (!ALLOWED.test(trimmed)) {
      return err({
        kind: "InvalidInvoiceNumber",
        reason: "InvalidCharset",
        value: trimmed,
      });
    }
    return ok(new InvoiceNumber(trimmed));
  }

  equals(other: InvoiceNumber): boolean {
    return this.value === other.value;
  }
}
