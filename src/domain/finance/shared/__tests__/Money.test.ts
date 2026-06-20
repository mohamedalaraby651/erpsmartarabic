import { describe, test, expect } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { Currency } from "../Currency";
import { Money } from "../Money";

// ── Helpers (test-only; avoid decimal literals to satisfy R-1106f) ──────────
const mustCurrency = (code: string): Currency => {
  const c = Currency.of(code);
  if (!isOk(c)) throw new Error(`test setup: bad currency ${code}`);
  return c.value;
};
const USD = mustCurrency("USD");
const EUR = mustCurrency("EUR");
const JPY = mustCurrency("JPY");
const KWD = mustCurrency("KWD");

const mustMoney = (amount: number, c: Currency): Money => {
  const m = Money.of(amount, c);
  if (!isOk(m)) throw new Error(`test setup: bad money ${amount}`);
  return m.value;
};

// Build non-integer values via division (no decimal literals in source).
const ONE_AND_A_HALF = 3 / 2; // 1.5
const NaNValue = 0 / 0;

describe("Money VO — construction (R-1106a)", () => {
  test("of(0, USD) ok", () => {
    const m = Money.of(0, USD);
    expect(isOk(m)).toBe(true);
    if (isOk(m)) expect(m.value.amount).toBe(0);
  });

  test("of(1500, USD) ok (= 15.00 USD)", () => {
    const m = Money.of(1500, USD);
    expect(isOk(m) && m.value.amount === 1500).toBe(true);
  });

  test("non-integer amount rejected", () => {
    const m = Money.of(ONE_AND_A_HALF, USD);
    expect(isErr(m)).toBe(true);
    if (isErr(m)) expect(m.error.kind).toBe("NonIntegerMoney");
  });

  test("NaN amount rejected", () => {
    const m = Money.of(NaNValue, USD);
    expect(isErr(m)).toBe(true);
  });

  test("amount beyond MAX_SAFE_INTEGER rejected", () => {
    const m = Money.of(Number.MAX_SAFE_INTEGER + 1, USD);
    expect(isErr(m)).toBe(true);
    if (isErr(m)) expect(m.error.kind).toBe("NonIntegerMoney");
  });
});

describe("Money VO — zero", () => {
  test("zero(USD) is 0 USD", () => {
    const z = Money.zero(USD);
    expect(z.amount).toBe(0);
    expect(z.currency.code).toBe("USD");
  });

  test("zero(JPY) carries JPY", () => {
    expect(Money.zero(JPY).currency.code).toBe("JPY");
  });
});

describe("Money VO — add (R-1106b)", () => {
  test("same currency sums correctly", () => {
    const r = mustMoney(1500, USD).add(mustMoney(250, USD));
    expect(isOk(r) && r.value.amount === 1750).toBe(true);
  });

  test("currency mismatch → CurrencyMismatch", () => {
    const r = mustMoney(100, USD).add(mustMoney(100, EUR));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe("CurrencyMismatch");
      if (r.error.kind === "CurrencyMismatch") {
        expect(r.error.left).toBe("USD");
        expect(r.error.right).toBe("EUR");
      }
    }
  });

  test("overflow → NonIntegerMoney", () => {
    const big = mustMoney(Number.MAX_SAFE_INTEGER, USD);
    const r = big.add(mustMoney(1, USD));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe("NonIntegerMoney");
  });

  test("adding zero is identity", () => {
    const r = mustMoney(1500, USD).add(Money.zero(USD));
    expect(isOk(r) && r.value.amount === 1500).toBe(true);
  });
});

describe("Money VO — sub (R-1106b)", () => {
  test("same currency subtracts (negative allowed)", () => {
    const r = mustMoney(100, USD).sub(mustMoney(300, USD));
    expect(isOk(r) && r.value.amount === -200).toBe(true);
  });

  test("currency mismatch rejected", () => {
    const r = mustMoney(100, USD).sub(mustMoney(50, EUR));
    expect(isErr(r)).toBe(true);
  });

  test("underflow → NonIntegerMoney", () => {
    const neg = mustMoney(-Number.MAX_SAFE_INTEGER, USD);
    const r = neg.sub(mustMoney(1, USD));
    expect(isErr(r)).toBe(true);
  });
});

