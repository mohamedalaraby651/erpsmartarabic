import { describe, test, expect } from "vitest";
import { isOk, isErr, unsafeId } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";
import { InvoiceNumber } from "../InvoiceNumber";
import { Invoice } from "../Invoice";
import type { InvoiceId, CustomerId } from "../Invoice" with { "resolution-mode": "import" };

// ── Helpers (no decimal literals, R-1106f) ──────────────────────────────────
const mustCurrency = (code: string): Currency => {
  const c = Currency.of(code);
  if (!isOk(c)) throw new Error(`bad currency ${code}`);
  return c.value;
};
const USD = mustCurrency("USD");
const EUR = mustCurrency("EUR");

const mustMoney = (amount: number, c: Currency): Money => {
  const m = Money.of(amount, c);
  if (!isOk(m)) throw new Error(`bad money`);
  return m.value;
};

const mustRate = (bp: number): TaxRate => {
  const r = TaxRate.of(bp);
  if (!isOk(r)) throw new Error(`bad rate`);
  return r.value;
};

const mustNumber = (s: string): InvoiceNumber => {
  const r = InvoiceNumber.of(s);
  if (!isOk(r)) throw new Error(`bad number`);
  return r.value;
};

const mustLine = (qty: number, amount: number, bp: number, c: Currency = USD): InvoiceLine => {
  const r = InvoiceLine.of({
    qty,
    unitPrice: mustMoney(amount, c),
    taxRate: mustRate(bp),
  });
  if (!isOk(r)) throw new Error(`bad line`);
  return r.value;
};

const idA = unsafeId<"InvoiceId">("inv-1") as InvoiceId;
const idB = unsafeId<"InvoiceId">("inv-2") as InvoiceId;
const cust = unsafeId<"CustomerId">("cus-1") as CustomerId;

const mustInvoice = (currency: Currency = USD, customerId?: CustomerId): Invoice => {
  const r = Invoice.create({
    id: idA,
    number: mustNumber("INV-2026-0001"),
    currency,
    customerId,
  });
  if (!isOk(r)) throw new Error("bad invoice");
  return r.value;
};

describe("Invoice — construction", () => {
  test("starts in Draft with no lines", () => {
    const inv = mustInvoice();
    expect(inv.getStatus()).toBe("Draft");
    expect(inv.lineCount()).toBe(0);
    expect(inv.getLines()).toEqual([]);
    expect(inv.getCurrency().equals(USD)).toBe(true);
    expect(inv.getNumber().value).toBe("INV-2026-0001");
    expect(inv.getCustomerId()).toBeUndefined();
  });

  test("preserves injected customerId without mutation", () => {
    const inv = mustInvoice(USD, cust);
    expect(inv.getCustomerId()).toBe(cust);
  });

  test("exposes identity via Entity.id (no self-minting)", () => {
    const inv = mustInvoice();
    expect(inv.id).toBe(idA);
    // Distinct ids are distinct (sanity)
    const other = Invoice.create({
      id: idB,
      number: mustNumber("INV-2026-0002"),
      currency: USD,
    });
    if (!isOk(other)) throw new Error("nope");
    expect(other.value.id).toBe(idB);
  });
});

describe("Invoice — structural edits (Draft only)", () => {
  test("addLine accepts matching currency", () => {
    const inv = mustInvoice();
    const r = inv.addLine(mustLine(2, 1000, 1000));
    expect(isOk(r)).toBe(true);
    expect(inv.lineCount()).toBe(1);
  });

  test("addLine rejects mismatched currency (R-1101 at aggregate edge)", () => {
    const inv = mustInvoice(USD);
    const r = inv.addLine(mustLine(1, 500, 0, EUR));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("LineCurrencyMismatch");
  });

  test("removeLine validates index and shrinks", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    inv.addLine(mustLine(1, 200, 0));
    const ok1 = inv.removeLine(0);
    expect(isOk(ok1)).toBe(true);
    expect(inv.lineCount()).toBe(1);
    const oob = inv.removeLine(5);
    expect(isErr(oob)).toBe(true);
    if (!isErr(oob)) return;
    expect(oob.error.kind).toBe("LineIndexOutOfRange");
  });

  test("getLines returns a frozen snapshot (defensive copy)", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    const snap = inv.getLines();
    expect(Object.isFrozen(snap)).toBe(true);
    expect(snap.length).toBe(1);
  });

  test("addLine locked after issue()", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    expect(isOk(inv.issue())).toBe(true);
    const r = inv.addLine(mustLine(1, 50, 0));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("StructuralEditLocked");
  });

  test("removeLine locked after issue()", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    inv.issue();
    const r = inv.removeLine(0);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("StructuralEditLocked");
  });
});

