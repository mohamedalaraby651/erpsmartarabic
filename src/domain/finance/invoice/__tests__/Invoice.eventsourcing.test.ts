import { describe, test, expect } from "vitest";
import { isOk, isErr, unsafeId, Instant } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";
import { InvoiceNumber } from "../InvoiceNumber";
import { Invoice } from "../Invoice";
import type { InvoiceId } from "../InvoiceId";
import type {
  AnyInvoiceEvent,
  DomainEventId,
  InvoiceIssued,
  InvoicePaymentApplied,
  InvoiceVoided,
} from "../events";

const C = (code: string) => {
  const r = Currency.of(code);
  if (!isOk(r)) throw new Error("c");
  return r.value;
};
const USD = C("USD");
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

const id = unsafeId<"InvoiceId">("inv-x") as InvoiceId;
const idOther = unsafeId<"InvoiceId">("inv-y") as InvoiceId;
const evId = (s: string): DomainEventId => unsafeId<"DomainEvent">(s);
const t = (ms: number) => Instant.fromEpochMillis(ms);

const draftWithLines = () => {
  const r = Invoice.create({ id, number: N("INV-2026-0001"), currency: USD });
  if (!isOk(r)) throw new Error("create");
  const inv = r.value;
  inv.addLine(L(2, 1000, 1000)); // gross 2200
  return inv;
};

describe("Invoice — event sourcing (Wave 4)", () => {
  test("pullEvents drains uncommitted; second call returns empty", () => {
    const inv = draftWithLines();
    inv.issue(t(1), evId("e1"));
    const first = inv.pullEvents();
    expect(first.length).toBe(1);
    expect(first[0]!.type).toBe("InvoiceIssued");
    expect(Object.isFrozen(first)).toBe(true);
    const second = inv.pullEvents();
    expect(second).toEqual([]);
  });

  test("pullEvents drain does NOT erase history", () => {
    const inv = draftWithLines();
    inv.issue(t(1), evId("e1"));
    inv.pullEvents();
    expect(inv.getHistory().length).toBe(1);
    expect(inv.status()).toBe("Issued");
  });

  test("InvoiceIssued event is frozen (immutable)", () => {
    const inv = draftWithLines();
    inv.issue(t(1), evId("e1"));
    const ev = inv.getHistory()[0];
    expect(Object.isFrozen(ev)).toBe(true);
    expect(Object.isFrozen(ev!.payload)).toBe(true);
  });

  test("sequence starts at 1 and is authored by the aggregate", () => {
    const inv = draftWithLines();
    inv.issue(t(1), evId("e1"));
    expect(inv.getHistory()[0]!.sequence).toBe(1);
  });

  test("issued snapshot captures totalGross in minor units", () => {
    const inv = draftWithLines();
    inv.issue(t(1), evId("e1"));
    const ev = inv.getHistory()[0] as InvoiceIssued;
    expect(ev.payload.totalGrossMinor).toBe(2200);
    expect(ev.payload.currencyCode).toBe("USD");
  });
});

describe("Invoice — rehydration via fromHistory (no snapshot)", () => {
  const buildIssued = (seq = 1, invId = id): InvoiceIssued => ({
    id: evId(`e${seq}`),
    occurredAt: t(seq),
    type: "InvoiceIssued",
    sequence: seq,
    invoiceId: invId,
    payload: {
      number: N("INV-2026-0001"),
      currency: USD,
      lines: [L(2, 1000, 1000)],
      totalGrossMinor: 2200,
      currencyCode: "USD",
    },
  });

  test("empty history is rejected", () => {
    const r = Invoice.fromHistory(id, []);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("RehydrationError");
  });

  test("rebuilds Issued invoice from event log", () => {
    const r = Invoice.fromHistory(id, [buildIssued(1)]);
    if (!isOk(r)) throw new Error("rehydrate");
    const inv = r.value;
    expect(inv.id).toBe(id);
    expect(inv.status()).toBe("Issued");
    expect(inv.lineCount()).toBe(1);
    const g = inv.totalGross();
    if (!isOk(g)) throw new Error("g");
    expect(g.value.amount).toBe(2200);
  });

  test("rehydrated aggregate has no uncommitted events", () => {
    const r = Invoice.fromHistory(id, [buildIssued(1)]);
    if (!isOk(r)) throw new Error("rehydrate");
    expect(r.value.pullEvents()).toEqual([]);
  });

  test("non-monotonic sequence is rejected", () => {
    const bad = [buildIssued(2)];
    const r = Invoice.fromHistory(id, bad);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("RehydrationError");
  });

  test("mismatched invoiceId is rejected", () => {
    const r = Invoice.fromHistory(id, [buildIssued(1, idOther)]);
    expect(isErr(r)).toBe(true);
  });

  test("missing InvoiceIssued is rejected", () => {
    const voided: InvoiceVoided = {
      id: evId("e1"),
      occurredAt: t(1),
      type: "InvoiceVoided",
      sequence: 1,
      invoiceId: id,
      payload: { reasonCode: "Erroneous", reason: "test" },
    };
    const r = Invoice.fromHistory(id, [voided]);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("RehydrationError");
  });

  test("duplicate InvoiceIssued is rejected", () => {
    const r = Invoice.fromHistory(id, [buildIssued(1), buildIssued(2)]);
    expect(isErr(r)).toBe(true);
  });

  test("fromHistory rejects snapshot-style overload (does not exist on Wave 4 API)", () => {
    // Compile-time + runtime guarantee: fromHistory takes only (id, events).
    expect(Invoice.fromHistory.length).toBe(2);
  });

  test("round-trip: live aggregate → events → rehydrated equivalent", () => {
    const live = draftWithLines();
    live.issue(t(5), evId("e1"));
    const events = live.getHistory() as AnyInvoiceEvent[];
    const r = Invoice.fromHistory(id, events);
    if (!isOk(r)) throw new Error("rehydrate");
    const replay = r.value;
    expect(replay.status()).toBe(live.status());
    const a = live.totalGross();
    const b = replay.totalGross();
    if (!isOk(a) || !isOk(b)) throw new Error("g");
    expect(b.value.amount).toBe(a.value.amount);
  });
});

describe("Invoice — temporal & identity authority (R-0001 / R-0008)", () => {
  test("issue() requires explicit Instant and DomainEventId", () => {
    // Compile-time enforced; runtime smoke: function arity is 2.
    const inv = draftWithLines();
    expect(inv.issue.length).toBe(2);
  });

  test("aggregate never reads clock or id port (no `new Date` references at runtime)", () => {
    // The aggregate's source uses neither — fitness scripts enforce statically.
    // Here we assert that issuing with a fixed Instant yields a deterministic
    // occurredAt (no hidden clock).
    const a = draftWithLines();
    a.issue(t(42), evId("e1"));
    expect(a.getHistory()[0]!.occurredAt.toEpochMillis()).toBe(42);
  });
});

// Wave-5 placeholder: payment & void payload types compile-check.
describe("Invoice — Wave 5 event payloads compile (behavior deferred)", () => {
  test("InvoicePaymentApplied payload shape", () => {
    const ev: InvoicePaymentApplied = {
      id: evId("p1"),
      occurredAt: t(1),
      type: "InvoicePaymentApplied",
      sequence: 2,
      invoiceId: id,
      payload: { amountMinor: 1000, currencyCode: "USD" },
    };
    expect(ev.payload.amountMinor).toBe(1000);
  });
});
