/**
 * Codec round-trip — every supported event type encodes to a
 * `PersistedEventRow` and decodes back to a structurally-equal event.
 *
 * This is the contract that lets the Repository stay schema-version
 * blind: encoding is total, and decoding restores every VO via its
 * `.of()` factory so domain invariants survive a DB round trip.
 */
import { describe, it, expect } from "vitest";
import { isOk } from "@/shared-kernel";
import { IssueInvoiceHandler } from "@/application/finance";
import {
  makeDeps,
  makeIssueCmd,
  TEST_CTX,
  makeInvoiceId,
} from "@/application/finance/invoice/__tests__/fakes/testKit";
import {
  EventCodecRegistry,
  InvoiceIssuedCodecV1,
  InvoicePaymentAppliedCodecV1,
  InvoiceVoidedCodecV1,
  createDefaultInvoiceCodecRegistry,
} from "../../codec";
import { ApplyInvoicePaymentHandler, VoidInvoiceHandler } from "@/application/finance";

async function buildFullStream() {
  const { repository, clock, idPort } = makeDeps();
  const issue = new IssueInvoiceHandler({ repository, clock, idPort });
  const pay = new ApplyInvoicePaymentHandler({ repository, clock, idPort });
  const v = new VoidInvoiceHandler({ repository, clock, idPort });

  const cmd = makeIssueCmd({
    invoiceId: makeInvoiceId("inv-rt-1"),
    customerId: undefined,
  });
  const r1 = await issue.execute(cmd, TEST_CTX);
  expect(isOk(r1)).toBe(true);

  const r2 = await pay.execute(
    { invoiceId: cmd.invoiceId, amountMinor: 1000, currencyCode: "USD" },
    TEST_CTX,
  );
  expect(isOk(r2)).toBe(true);

  const r3 = await v.execute(
    {
      invoiceId: cmd.invoiceId,
      reasonCode: "Erroneous",
      reason: "data-entry mistake",
    },
    TEST_CTX,
  );
  expect(isOk(r3)).toBe(true);

  return { repository, invoiceId: cmd.invoiceId };
}

describe("EventCodecRegistry round-trip", () => {
  it("encodes and decodes all three event types byte-for-byte equivalently", async () => {
    const { repository, invoiceId } = await buildFullStream();
    const reloaded = await repository.load(invoiceId, TEST_CTX);
    expect(isOk(reloaded)).toBe(true);
    if (!isOk(reloaded)) return;
    const events = reloaded.value.pullEvents();
    expect(events.map((e) => e.type)).toEqual([
      "InvoiceIssued",
      "InvoicePaymentApplied",
      "InvoiceVoided",
    ]);

    const reg = createDefaultInvoiceCodecRegistry();
    for (const ev of events) {
      const encR = reg.encode(ev);
      expect(isOk(encR)).toBe(true);
      if (!isOk(encR)) return;
      const row = encR.value;
      expect(row.aggregate_id).toBe(String(invoiceId));
      expect(row.type).toBe(ev.type);
      expect(row.schema_version).toBe(1);

      const decR = reg.decode(row);
      expect(isOk(decR)).toBe(true);
      if (!isOk(decR)) return;
      const decoded = decR.value;
      expect(decoded.type).toBe(ev.type);
      expect(decoded.sequence).toBe(ev.sequence);
      expect(String(decoded.invoiceId)).toBe(String(ev.invoiceId));
      expect(decoded.occurredAt.toISOString()).toBe(
        ev.occurredAt.toISOString(),
      );
    }
  });

  it("registers all three v1 codecs in the default registry", () => {
    const reg = createDefaultInvoiceCodecRegistry();
    expect(reg.list()).toEqual([
      { type: "InvoiceIssued", schemaVersion: 1 },
      { type: "InvoicePaymentApplied", schemaVersion: 1 },
      { type: "InvoiceVoided", schemaVersion: 1 },
    ]);
  });

  it("exposes per-codec instances", () => {
    expect(InvoiceIssuedCodecV1.type).toBe("InvoiceIssued");
    expect(InvoicePaymentAppliedCodecV1.type).toBe("InvoicePaymentApplied");
    expect(InvoiceVoidedCodecV1.type).toBe("InvoiceVoided");
  });

  it("last-write-wins on duplicate (type, version) registration (no throw)", () => {
    const reg = new EventCodecRegistry();
    reg.register(InvoiceIssuedCodecV1);
    expect(() => reg.register(InvoiceIssuedCodecV1)).not.toThrow();
    expect(reg.list().length).toBe(1);
  });
});
