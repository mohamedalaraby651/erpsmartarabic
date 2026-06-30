/**
 * EventStreamRehydrator — sequence gaps and invariant violations
 * collapse to `CorruptedPersistenceData` with distinct `cause.reason`
 * tags (`SequenceGap`, `InvariantViolation`, `DecodeFailure`).
 */
import { describe, it, expect } from "vitest";
import { isOk, isErr, unsafeId } from "@/shared-kernel";
import {
  createDefaultInvoiceCodecRegistry,
  EventStreamRehydrator,
} from "../../index";
import type { PersistedEventRow } from "../../codec/PersistedEventRow";
import {
  ApplyInvoicePaymentHandler,
  IssueInvoiceHandler,
} from "@/application/finance";
import {
  makeDeps,
  makeIssueCmd,
  TEST_CTX,
  makeInvoiceId,
} from "@/application/finance/invoice/__tests__/fakes/testKit";

async function captureRows(): Promise<{
  rows: PersistedEventRow[];
  invoiceId: ReturnType<typeof makeInvoiceId>;
}> {
  const { repository, clock, idPort } = makeDeps();
  const issue = new IssueInvoiceHandler({ repository, clock, idPort });
  const pay = new ApplyInvoicePaymentHandler({ repository, clock, idPort });
  const id = makeInvoiceId("inv-reh-1");
  await issue.handle(makeIssueCmd({ invoiceId: id }), TEST_CTX);
  await pay.handle(
    { invoiceId: id, amountMinor: 100, currencyCode: "USD" },
    TEST_CTX,
  );
  const loaded = await repository.load(id, TEST_CTX);
  if (!isOk(loaded)) throw new Error("setup failed");
  const reg = createDefaultInvoiceCodecRegistry();
  const rows = loaded.value.pullEvents().map((e) => {
    const r = reg.encode(e);
    if (!isOk(r)) throw new Error("encode failed");
    return r.value as PersistedEventRow;
  });
  return { rows, invoiceId: id };
}

describe("EventStreamRehydrator", () => {
  const codec = createDefaultInvoiceCodecRegistry();
  const reh = new EventStreamRehydrator(codec);

  it("rebuilds the Invoice from valid rows", async () => {
    const { rows, invoiceId } = await captureRows();
    const r = reh.rehydrate(invoiceId, rows);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.committedVersion()).toBe(2);
  });

  it("detects sequence gaps → CorruptedPersistenceData{SequenceGap}", async () => {
    const { rows, invoiceId } = await captureRows();
    const broken: PersistedEventRow[] = [
      rows[0]!,
      { ...rows[1]!, sequence: 5 },
    ];
    const r = reh.rehydrate(invoiceId, broken);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("CorruptedPersistenceData");
    expect((r.error as { cause: { reason: string } }).cause.reason).toBe(
      "SequenceGap",
    );
  });

  it("propagates DecodeFailure unchanged", async () => {
    const { rows, invoiceId } = await captureRows();
    const broken: PersistedEventRow[] = [
      { ...rows[0]!, payload: 42 },
    ];
    const r = reh.rehydrate(invoiceId, broken);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect((r.error as { cause: { reason: string } }).cause.reason).toBe(
      "DecodeFailure",
    );
  });

  it("aggregate invariant violation → cause.reason=InvariantViolation", async () => {
    // Stream that starts with a payment instead of Issued → fromHistory must reject.
    const { rows, invoiceId } = await captureRows();
    const paymentOnly: PersistedEventRow[] = [
      { ...rows[1]!, sequence: 1 },
    ];
    const r = reh.rehydrate(invoiceId, paymentOnly);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect((r.error as { cause: { reason: string } }).cause.reason).toBe(
      "InvariantViolation",
    );
  });

  it("decodes for an id mismatch are still surfaced cleanly", () => {
    // sanity smoke: empty stream still produces a fromHistory error.
    const r = reh.rehydrate(unsafeId<"InvoiceId">("nope"), []);
    expect(isErr(r)).toBe(true);
  });
});
