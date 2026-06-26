import { describe, test, expect } from "vitest";
import { unsafeId, Instant } from "@/shared-kernel";
import { statusOf } from "../statusOf";
import type {
  AnyInvoiceEvent,
  DomainEventId,
  InvoiceIssued,
  InvoicePaymentApplied,
  InvoiceVoided,
} from "../events";
import type { InvoiceId } from "../InvoiceId";

const id = unsafeId<"InvoiceId">("inv") as InvoiceId;
const evId = (s: string): DomainEventId => unsafeId<"DomainEvent">(s);
const t = (ms: number) => Instant.fromEpochMillis(ms);

const issued = (grossMinor: number, seq = 1): InvoiceIssued => ({
  id: evId(`i${seq}`),
  occurredAt: t(seq),
  type: "InvoiceIssued",
  sequence: seq,
  invoiceId: id,
  payload: {
    number: { value: "INV-2026-0001" } as never, // shape-only for reducer tests
    currency: { code: "USD" } as never,
    lines: [],
    totalGrossMinor: grossMinor,
    currencyCode: "USD",
  },
});
const paid = (amountMinor: number, seq: number): InvoicePaymentApplied => ({
  id: evId(`p${seq}`),
  occurredAt: t(seq),
  type: "InvoicePaymentApplied",
  sequence: seq,
  invoiceId: id,
  payload: { amountMinor, currencyCode: "USD" },
});
const voided = (seq: number): InvoiceVoided => ({
  id: evId(`v${seq}`),
  occurredAt: t(seq),
  type: "InvoiceVoided",
  sequence: seq,
  invoiceId: id,
  payload: { reasonCode: "Erroneous", reason: "test" },
});

describe("statusOf — pure reducer", () => {
  test("empty stream → Draft", () => {
    expect(statusOf([])).toBe("Draft");
  });
  test("[Issued] → Issued", () => {
    expect(statusOf([issued(1000)])).toBe("Issued");
  });
  test("[Issued, partial Payment] → PartiallyPaid", () => {
    const s: AnyInvoiceEvent[] = [issued(1000), paid(400, 2)];
    expect(statusOf(s)).toBe("PartiallyPaid");
  });
  test("[Issued, full Payment in one event] → Paid", () => {
    expect(statusOf([issued(1000), paid(1000, 2)])).toBe("Paid");
  });
  test("[Issued, partial + final Payment] → Paid", () => {
    expect(statusOf([issued(1000), paid(400, 2), paid(600, 3)])).toBe("Paid");
  });
  test("[Issued, over-payment] → Paid (cumulative >= gross)", () => {
    expect(statusOf([issued(1000), paid(1500, 2)])).toBe("Paid");
  });
  test("[Issued, Voided] → Void", () => {
    expect(statusOf([issued(1000), voided(2)])).toBe("Void");
  });
  test("Paid is terminal: later events do not change status", () => {
    expect(statusOf([issued(1000), paid(1000, 2), voided(3)])).toBe("Paid");
  });
  test("Void is terminal: later events do not change status", () => {
    expect(statusOf([issued(1000), voided(2), paid(500, 3)])).toBe("Void");
  });
});
