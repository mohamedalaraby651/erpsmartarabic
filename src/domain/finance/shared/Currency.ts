/**
 * Currency — Value Object (ADR-0011 §3, R-1101 / R-1106).
 *
 * Domain-locked subset of ISO 4217 currencies used by Invoice aggregate.
 * Each currency exposes its minor-unit exponent so Money can enforce
 * integer-only arithmetic (no float leakage).
 *
 * Pure: no I/O, no time, no math libs, no infrastructure.
 */

import { Result, ok, err } from "@/shared-kernel";
import type { Result as ResultT } from "@/shared-kernel";

export type CurrencyCode =
  | "USD"
  | "EUR"
  | "SAR"
  | "AED"
  | "EGP"
  | "KWD"
  | "BHD"
  | "JOD"
  | "OMR"
  | "QAR"
  | "JPY";

export type CurrencyExponent = 0 | 2 | 3;

const CURRENCY_TABLE: Readonly<Record<CurrencyCode, CurrencyExponent>> =
  Object.freeze({
    USD: 2,
    EUR: 2,
    SAR: 2,
    AED: 2,
    EGP: 2,
    KWD: 3,
    BHD: 3,
    JOD: 3,
    OMR: 3,
    QAR: 2,
    JPY: 0,
  });

export type CurrencyDomainError = {
  readonly kind: "UnknownCurrency";
  readonly input: string;
};

export class Currency {
  public readonly code: CurrencyCode;
  public readonly exponent: CurrencyExponent;

  private constructor(code: CurrencyCode, exponent: CurrencyExponent) {
    this.code = code;
    this.exponent = exponent;
    Object.freeze(this);
  }

  static of(input: string): ResultT<Currency, CurrencyDomainError> {
    const normalized = input.trim().toUpperCase();
    const exponent = (CURRENCY_TABLE as Record<string, CurrencyExponent | undefined>)[
      normalized
    ];

    if (exponent === undefined) {
      return err({ kind: "UnknownCurrency", input });
    }

    return ok(new Currency(normalized as CurrencyCode, exponent));
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}

// Re-export Result namespace for ergonomic call sites if needed downstream.
export { Result };
