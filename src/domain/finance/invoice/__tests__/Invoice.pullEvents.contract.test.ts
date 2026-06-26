/**
 * pullEvents() — Wave 6 contract tests (C2).
 *
 * Verifies:
 *  - The returned array is frozen (shallow) — push/splice throw in strict mode.
 *  - A freshly rehydrated aggregate returns [] until a new command runs.
 *  - Repeated pulls without new commands return [].
 *  - Events themselves remain frozen (Wave 4 guarantee via freezeEvent),
 *    but pullEvents performs NO deep-freeze pass.
 */
import { describe, it, expect } from "vitest";
import { unsafeId, Instant } from "@/shared-kernel";
import {
  Invoice,
  InvoiceNumber,
  InvoiceLine,
  Currency,
  Money,
  TaxRate,
} from "../../index";
import type { DomainEventId } from "../events";

const usd = Currency.of("USD").value!;
const now = Instant.fromEpochMillis(1_700_000_000_000);
const eid = (n: number) => unsafeId<"DomainEventId">(`evt-${n}`) as DomainEventId;

function makeIssuedInvoice(): Invoice {
  const inv = Invoice.create({
    id: unsafeId("INV-1"),
    number: InvoiceNumber.of("INV-001").value!,
    currency: usd,
  }).value!;
  const line = InvoiceLine.of({
    qty: 1,
    unitPrice: Money.of(1000, usd).value!,
    taxRate: TaxRate.zero(),
  }).value!;
  inv.addLine(line);
  inv.issue(now, eid(1));
  return inv;
}

describe("Invoice.pullEvents — Wave 6 contract", () => {
  it("returns a frozen array (shallow)", () => {
    const inv = makeIssuedInvoice();
    const drained = inv.pullEvents();
    expect(Object.isFrozen(drained)).toBe(true);
    expect(() => (drained as unknown as unknown[]).push({} as never)).toThrow();
  });

  it("drains so a second pull (no new commands) returns []", () => {
    const inv = makeIssuedInvoice();
    const first = inv.pullEvents();
    expect(first.length).toBe(1);
    const second = inv.pullEvents();
    expect(second.length).toBe(0);
    expect(Object.isFrozen(second)).toBe(true);
  });

  it("returns [] immediately after fromHistory rehydration", () => {
    const inv = makeIssuedInvoice();
    const history = inv.getHistory();
    const rehydrated = Invoice.fromHistory(
      unsafeId("INV-1"),
      history,
    ).value!;
    const drained = rehydrated.pullEvents();
    expect(drained.length).toBe(0);
    expect(Object.isFrozen(drained)).toBe(true);
  });

  it("does not affect the durable #history", () => {
    const inv = makeIssuedInvoice();
    inv.pullEvents();
    expect(inv.getHistory().length).toBe(1);
  });

  it("events inside the drained array remain frozen (Wave 4 guarantee)", () => {
    const inv = makeIssuedInvoice();
    const drained = inv.pullEvents();
    expect(Object.isFrozen(drained[0])).toBe(true);
  });

  it("issuing again after rehydration is rejected (no orphan uncommitted)", () => {
    const inv = makeIssuedInvoice();
    const history = inv.getHistory();
    const rehydrated = Invoice.fromHistory(
      unsafeId("INV-1"),
      history,
    ).value!;
    const r = rehydrated.issue(now, eid(99));
    expect(r.ok).toBe(false);
    // No event must have been buffered during a rejected command.
    expect(rehydrated.pullEvents().length).toBe(0);
  });
});
