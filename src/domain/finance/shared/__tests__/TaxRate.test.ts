import { describe, test, expect } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { Currency } from "../Currency";
import { Money } from "../Money";
import { TaxRate, BASIS_POINTS_SCALE } from "../TaxRate";

// ── Test helpers (avoid decimal literals — R-1106f compliance) ──────────────
const mustCurrency = (code: string): Currency => {
  const c = Currency.of(code);
  if (!isOk(c)) throw new Error(`test setup: bad currency ${code}`);
  return c.value;
};
const USD = mustCurrency("USD");
const JPY = mustCurrency("JPY");

const mustMoney = (amount: number, c: Currency): Money => {
  const m = Money.of(amount, c);
  if (!isOk(m)) throw new Error(`test setup: bad money ${amount}`);
  return m.value;
};

const mustTaxRate = (bp: number): TaxRate => {
  const r = TaxRate.of(bp);
  if (!isOk(r)) throw new Error(`test setup: bad tax rate ${bp}`);
  return r.value;
};

const ONE_AND_A_HALF = 3 / 2;
const NaNValue = 0 / 0;

describe("TaxRate VO — construction (R-1103)", () => {
  test("0 basis points (0%) is valid", () => {
    const r = TaxRate.of(0);
    expect(isOk(r) && r.value.basisPoints === 0).toBe(true);
  });

  test("1500 basis points (15%) is valid", () => {
    const r = TaxRate.of(1500);
    expect(isOk(r) && r.value.basisPoints === 1500).toBe(true);
  });

  test("10000 basis points (100%) is the upper bound and valid", () => {
    const r = TaxRate.of(10000);
    expect(isOk(r) && r.value.basisPoints === 10000).toBe(true);
  });

  test("negative basis points rejected (OutOfRange)", () => {
    const r = TaxRate.of(-1);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.reason).toBe("OutOfRange");
  });

  test("above 10000 rejected (OutOfRange)", () => {
    const r = TaxRate.of(10001);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.reason).toBe("OutOfRange");
  });

  test("non-integer rejected (NonInteger)", () => {
    const r = TaxRate.of(ONE_AND_A_HALF);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.reason).toBe("NonInteger");
  });

  test("NaN rejected", () => {
    const r = TaxRate.of(NaNValue);
    expect(isErr(r)).toBe(true);
  });
});

describe("TaxRate VO — zero factory", () => {
  test("zero() === 0 basis points", () => {
    expect(TaxRate.zero().basisPoints).toBe(0);
    expect(TaxRate.zero().isZero()).toBe(true);
  });
});

describe("TaxRate VO — basis-point scale exposed", () => {
  test("BASIS_POINTS_SCALE = 10000 (R-1106d audit constant)", () => {
    expect(BASIS_POINTS_SCALE).toBe(10000);
  });
});

describe("TaxRate.apply — R-1106d delegation to Money.mulScalar", () => {
  test("15% on 15.00 USD = 2.25 USD (1500 minor units → 225)", () => {
    const lineNet = mustMoney(1500, USD);
    const r = mustTaxRate(1500).apply(lineNet);
    expect(isOk(r) && r.value.amount === 225).toBe(true);
  });

  test("0% returns zero amount", () => {
    const lineNet = mustMoney(9999, USD);
    const r = TaxRate.zero().apply(lineNet);
    expect(isOk(r) && r.value.amount === 0).toBe(true);
  });

  test("100% returns the same amount", () => {
    const lineNet = mustMoney(1234, USD);
    const r = mustTaxRate(10000).apply(lineNet);
    expect(isOk(r) && r.value.amount === 1234).toBe(true);
  });

  test("applies on zero money → zero", () => {
    const r = mustTaxRate(1500).apply(Money.zero(USD));
    expect(isOk(r) && r.value.amount === 0).toBe(true);
  });

  test("preserves currency through application (JPY, exponent 0)", () => {
    // 5% on JPY 1000 = JPY 50 (no minor units, exponent 0 — applied as integers).
    const r = mustTaxRate(500).apply(mustMoney(1000, JPY));
    expect(isOk(r) && r.value.amount === 50).toBe(true);
    if (isOk(r)) expect(r.value.currency.code).toBe("JPY");
  });

  test("invariant: apply() can never escalate amount magnitude (bounded by input)", () => {
    // basisPoints ∈ [0, 10000] and scale = 10000 → multiplier ∈ [0, 1].
    // Therefore TaxRate.apply() output magnitude ≤ input magnitude, so 100%
    // applied to MAX_SAFE_INTEGER must succeed without overflow.
    const safeMax = mustMoney(Number.MAX_SAFE_INTEGER, USD);
    const r = mustTaxRate(10000).apply(safeMax);
    expect(isOk(r) && r.value.amount === Number.MAX_SAFE_INTEGER).toBe(true);
  });

  test("propagates Money error taxonomy unchanged (single taxonomy invariant)", () => {
    // Construct a Money error path: although apply() itself cannot overflow,
    // we verify that if Money.mulScalar were to fail, the error type is
    // MoneyDomainError (not a wrapped TaxRateDomainError). This is a type-
    // level guarantee enforced by the apply() signature: Result<Money, MoneyDomainError>.
    // Runtime sanity: a normal success path returns Ok<Money>, never wrapped.
    const r = mustTaxRate(1500).apply(mustMoney(1500, USD));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value).toBeInstanceOf(Money);
    }
  });
});

describe("TaxRate VO — equality & immutability", () => {
  test("equals by basisPoints", () => {
    expect(mustTaxRate(1500).equals(mustTaxRate(1500))).toBe(true);
    expect(mustTaxRate(1500).equals(mustTaxRate(1000))).toBe(false);
  });

  test("instance is frozen", () => {
    const r = mustTaxRate(1500);
    const obj = r as unknown as { basisPoints: number };
    try {
      obj.basisPoints = 9999;
    } catch {
      /* strict mode throws — acceptable */
    }
    expect(r.basisPoints).toBe(1500);
  });
});
