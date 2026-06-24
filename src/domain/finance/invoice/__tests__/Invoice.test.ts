import { describe, test, expect } from "vitest";
import { isOk, isErr, unsafeId, Instant } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";
import { InvoiceNumber } from "../InvoiceNumber";
import { Invoice } from "../Invoice";
import type { InvoiceId, CustomerId } from "../Invoice" with { "resolution-mode": "import" };
import type { DomainEventId } from "../events";

// ── Helpers ─────────────────────────────────────────────────────────────────
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
  const r = InvoiceLine.of({ qty, unitPrice: mustMoney(amount, c), taxRate: mustRate(bp) });
  if (!isOk(r)) throw new Error(`bad line`);
  return r.value;
};

const idA = unsafeId<"InvoiceId">("inv-1") as InvoiceId;
const idB = unsafeId<"InvoiceId">("inv-2") as InvoiceId;
const cust = unsafeId<"CustomerId">("cus-1") as CustomerId;
const now = (ms = 1_700_000_000_000): Instant => Instant.fromEpochMillis(ms);
const evId = (s: string): DomainEventId => unsafeId<"DomainEvent">(s);

const mustInvoice = (currency: Currency = USD, customerId?: CustomerId, id: InvoiceId = idA): Invoice => {
  const r = Invoice.create({ id, number: mustNumber("INV-2026-0001"), currency, customerId });
  if (!isOk(r)) throw new Error("bad invoice");
  return r.value;
};

describe("Invoice — construction", () => {
  test("starts in Draft with no lines", () => {
    const inv = mustInvoice();
    expect(inv.status()).toBe("Draft");
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
    const other = Invoice.create({ id: idB, number: mustNumber("INV-2026-0002"), currency: USD });
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
    expect(isOk(inv.issue(now(), evId("e1")))).toBe(true);
    const r = inv.addLine(mustLine(1, 50, 0));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("StructuralEditLocked");
  });

  test("removeLine locked after issue()", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    inv.issue(now(), evId("e1"));
    const r = inv.removeLine(0);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("StructuralEditLocked");
  });
});

describe("Invoice — lifecycle (Wave 4: Draft → Issued)", () => {
  test("Draft → Issued requires at least one line", () => {
    const inv = mustInvoice();
    const r = inv.issue(now(), evId("e1"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("EmptyInvoice");
  });

  test("Draft → Issued records exactly one InvoiceIssued event", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    expect(isOk(inv.issue(now(123), evId("e1")))).toBe(true);
    expect(inv.status()).toBe("Issued");
    const hist = inv.getHistory();
    expect(hist.length).toBe(1);
    expect(hist[0].type).toBe("InvoiceIssued");
    expect(hist[0].sequence).toBe(1);
    expect(hist[0].invoiceId).toBe(idA);
    expect(hist[0].id).toBe(evId("e1"));
    expect(hist[0].occurredAt.toEpochMillis()).toBe(123);
  });

  test("issue() from non-Draft is rejected (InvalidStateTransition)", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 100, 0));
    inv.issue(now(), evId("e1"));
    const r = inv.issue(now(), evId("e2"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("InvalidStateTransition");
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
    inv.addLine(mustLine(3, 1000, 1000));
    inv.addLine(mustLine(2, 250, 1500));
    const n = inv.totalNet();
    const t = inv.totalTax();
    const g = inv.totalGross();
    if (!isOk(n) || !isOk(t) || !isOk(g)) throw new Error("totals failed");
    expect(n.value.amount).toBe(3500);
    expect(t.value.amount).toBe(375);
    expect(g.value.amount).toBe(3875);
  });

  test("totals = sum of per-line rounded values (no aggregate re-round)", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(1, 3, 5000));
    inv.addLine(mustLine(1, 3, 5000));
    const t = inv.totalTax();
    if (!isOk(t)) throw new Error("totals failed");
    expect(t.value.amount).toBe(4);
  });

  test("totals recomputed live (Draft); no derived state stored", () => {
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

  test("after issue(), totals reflect the issued snapshot", () => {
    const inv = mustInvoice();
    inv.addLine(mustLine(2, 1000, 1000));
    inv.issue(now(), evId("e1"));
    const g = inv.totalGross();
    if (!isOk(g)) throw new Error("g");
    expect(g.value.amount).toBe(2200);
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

  test("Invoice exposes no #status field; status() is derived", () => {
    const inv = mustInvoice();
    // Private # fields are inaccessible at runtime; assert public surface only.
    expect((inv as unknown as Record<string, unknown>).status).toBeTypeOf(
      "function",
    );
    expect((inv as unknown as Record<string, unknown>)._status).toBeUndefined();
  });
});