describe("Invoice — lifecycle state machine", () => {
  test("Draft → Issued requires at least one line", () => {
    const inv = mustInvoice();
    const r = inv.issue();
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("EmptyInvoice");
  });

  test("Draft → Issued → Paid", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    expect(isOk(inv.issue())).toBe(true);
    expect(inv.getStatus()).toBe("Issued");
    expect(isOk(inv.markPaid())).toBe(true);
    expect(inv.getStatus()).toBe("Paid");
  });

  test("markPaid rejected from Draft", () => {
    const inv = mustInvoice();
    const r = inv.markPaid();
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("InvalidStateTransition");
  });

  test("cancel allowed from Draft and Issued; rejected from terminal states", () => {
    const a = mustInvoice();
    expect(isOk(a.cancel())).toBe(true);
    expect(a.getStatus()).toBe("Cancelled");
    expect(isErr(a.cancel())).toBe(true);
    expect(isErr(a.issue())).toBe(true);

    const b = mustInvoice();
    b.addLine(mustLine(1, 100, 0));
    b.issue();
    expect(isOk(b.cancel())).toBe(true);

    const c = mustInvoice();
    c.addLine(mustLine(1, 100, 0));
    c.issue();
    c.markPaid();
    const r = c.cancel();
    expect(isErr(r)).toBe(true);
  });
});

describe("Invoice — aggregation (sole site for totals)", () => {
  test("empty invoice totals to zero in its currency", () => {
    const inv = mustInvoice();
    const n = inv.totalNet();
    const t = inv.totalTax();
    const g = inv.totalGross();
    if (!isOk(n) || !isOk(t) || !isOk(g)) throw new Error("totals failed");
    expect(n.value.amount).toBe(0);
    expect(t.value.amount).toBe(0);
    expect(g.value.amount).toBe(0);
    expect(n.value.currency.equals(USD)).toBe(true);
  });

  test("net = Σ qty·unitPrice; tax = Σ rate(net); gross = net + tax", () => {
    const inv = mustInvoice();
    // line1: 3 × 1000 minor = 3000; tax 10% = 300; gross 3300
    inv.addLine(mustLine(3, 1000, 1000));
    // line2: 2 × 250 = 500; tax 15% = 75; gross 575
    inv.addLine(mustLine(2, 250, 1500));
    const n = inv.totalNet();
    const t = inv.totalTax();
    const g = inv.totalGross();
    if (!isOk(n) || !isOk(t) || !isOk(g)) throw new Error("totals failed");
    expect(n.value.amount).toBe(3500);
    expect(t.value.amount).toBe(375);
    expect(g.value.amount).toBe(3875);
  });

  test("totals = sum of per-line rounded values (rounding happens per line, never on the aggregate)", () => {
    const inv = mustInvoice();
    // Each line: 1 × 3 minor at bp=5000 (50%) → 3·5000/10000 = 1.5 → HAFZ → 2.
    // Per-line sum: 2 + 2 = 4. Re-rounding the aggregate net would give
    // (3+3)·5000/10000 = 3 — proving the aggregate must NOT re-round.
    inv.addLine(mustLine(1, 3, 5000));
    inv.addLine(mustLine(1, 3, 5000));
    const t = inv.totalTax();
    if (!isOk(t)) throw new Error("totals failed");
    expect(t.value.amount).toBe(4);
  });

  test("totals recomputed live; no derived state stored", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    const a = inv.totalGross();
    if (!isOk(a)) throw new Error("a");
    expect(a.value.amount).toBe(100);
    inv.addLine(mustLine(2, 50, 0));
    const b = inv.totalGross();
    if (!isOk(b)) throw new Error("b");
    expect(b.value.amount).toBe(200);
  });
});

describe("Invoice — design boundary guards", () => {
  test("InvoiceLine exposes no aggregation methods (line stays a VO)", () => {
    const line = mustLine(1, 100, 0);
    const proto = Object.getPrototypeOf(line) as Record<string, unknown>;
    const forbidden = ["sum", "total", "subtotal", "totalGross", "totalNet", "totalTax"];
    for (const name of forbidden) {
      expect(proto[name]).toBeUndefined();
    }
  });

  test("Invoice exposes no public mutator for currency (immutable post-construction)", () => {
    const inv = mustInvoice();
    const proto = Object.getPrototypeOf(inv) as Record<string, unknown>;
    expect(proto["setCurrency"]).toBeUndefined();
    expect(proto["changeCurrency"]).toBeUndefined();
  });
});
