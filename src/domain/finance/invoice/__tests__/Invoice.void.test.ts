import { describe, test, expect } from "vitest";
import { isOk, isErr, unsafeId, Instant } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";
import { InvoiceNumber } from "../InvoiceNumber";
import { Invoice } from "../Invoice";
import type { InvoiceId } from "../InvoiceId";
import type { DomainEventId, InvoiceVoided } from "../events";

const USD = (() => {
  const r = Currency.of("USD");
  if (!isOk(r)) throw new Error("c");
  return r.value;
})();
const M = (a: number) => {
  const r = Money.of(a, USD);
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
const id = unsafeId<"InvoiceId">("inv-void") as InvoiceId;
const evId = (s: string): DomainEventId => unsafeId<"DomainEvent">(s);
const t = (ms: number) => Instant.fromEpochMillis(ms);

function draft() {
  const r = Invoice.create({ id, number: N("INV-2026-2000"), currency: USD });
  if (!isOk(r)) throw new Error("create");
  return r.value;
}
function issued() {
  const inv = draft();
  inv.addLine(L(2, 1000, 1000));
  inv.issue(t(1), evId("e-iss"));
  inv.pullEvents();
  return inv;
}

describe("Invoice.void — Lock L5 + terminal guards", () => {
  test("Draft → Void allowed", () => {
    const inv = draft();
    const r = inv.void("created in error", t(1), evId("v1"));
    expect(isOk(r)).toBe(true);
    expect(inv.status()).toBe("Void");
  });

  test("Issued → Void allowed", () => {
    const inv = issued();
    expect(isOk(inv.void("customer cancelled", t(2), evId("v1")))).toBe(true);
    expect(inv.status()).toBe("Void");
  });

  test("PartiallyPaid → Void allowed", () => {
    const inv = issued();
    inv.applyPayment(M(500), t(2), evId("p1"));
    expect(isOk(inv.void("dispute opened", t(3), evId("v1")))).toBe(true);
    expect(inv.status()).toBe("Void");
  });

  test("Paid rejects void (terminal)", () => {
    const inv = issued();
    inv.applyPayment(M(2200), t(2), evId("p1"));
    const r = inv.void("late dispute", t(3), evId("v1"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("VoidOnTerminalStatus");
  });

  test("double-void rejected (idempotency by guard, not silent)", () => {
    const inv = issued();
    inv.void("first", t(2), evId("v1"));
    const r = inv.void("second", t(3), evId("v2"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("VoidOnTerminalStatus");
  });

  test("L5: empty / whitespace reason rejected with Empty", () => {
    const inv = issued();
    for (const bad of ["", "   ", "\n\t  "]) {
      const r = inv.void(bad, t(2), evId("v1"));
      expect(isErr(r)).toBe(true);
      if (!isErr(r)) continue;
      expect(r.error.kind).toBe("VoidReasonInvalid");
      if (r.error.kind !== "VoidReasonInvalid") continue;
      expect(r.error.reason).toBe("Empty");
    }
  });

  test("L5: > 240 chars rejected with TooLong", () => {
    const inv = issued();
    const long = "x".repeat(241);
    const r = inv.void(long, t(2), evId("v1"));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("VoidReasonInvalid");
    if (r.error.kind !== "VoidReasonInvalid") return;
    expect(r.error.reason).toBe("TooLong");
  });

  test("L5: reason stored normalized (trimmed)", () => {
    const inv = issued();
    inv.void("  customer asked  ", t(2), evId("v1"));
    const ev = inv.getHistory()[1] as InvoiceVoided;
    expect(ev.payload.reason).toBe("customer asked");
  });

  test("voided event is frozen with correct sequence", () => {
    const inv = issued();
    inv.void("ok", t(2), evId("v1"));
    const ev = inv.getHistory()[1] as InvoiceVoided;
    expect(ev.type).toBe("InvoiceVoided");
    expect(ev.sequence).toBe(2);
    expect(Object.isFrozen(ev)).toBe(true);
    expect(Object.isFrozen(ev.payload)).toBe(true);
  });

  test("rejected void does NOT emit events", () => {
    const inv = issued();
    inv.pullEvents();
    const before = inv.getHistory().length;
    inv.void("", t(2), evId("v-bad"));
    expect(inv.getHistory().length).toBe(before);
    expect(inv.pullEvents()).toEqual([]);
  });
});
