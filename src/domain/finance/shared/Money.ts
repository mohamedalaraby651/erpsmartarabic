/**
 * Money — Financial Arithmetic Kernel (ADR-0011 §4, R-1106a..f).
 *
 * Integer-only minor-unit arithmetic. The single rounding boundary in the
 * finance domain lives inside `mulScalar` (allow-listed `Math.round`).
 *
 * Pure VO: no I/O, no time, no infrastructure. Currency uniformity is
 * enforced on every binary op. All failures are values (Result), never throws.
 */

import { ok, err } from "@/shared-kernel";
import type { Result } from "@/shared-kernel";
import { Currency } from "./Currency";

export type MoneyDomainError =
  | {
      readonly kind: "NonIntegerMoney";
      readonly amount: number;
      readonly currencyCode: string;
    }
  | {
      readonly kind: "CurrencyMismatch";
      readonly left: string;
      readonly right: string;
    }
  | {
      readonly kind: "InvalidScalar";
      readonly numerator: number;
      readonly denominator: number;
      readonly reason: "NonInteger" | "ZeroDenominator" | "Unsafe";
    };

const isSafeInteger = (n: number): boolean =>
  Number.isInteger(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER;

export class Money {
  public readonly amount: number;
  public readonly currency: Currency;

  private constructor(amount: number, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }

  // ─── Factories ────────────────────────────────────────────────────────────

  static of(
    amount: number,
    currency: Currency,
  ): Result<Money, MoneyDomainError> {
    if (!isSafeInteger(amount)) {
      return err({
        kind: "NonIntegerMoney",
        amount,
        currencyCode: currency.code,
      });
    }
    return ok(new Money(amount, currency));
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  // ─── Arithmetic (R-1106b) ─────────────────────────────────────────────────

  add(other: Money): Result<Money, MoneyDomainError> {
    if (!this.currency.equals(other.currency)) {
      return err({
        kind: "CurrencyMismatch",
        left: this.currency.code,
        right: other.currency.code,
      });
    }
    return Money.of(this.amount + other.amount, this.currency);
  }

  sub(other: Money): Result<Money, MoneyDomainError> {
    if (!this.currency.equals(other.currency)) {
      return err({
        kind: "CurrencyMismatch",
        left: this.currency.code,
        right: other.currency.code,
      });
    }
    return Money.of(this.amount - other.amount, this.currency);
  }

  /**
   * R-1106c — the ONLY rounding boundary in the finance domain.
   * `Math.round` is allow-listed by R-1106f at this exact call site.
   *
   * Note: JS `Math.round` is half-toward-+Infinity (positive ties round up,
   * negative ties also round toward zero, e.g. round(-0.5) === 0).
   * ADR-0011 §4 mandates this exact formula; downstream tax computation only
   * operates on non-negative line nets, so positive half-away-from-zero holds.
   */
  mulScalar(
    numerator: number,
    denominator: number,
  ): Result<Money, MoneyDomainError> {
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
      return err({
        kind: "InvalidScalar",
        numerator,
        denominator,
        reason: "NonInteger",
      });
    }
    if (denominator === 0) {
      return err({
        kind: "InvalidScalar",
        numerator,
        denominator,
        reason: "ZeroDenominator",
      });
    }
    if (
      Math.abs(numerator) > Number.MAX_SAFE_INTEGER ||
      Math.abs(denominator) > Number.MAX_SAFE_INTEGER
    ) {
      return err({
        kind: "InvalidScalar",
        numerator,
        denominator,
        reason: "Unsafe",
      });
    }

    const rounded = Math.round((this.amount * numerator) / denominator);
    return Money.of(rounded, this.currency);
  }

  // ─── Predicates ───────────────────────────────────────────────────────────

  eq(other: Money): boolean {
    return (
      this.currency.equals(other.currency) && this.amount === other.amount
    );
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  isNegative(): boolean {
    return this.amount < 0;
  }
}