describe("Money VO — mulScalar happy paths (R-1106c/d)", () => {
  test("15% tax on 15.00 USD: 1500 * 15 / 100 = 225", () => {
    const r = mustMoney(1500, USD).mulScalar(15, 100);
    expect(isOk(r) && r.value.amount === 225).toBe(true);
  });

  test("basisPoints path: 1500 * 1500 / 10000 = 225", () => {
    const r = mustMoney(1500, USD).mulScalar(1500, 10000);
    expect(isOk(r) && r.value.amount === 225).toBe(true);
  });

  test("half-away-from-zero (positive tie): 1 * 1 / 2 = 1", () => {
    const r = mustMoney(1, USD).mulScalar(1, 2);
    expect(isOk(r) && r.value.amount === 1).toBe(true);
  });

  test("half-away-from-zero on negative tie: -1 * 1 / 2 = -1 (Amendment A1)", () => {
    // BigInt HAFZ is symmetric; corrects the JS Math.round(-0.5)===0 quirk.
    const r = mustMoney(-1, USD).mulScalar(1, 2);
    expect(isOk(r) && r.value.amount === -1).toBe(true);
  });

  test("BigInt intermediate: 10^14 * 10^5 / 10 stays exact (overflow window closed)", () => {
    // Intermediate product = 10^19 > MAX_SAFE_INTEGER (~9.007e15).
    // With IEEE-754 this would lose precision before division; BigInt is exact.
    // Final result = 10^18 which is also > MAX_SAFE_INTEGER, so we expect
    // a clean NonIntegerMoney rejection at the Number boundary (not silent drift).
    const r = mustMoney(10 ** 14, USD).mulScalar(10 ** 5, 10);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe("NonIntegerMoney");
  });

  test("BigInt intermediate: large product reducing back into safe range is exact", () => {
    // amount=10^12, num=10^6 → product 10^18 (unsafe), /10^6 → 10^12 (safe).
    // Under IEEE-754 the intermediate would corrupt the final value; BigInt preserves it exactly.
    const r = mustMoney(10 ** 12, USD).mulScalar(10 ** 6, 10 ** 6);
    expect(isOk(r) && r.value.amount === 10 ** 12).toBe(true);
  });

  test("JPY (exponent 0): 100 * 5 / 100 = 5", () => {
    const r = mustMoney(100, JPY).mulScalar(5, 100);
    expect(isOk(r) && r.value.amount === 5).toBe(true);
  });

  test("KWD (exponent 3): 1000 * 75 / 1000 = 75", () => {
    const r = mustMoney(1000, KWD).mulScalar(75, 1000);
    expect(isOk(r) && r.value.amount === 75).toBe(true);
  });
});

describe("Money VO — mulScalar guards (R-1106c)", () => {
  test("zero denominator", () => {
    const r = mustMoney(1500, USD).mulScalar(15, 0);
    expect(isErr(r)).toBe(true);
    if (isErr(r) && r.error.kind === "InvalidScalar") {
      expect(r.error.reason).toBe("ZeroDenominator");
    }
  });

  test("non-integer numerator", () => {
    const r = mustMoney(1500, USD).mulScalar(ONE_AND_A_HALF, 100);
    expect(isErr(r)).toBe(true);
    if (isErr(r) && r.error.kind === "InvalidScalar") {
      expect(r.error.reason).toBe("NonInteger");
    }
  });

  test("NaN denominator", () => {
    const r = mustMoney(1500, USD).mulScalar(15, NaNValue);
    expect(isErr(r)).toBe(true);
    if (isErr(r) && r.error.kind === "InvalidScalar") {
      expect(r.error.reason).toBe("NonInteger");
    }
  });

  test("unsafe numerator magnitude", () => {
    const r = mustMoney(1500, USD).mulScalar(
      Number.MAX_SAFE_INTEGER + 2,
      100,
    );
    // MAX_SAFE_INTEGER + 2 is no longer an exact integer in IEEE-754,
    // so Number.isInteger returns false → NonInteger.
    expect(isErr(r)).toBe(true);
  });

  test("product overflow → NonIntegerMoney", () => {
    // amount * numerator escapes safe-integer space → rounded result fails of()
    const r = mustMoney(Number.MAX_SAFE_INTEGER, USD).mulScalar(2, 1);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe("NonIntegerMoney");
  });
});

describe("Money VO — predicates & immutability", () => {
  test("eq matches by amount + currency code", () => {
    expect(mustMoney(100, USD).eq(mustMoney(100, USD))).toBe(true);
    expect(mustMoney(100, USD).eq(mustMoney(100, EUR))).toBe(false);
    expect(mustMoney(100, USD).eq(mustMoney(101, USD))).toBe(false);
  });

  test("isZero / isPositive / isNegative", () => {
    expect(Money.zero(USD).isZero()).toBe(true);
    expect(mustMoney(1, USD).isPositive()).toBe(true);
    expect(mustMoney(-1, USD).isNegative()).toBe(true);
  });

  test("instance is frozen (mutation does not stick)", () => {
    const m = mustMoney(100, USD);
    const obj = m as unknown as { amount: number };
    try {
      obj.amount = 999;
    } catch {
      /* strict mode throws — acceptable */
    }
    expect(m.amount).toBe(100);
  });

  test("currency isolation: USD+EUR short-circuits with CurrencyMismatch", () => {
    const r = mustMoney(100, USD).add(mustMoney(100, EUR));
    expect(isErr(r) && r.error.kind === "CurrencyMismatch").toBe(true);
  });
});
