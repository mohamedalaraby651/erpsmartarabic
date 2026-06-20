/**
 * TaxRate — Value Object (ADR-0011 §3 R-1103, §4 R-1106d).
 *
 * Pure integer scalar in basis points: `basisPoints ∈ [0, 10000]`
 * (where 10000 = 100%). No rounding logic lives here — application
 * delegates to `Money.mulScalar` so the single rounding boundary
 * remains exactly one site in the finance domain.
 *
 * Pure: no I/O, no time, no infrastructure.
 */

import { ok, err } from "@/shared-kernel";
import type { Result } from "@/shared-kernel";
import { Money } from "./Money";
import type { MoneyDomainError } from "./Money";

/** Basis-point scale denominator (R-1106d). Exposed for audit traceability. */
export const BASIS_POINTS_SCALE = 10000;

export type TaxRateDomainError = {
  readonly kind: "InvalidBasisPoints";
  readonly basisPoints: number;
  readonly reason: "NonInteger" | "OutOfRange";
};

export class TaxRate {
  public readonly basisPoints: number;

  private constructor(basisPoints: number) {
    this.basisPoints = basisPoints;
    Object.freeze(this);
  }

  // ─── Factories ────────────────────────────────────────────────────────────

  static of(basisPoints: number): Result<TaxRate, TaxRateDomainError> {
    if (!Number.isInteger(basisPoints)) {
      return err({
        kind: "InvalidBasisPoints",
        basisPoints,
        reason: "NonInteger",
      });
    }
    if (basisPoints < 0 || basisPoints > BASIS_POINTS_SCALE) {
      return err({
        kind: "InvalidBasisPoints",
        basisPoints,
        reason: "OutOfRange",
      });
    }
    return ok(new TaxRate(basisPoints));
  }

  static zero(): TaxRate {
    return new TaxRate(0);
  }

  // ─── Application (R-1106d) ────────────────────────────────────────────────

  /**
   * Apply tax to a Money amount. Delegates entirely to `Money.mulScalar` —
   * TaxRate performs no rounding and no float arithmetic. Errors from the
   * Money layer propagate unchanged to preserve a single error taxonomy.
   */
  apply(money: Money): Result<Money, MoneyDomainError> {
    return money.mulScalar(this.basisPoints, BASIS_POINTS_SCALE);
  }

  // ─── Predicates ───────────────────────────────────────────────────────────

  equals(other: TaxRate): boolean {
    return this.basisPoints === other.basisPoints;
  }

  isZero(): boolean {
    return this.basisPoints === 0;
  }
}
