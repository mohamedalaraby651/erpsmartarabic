/**
 * Wave 5 — Rehydration guards added by Amendment A2:
 *   A2-R1: first event must be InvoiceIssued.
 *   A2-R2: no event may follow InvoiceVoided.
 *
 * Plus reviewer-requested smoke: pullEvents() after rehydrate === [].
 */
import { describe, test, expect } from "vitest";
import { isOk, isErr, unsafeId, Instant } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";
import { InvoiceNumber } from "../InvoiceNumber";
import { Invoice } from "../Invoice";
import type { InvoiceId } from "../Invoice" with { "resolution-mode": "import" };
import type {
  AnyInvoiceEvent,
  DomainEventId,
  InvoiceIssued,
  InvoicePaymentApplied,
  InvoiceVoided,
} from "../events";

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
const L = (q: number, a: number, bp: number) => {
  const r = InvoiceLine.of({ qty: q, unitPrice: M(a), taxRate: R(bp) });
  if (!isOk(r)) throw new Error("l");
  return r.value;
};
const N = (s: string) => {
  const r = InvoiceNumber.of(s);
  if (!isOk(r)) throw new Error("n");
  return r.value;
};
const id = unsafeId<"InvoiceId">("inv-rh") as InvoiceId;
const evId = (s: string): DomainEventId => unsafeId<"DomainEvent">(s);
const t = (ms: number) => Instant.fromEpochMillis(ms);

const issued = (seq = 1, gross = 2200): InvoiceIssued => ({
  id: evId(`i${seq}`),
  occurredAt: t(seq),
  type: "InvoiceIssued",
  sequence: seq,
  invoiceId: id,
  payload: {
    number: N("INV-2026-3000"),
    currency: USD,
    lines: [L(2, 1000, 1000)],
    totalGrossMinor: gross,
    currencyCode: "USD",
  },
});
const paid = (seq: number, amt: number): InvoicePaymentApplied => ({
  id: evId(`p${seq}`),
  occurredAt: t(seq),
  type: "InvoicePaymentApplied",
  sequence: seq,
  invoiceId: id,
  payload: { amountMinor: amt, currencyCode: "USD" },
});
const voided = (seq: number): InvoiceVoided => ({
  id: evId(`v${seq}`),
  occurredAt: t(seq),
  type: "InvoiceVoided",
  sequence: seq,
  invoiceId: id,
  payload: { reasonCode: "Other", reason: "test" },
});

describe("Invoice.fromHistory — A2 amendments", () => {
  test("A2-R1: payment before Issued is rejected (IssuedNotFirst)", () => {
    const bad: AnyInvoiceEvent[] = [paid(1, 100), issued(2)];
    const r = Invoice.fromHistory(id, bad);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("RehydrationError");
    if (r.error.kind !== "RehydrationError") return;
    expect(r.error.reason).toBe("IssuedNotFirst");
  });

  test("A2-R1: void before Issued is rejected (IssuedNotFirst)", () => {
    const bad: AnyInvoiceEvent[] = [voided(1), issued(2)];
    const r = Invoice.fromHistory(id, bad);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    if (r.error.kind !== "RehydrationError") throw new Error();
    expect(r.error.reason).toBe("IssuedNotFirst");
  });

  test("A2-R2: any event after Voided is rejected (EventAfterVoid)", () => {
    const bad: AnyInvoiceEvent[] = [issued(1), voided(2), paid(3, 100)];
    const r = Invoice.fromHistory(id, bad);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    if (r.error.kind !== "RehydrationError") throw new Error();
    expect(r.error.reason).toBe("EventAfterVoid");
  });

  test("A2-R2: even another Voided after Voided is rejected (EventAfterVoid)", () => {
    const bad: AnyInvoiceEvent[] = [issued(1), voided(2), voided(3)];
    const r = Invoice.fromHistory(id, bad);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    if (r.error.kind !== "RehydrationError") throw new Error();
    expect(r.error.reason).toBe("EventAfterVoid");
  });

  test("valid stream: Issued + payments + Void replays cleanly", () => {
    const stream: AnyInvoiceEvent[] = [
      issued(1, 2200),
      paid(2, 800),
      voided(3),
    ];
    const r = Invoice.fromHistory(id, stream);
    if (!isOk(r)) throw new Error("rh");
    expect(r.value.status()).toBe("Void");
    const paidM = r.value.paidAmount();
    if (!isOk(paidM)) throw new Error("p");
    expect(paidM.value.amount).toBe(800);
  });

  test("reviewer smoke: pullEvents() === [] after rehydrate", () => {
    const r = Invoice.fromHistory(id, [issued(1), paid(2, 500)]);
    if (!isOk(r)) throw new Error("rh");
    expect(r.value.pullEvents()).toEqual([]);
  });

  test("parity: status & paidAmount equal between live and replayed", () => {
    const live0 = Invoice.create({
      id,
      number: N("INV-2026-3001"),
      currency: USD,
    });
    if (!isOk(live0)) throw new Error("c");
    const live = live0.value;
    live.addLine(L(2, 1000, 1000));
    live.issue(t(1), evId("i"));
    live.applyPayment(M(700), t(2), evId("p1"));
    live.applyPayment(M(300), t(3), evId("p2"));

    const replay = Invoice.fromHistory(
      id,
      live.getHistory() as AnyInvoiceEvent[],
    );
    if (!isOk(replay)) throw new Error("rh");
    expect(replay.value.status()).toBe(live.status());
    const a = live.paidAmount();
    const b = replay.value.paidAmount();
    if (!isOk(a) || !isOk(b)) throw new Error("p");
    expect(b.value.amount).toBe(a.value.amount);
    expect(replay.value.pullEvents()).toEqual([]);
  });
});
