import { describe, test, expect } from "vitest";
import { isOk, isErr, unsafeId, Instant } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";
import { InvoiceNumber } from "../InvoiceNumber";
import { Invoice } from "../Invoice";
import type { InvoiceId } from "../InvoiceId";
import type { DomainEventId } from "../events";

const C = (code: string) => {
  const r = Currency.of(code);
  if (!isOk(r)) throw new Error("c");
  return r.value;
};
const USD = C("USD");
const EUR = C("EUR");
const M = (a: number, cur = USD) => {
  const r = Money.of(a, cur);
  if (!isOk(r)) throw new Error("m");
  return r.value;
};
const R = (bp: number) => {
  const r = TaxRate.of(bp);
  if (!isOk(r)) throw new Error("r");
  return r.value;
};
const L = (qty: number, amt: number, bp: number) => {
  const r = InvoiceLine.of({ qty, unitPrice: M(amt), taxRate: R(bp) });
  if (!isOk(r)) throw new Error("l");
  return r.value;
};
const N = (s: string) => {
  const r = InvoiceNumber.of(s);
  if (!isOk(r)) throw new Error("n");
  return r.value;
};
const id = unsafeId<"InvoiceId">("inv-pay") as InvoiceId;
const evId = (s: string): DomainEventId => unsafeId<"DomainEvent">(s);
const t = (ms: number) => Instant.fromEpochMillis(ms);

function issued() {
  const r = Invoice.create({ id, number: N("INV-2026-1000"), currency: USD });
  if (!isOk(r)) throw new Error("create");
  const inv = r.value;
  inv.addLine(L(2, 1000, 1000)); // gross 2200
  inv.issue(t(1), evId("e-iss"));
  inv.pullEvents();
  return inv;
}

describe("Invoice.applyPayment — Lock L1..L7", () => {
  test("happy path: partial → PartiallyPaid; outstanding shrinks", () => {
    const inv = issued();
    const out0 = inv.outstandingAmount();
    if (!isOk(out0)) throw new Error("o");
    expect(out0.value.amount).toBe(2200);

    const r = inv.applyPayment(M(800), t(2), evId("p1"));
    expect(isOk(r)).toBe(true);
    expect(inv.status()).toBe("PartiallyPaid");
    const paid = inv.paidAmount();
    const out = inv.outstandingAmount();
    if (!isOk(paid) || !isOk(out)) throw new Error("p");
    expect(paid.value.amount).toBe(800);
    expect(out.value.amount).toBe(1400);
  });

  test("multiple payments accumulate; full → Paid", () => {
    const inv = issued();
    expect(isOk(inv.applyPayment(M(800), t(2), evId("p1")))).toBe(true);
    expect(isOk(inv.applyPayment(M(1400), t(3), evId("p2")))).toBe(true);
    expect(inv.status()).toBe("Paid");
    const out = inv.outstandingAmount();
    if (!isOk(out)) throw new Error("o");
    expect(out.value.amount).toBe(0);
  });

  test("L3: Draft rejects payment (PaymentOnTerminalStatus)", () => {
    const r0 = Invoice.create({ id, number: N("INV-2026-1001"), currency: USD });
    if (!isOk(r0)) throw new Error("c");
    const r = r0.value.applyPayment(M(100), t(1), evId("p1"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("PaymentOnTerminalStatus");
  });

  test("L3: Paid rejects further payment", () => {
    const inv = issued();
    inv.applyPayment(M(2200), t(2), evId("p1"));
    const r = inv.applyPayment(M(1), t(3), evId("p2"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("PaymentOnTerminalStatus");
    if (r.error.kind !== "PaymentOnTerminalStatus") return;
    expect(r.error.status).toBe("Paid");
  });

  test("L4: currency mismatch wins over positivity/overpayment", () => {
    const inv = issued();
    const r = inv.applyPayment(M(-1, EUR), t(2), evId("p1"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("PaymentCurrencyMismatch");
  });

  test("L4: zero payment → NonPositivePayment (not OverPayment)", () => {
    const inv = issued();
    const r = inv.applyPayment(M(0), t(2), evId("p1"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("NonPositivePayment");
  });

  test("L4: negative payment → NonPositivePayment", () => {
    const inv = issued();
    const r = inv.applyPayment(M(-50), t(2), evId("p1"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("NonPositivePayment");
  });

  test("L1: overpayment uses outstandingAmount() as source of truth", () => {
    const inv = issued();
    inv.applyPayment(M(2000), t(2), evId("p1"));
    const r = inv.applyPayment(M(500), t(3), evId("p2")); // outstanding=200
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("OverPayment");
    if (r.error.kind !== "OverPayment") return;
    expect(r.error.outstandingMinor).toBe(200);
    expect(r.error.attemptedMinor).toBe(500);
  });

  test("L6/L7: rejected commands do NOT mutate state or emit events", () => {
    const inv = issued();
    inv.pullEvents();
    const before = inv.getHistory().length;
    inv.applyPayment(M(-1), t(2), evId("p-bad"));
    inv.applyPayment(M(0), t(3), evId("p-bad2"));
    inv.applyPayment(M(99999), t(4), evId("p-bad3"));
    expect(inv.getHistory().length).toBe(before);
    expect(inv.pullEvents()).toEqual([]);
    expect(inv.status()).toBe("Issued");
  });

  test("event has correct shape, monotonic sequence, and is frozen", () => {
    const inv = issued();
    inv.applyPayment(M(500), t(2), evId("p1"));
    const ev = inv.getHistory()[1];
    expect(ev!.type).toBe("InvoicePaymentApplied");
    expect(ev!.sequence).toBe(2);
    expect(Object.isFrozen(ev)).toBe(true);
    expect(Object.isFrozen(ev!.payload)).toBe(true);
  });

  test("L2: paidAmount() is a pure reduction (no cached field)", () => {
    const inv = issued();
    inv.applyPayment(M(300), t(2), evId("p1"));
    inv.applyPayment(M(400), t(3), evId("p2"));
    const p1 = inv.paidAmount();
    const p2 = inv.paidAmount();
    if (!isOk(p1) || !isOk(p2)) throw new Error("p");
    expect(p1.value.amount).toBe(700);
    expect(p2.value.amount).toBe(700);
  });
});
