import { describe, test, expect } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";

// ── Test helpers (no decimal literals — R-1106f compliance) ────────────────
const mustCurrency = (code: string): Currency => {
  const c = Currency.of(code);
  if (!isOk(c)) throw new Error(`bad currency ${code}`);
  return c.value;
};
const USD = mustCurrency("USD");
const EUR = mustCurrency("EUR");

const mustMoney = (amount: number, c: Currency): Money => {
  const m = Money.of(amount, c);
  if (!isOk(m)) throw new Error(`bad money ${amount}`);
  return m.value;
};

const mustRate = (bp: number): TaxRate => {
  const r = TaxRate.of(bp);
  if (!isOk(r)) throw new Error(`bad rate ${bp}`);
  return r.value;
};

const mustLine = (
  qty: number,
  amount: number,
  bp: number,
  c: Currency = USD,
): InvoiceLine => {
  const r = InvoiceLine.of({
    qty,
    unitPrice: mustMoney(amount, c),
    taxRate: mustRate(bp),
  });
  if (!isOk(r)) throw new Error(`bad line`);
  return r.value;
};

const ONE_AND_A_HALF = 3 / 2;

describe("InvoiceLine — construction invariants (R-1103, R-1104)", () => {
  test("valid line: qty=2, unitPrice=1500 USD, tax=15%", () => {
    const r = InvoiceLine.of({
      qty: 2,
      unitPrice: mustMoney(1500, USD),
      taxRate: mustRate(1500),
    });
    expect(isOk(r)).toBe(true);
  });

  test("rejects qty = 0 (NonPositive)", () => {
    const r = InvoiceLine.of({
      qty: 0,
      unitPrice: mustMoney(1500, USD),
      taxRate: mustRate(0),
    });
    expect(
      isErr(r) &&
        r.error.kind === "InvalidQuantity" &&
        r.error.reason === "NonPositive",
    ).toBe(true);
  });

  test("rejects qty < 0 (NonPositive)", () => {
    const r = InvoiceLine.of({
      qty: -1,
      unitPrice: mustMoney(1500, USD),
      taxRate: mustRate(0),
    });
    expect(
      isErr(r) &&
        r.error.kind === "InvalidQuantity" &&
        r.error.reason === "NonPositive",
    ).toBe(true);
  });

  test("rejects non-integer qty (NonInteger)", () => {
    const r = InvoiceLine.of({
      qty: ONE_AND_A_HALF,
      unitPrice: mustMoney(1500, USD),
      taxRate: mustRate(0),
    });
    expect(
      isErr(r) &&
        r.error.kind === "InvalidQuantity" &&
        r.error.reason === "NonInteger",
    ).toBe(true);
  });

  test("rejects negative unit price (NegativeUnitPrice)", () => {
    const r = InvoiceLine.of({
      qty: 1,
      unitPrice: mustMoney(-100, USD),
      taxRate: mustRate(0),
    });
    expect(
      isErr(r) &&
        r.error.kind === "NegativeUnitPrice" &&
        r.error.currencyCode === "USD",
    ).toBe(true);
  });

  test("accepts zero unit price (>=0 is valid)", () => {
    const r = InvoiceLine.of({
      qty: 1,
      unitPrice: mustMoney(0, USD),
      taxRate: mustRate(0),
    });
    expect(isOk(r)).toBe(true);
  });

  test("instance is frozen", () => {
    const line = mustLine(1, 100, 0);
    expect(Object.isFrozen(line)).toBe(true);
  });
});

describe("InvoiceLine — line-local computations", () => {
  test("lineNet = unitPrice * qty (exact integer scaling)", () => {
    const line = mustLine(3, 1500, 0);
    const net = line.lineNet();
    expect(isOk(net) && net.value.amount === 4500).toBe(true);
    expect(isOk(net) && net.value.currency.code === "USD").toBe(true);
  });

  test("lineTax = mulScalar(net, basisPoints, 10000), HAFZ rounding via Money", () => {
    // net = 1 * 333 = 333. tax @ 15% = round(333*1500/10000) = round(49.95) = 50.
    const line = mustLine(1, 333, 1500);
    const tax = line.lineTax();
    expect(isOk(tax) && tax.value.amount === 50).toBe(true);
  });

  test("lineGross = lineNet + lineTax (exact integer add)", () => {
    const line = mustLine(2, 1000, 1500); // net=2000, tax=300, gross=2300
    const gross = line.lineGross();
    expect(isOk(gross) && gross.value.amount === 2300).toBe(true);
  });

  test("zero tax rate yields lineTax = 0 and lineGross = lineNet", () => {
    const line = mustLine(4, 250, 0);
    const tax = line.lineTax();
    const gross = line.lineGross();
    expect(isOk(tax) && tax.value.amount === 0).toBe(true);
    expect(isOk(gross) && gross.value.amount === 1000).toBe(true);
  });

  test("zero unit price yields all-zero computations", () => {
    const line = mustLine(7, 0, 1500);
    const net = line.lineNet();
    const tax = line.lineTax();
    const gross = line.lineGross();
    expect(isOk(net) && net.value.amount === 0).toBe(true);
    expect(isOk(tax) && tax.value.amount === 0).toBe(true);
    expect(isOk(gross) && gross.value.amount === 0).toBe(true);
  });

  test("currency is preserved through all computations", () => {
    const line = mustLine(2, 999, 2000, EUR);
    const net = line.lineNet();
    const tax = line.lineTax();
    const gross = line.lineGross();
    expect(isOk(net) && net.value.currency.code === "EUR").toBe(true);
    expect(isOk(tax) && tax.value.currency.code === "EUR").toBe(true);
    expect(isOk(gross) && gross.value.currency.code === "EUR").toBe(true);
  });
});

describe("InvoiceLine — error propagation & boundary", () => {
  test("Money overflow in lineNet surfaces NonIntegerMoney from kernel", () => {
    // unitPrice near MAX_SAFE_INTEGER; qty=2 → product exceeds MAX_SAFE
    const huge = mustMoney(Number.MAX_SAFE_INTEGER, USD);
    const line = InvoiceLine.of({
      qty: 2,
      unitPrice: huge,
      taxRate: mustRate(0),
    });
    if (!isOk(line)) throw new Error("setup");
    const net = line.value.lineNet();
    expect(isErr(net) && net.error.kind === "NonIntegerMoney").toBe(true);
  });

  test("lineGross does not double-compute taxRate.apply on cached net", () => {
    // Behavioural assertion: result must equal net+tax computed separately.
    const line = mustLine(7, 731, 1750);
    const net = line.lineNet();
    const tax = line.lineTax();
    const gross = line.lineGross();
    if (!isOk(net) || !isOk(tax) || !isOk(gross)) throw new Error("setup");
    expect(gross.value.amount).toBe(net.value.amount + tax.value.amount);
  });

  test("InvoiceLine performs no aggregation: exposes no sum/total methods", () => {
    const line = mustLine(1, 100, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyLine = line as any;
    expect(typeof anyLine.subtotal).toBe("undefined");
    expect(typeof anyLine.totalGross).toBe("undefined");
    expect(typeof anyLine.sum).toBe("undefined");
  });
});
