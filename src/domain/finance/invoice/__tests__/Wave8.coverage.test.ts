/**
 * Wave 8 — G1 Coverage gap closure tests.
 *
 * Each test below pins a defensive/unreachable-via-commands branch that
 * coverage tooling flags as uncovered. Adding these tests is allowed
 * under the Wave 8 rule because it is TEST-ONLY work (no production
 * code is edited). The targets are documented per-test.
 */
import { describe, test, expect } from "vitest";
import { isOk, isErr, unsafeId, Instant } from "@/shared-kernel";
import type { DomainEventId } from "@/shared-kernel";
import { Currency } from "../../shared/Currency";
import { Money } from "../../shared/Money";
import { TaxRate } from "../../shared/TaxRate";
import { InvoiceLine } from "../InvoiceLine";
import { InvoiceNumber } from "../InvoiceNumber";
import { Invoice } from "../Invoice";
import type { InvoiceId } from "../InvoiceId";
import { statusOf } from "../statusOf";
import { assertNever } from "../errors/InvoiceDomainError";
import type { InvoiceIssued, InvoicePaymentApplied } from "../events";

function must<T, E>(r: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!isOk(r)) throw new Error("must: " + JSON.stringify(r));
  return r.value;
}

const USD = must(Currency.of("USD"));
const id = unsafeId<"InvoiceId">("inv-w8") as InvoiceId;
const ev = (s: string): DomainEventId => unsafeId<"DomainEvent">(s);
const t = (ms: number) => Instant.fromEpochMillis(ms);

describe("Wave 8 — coverage closure", () => {
  test("Money.mulScalar handles negative denominator (Money.ts L139 branch)", () => {
    // Covers the `d < 0n ? -d : d` true branch.
    const m = must(Money.of(1000, USD));
    const out = must(m.mulScalar(2, -1)); // (1000 * 2) / -1 = -2000
    expect(out.amount).toBe(-2000);
  });

  test("InvoiceLine.of rejects unsafe quantity above MAX_SAFE_INTEGER (InvoiceLine.ts L80)", () => {
    // 2^53 is integer per Number.isInteger but exceeds MAX_SAFE_INTEGER.
    const huge = Number.MAX_SAFE_INTEGER + 2; // still passes Number.isInteger
    const r = InvoiceLine.of({
      qty: huge,
      unitPrice: must(Money.of(1, USD)),
      taxRate: must(TaxRate.of(0)),
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe("InvalidQuantity");
    }
  });

  test("statusOf treats PaymentApplied after Paid as no-op (statusOf.ts L46)", () => {
    // Stream: Issued(gross=10) + Payment(10) → Paid, then Payment(5) → no-op.
    const issued: InvoiceIssued = {
      id: ev("e1"),
      occurredAt: t(1),
      type: "InvoiceIssued",
      sequence: 1,
      invoiceId: id,
      payload: {
        number: must(InvoiceNumber.of("INV-2026-9001")),
        currency: USD,
        lines: [
          must(
            InvoiceLine.of({
              qty: 1,
              unitPrice: must(Money.of(10, USD)),
              taxRate: must(TaxRate.of(0)),
            }),
          ),
        ],
        totalGrossMinor: 10,
        currencyCode: "USD",
      },
    };
    const pay1: InvoicePaymentApplied = {
      id: ev("p1"),
      occurredAt: t(2),
      type: "InvoicePaymentApplied",
      sequence: 2,
      invoiceId: id,
      payload: { amountMinor: 10, currencyCode: "USD" },
    };
    const pay2: InvoicePaymentApplied = {
      id: ev("p2"),
      occurredAt: t(3),
      type: "InvoicePaymentApplied",
      sequence: 3,
      invoiceId: id,
      payload: { amountMinor: 5, currencyCode: "USD" },
    };
    expect(statusOf([issued, pay1, pay2])).toBe("Paid");
  });

  test("outstandingAmount returns zero when paid > gross via rehydrated stream (Invoice.ts L399)", () => {
    // Crafted history bypasses the command-time overpayment guard — it
    // proves the live projection is a safe floor at zero, not negative.
    const issued: InvoiceIssued = {
      id: ev("e1"),
      occurredAt: t(1),
      type: "InvoiceIssued",
      sequence: 1,
      invoiceId: id,
      payload: {
        number: must(InvoiceNumber.of("INV-2026-9002")),
        currency: USD,
        lines: [
          must(
            InvoiceLine.of({
              qty: 1,
              unitPrice: must(Money.of(10, USD)),
              taxRate: must(TaxRate.of(0)),
            }),
          ),
        ],
        totalGrossMinor: 10,
        currencyCode: "USD",
      },
    };
    const over: InvoicePaymentApplied = {
      id: ev("p1"),
      occurredAt: t(2),
      type: "InvoicePaymentApplied",
      sequence: 2,
      invoiceId: id,
      payload: { amountMinor: 15, currencyCode: "USD" },
    };
    const inv = must(Invoice.fromHistory(id, [issued, over]));
    const out = must(inv.outstandingAmount());
    expect(out.amount).toBe(0); // clamped, not -5
  });

  test("assertNever throws with the discriminator when called (InvoiceDomainError.ts L77-78)", () => {
    expect(() => assertNever({ kind: "Fabricated" } as never)).toThrowError(
      /Fabricated/,
    );
    expect(() => assertNever(null as never)).toThrowError(/<unknown>/);
  });

  test("InvoiceLine.lineNet/lineTax/lineGross propagate Money overflow errors (InvoiceLine.ts defensive branches)", () => {
    // Defensive: InvoiceLine.of accepts qty=MAX_SAFE_INTEGER and unitPrice at
    // MAX_SAFE_INTEGER, but the product overflows the safe-integer boundary
    // inside Money.mulScalar — exercising the `isErr(net)` early-returns.
    const huge = Number.MAX_SAFE_INTEGER;
    const line = must(
      InvoiceLine.of({
        qty: huge,
        unitPrice: must(Money.of(huge, USD)),
        taxRate: must(TaxRate.of(0)),
      }),
    );
    const net = line.lineNet();
    expect(isErr(net)).toBe(true);
    const tax = line.lineTax(); // early-returns the net error (L111)
    expect(isErr(tax)).toBe(true);
    const gross = line.lineGross(); // early-returns the net error (L121)
    expect(isErr(gross)).toBe(true);

    // For L123 (tax-side err with net ok): pick values where qty*unitPrice
    // stays safe but tax projection (bp/10000) overflows.
    const halfMax = Math.floor(Number.MAX_SAFE_INTEGER / 2);
    const line2 = must(
      InvoiceLine.of({
        qty: 1,
        unitPrice: must(Money.of(halfMax, USD)),
        taxRate: must(TaxRate.of(5000)), // 50%
      }),
    );
    const net2 = line2.lineNet();
    expect(isOk(net2)).toBe(true);
    // halfMax * 5000 vastly exceeds MAX_SAFE_INTEGER → tax projection fails.
    const gross2 = line2.lineGross();
    expect(isErr(gross2)).toBe(true);
  });
});
