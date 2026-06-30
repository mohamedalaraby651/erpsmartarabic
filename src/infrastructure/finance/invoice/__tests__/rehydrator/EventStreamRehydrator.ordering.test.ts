/**
 * Addendum A1 — `sequence` is the SOLE ordering authority
 * (ADR-0012 §D-0012-08).
 *
 * Even if `occurred_at` disagrees with `sequence` (clock skew, retried
 * writes, replica lag), the rehydrator MUST trust `sequence` only.
 */
import { describe, it, expect } from "vitest";
import { isOk, unsafeId } from "@/shared-kernel";
import {
  createDefaultInvoiceCodecRegistry,
  EventStreamRehydrator,
} from "../../index";
import type { PersistedEventRow } from "../../codec/PersistedEventRow";
import { IssueInvoiceHandler, ApplyInvoicePaymentHandler } from "@/application/finance";
import {
  makeDeps,
  makeIssueCmd,
  TEST_CTX,
  makeInvoiceId,
} from "@/application/finance/invoice/__tests__/fakes/testKit";

async function captureRows() {
  const { repository, clock, idPort } = makeDeps();
  const issue = new IssueInvoiceHandler({ repository, clock, idPort });
  const pay = new ApplyInvoicePaymentHandler({ repository, clock, idPort });
  const id = makeInvoiceId("inv-ordering-1");
  const r1 = await issue.execute(makeIssueCmd({ invoiceId: id }), TEST_CTX);
  expect(isOk(r1)).toBe(true);
  const r2 = await pay.execute(
    { invoiceId: id, amountMinor: 100, currencyCode: "USD" },
    TEST_CTX,
  );
  expect(isOk(r2)).toBe(true);
  const reg = createDefaultInvoiceCodecRegistry();
  const events = repository.historyOf(id);
  const rows: PersistedEventRow[] = events.map((e) => {
    const r = reg.encode(e);
    if (!isOk(r)) throw new Error("encode failed in fixture");
    return r.value;
  });
  return { rows, id };
}

describe("EventStreamRehydrator — sequence is the sole ordering authority (A1)", () => {
  it("rebuilds correctly even when occurred_at goes BACKWARDS along ascending sequence", async () => {
    const { rows, id } = await captureRows();
    expect(rows.length).toBeGreaterThanOrEqual(2);

    // Reverse occurred_at while keeping sequence 1..N. If the rehydrator
    // were time-sensitive at all, this would fail or rebuild a different
    // state. With §D-0012-08 in force it must match the baseline exactly.
    const perturbed: PersistedEventRow[] = rows.map((row, i) => ({
      ...row,
      occurred_at: rows[rows.length - 1 - i]!.occurred_at,
    }));

    const reg = createDefaultInvoiceCodecRegistry();
    const rehydrator = new EventStreamRehydrator(reg);
    const baseline = rehydrator.rehydrate(id, rows);
    const perturbedResult = rehydrator.rehydrate(id, perturbed);
    expect(isOk(baseline)).toBe(true);
    expect(isOk(perturbedResult)).toBe(true);
    if (!isOk(baseline) || !isOk(perturbedResult)) return;

    expect(perturbedResult.value.committedVersion()).toBe(
      baseline.value.committedVersion(),
    );
    expect(String(perturbedResult.value.id)).toBe(String(baseline.value.id));
  });

  it("rejects rows with a sequence gap regardless of occurred_at order", () => {
    const reg = createDefaultInvoiceCodecRegistry();
    const rehydrator = new EventStreamRehydrator(reg);
    const aggId = "00000000-0000-4000-8000-0000000000aa";
    const rows: PersistedEventRow[] = [
      {
        event_id: "00000000-0000-4000-8000-000000000001",
        aggregate_id: aggId,
        sequence: 1,
        type: "finance.invoice.Issued",
        schema_version: 1,
        payload: {},
        metadata: {},
        occurred_at: new Date().toISOString(),
      },
      {
        event_id: "00000000-0000-4000-8000-000000000002",
        aggregate_id: aggId,
        sequence: 3,
        type: "finance.invoice.Issued",
        schema_version: 1,
        payload: {},
        metadata: {},
        occurred_at: new Date().toISOString(),
      },
    ];
    const r = rehydrator.rehydrate(unsafeId<"InvoiceId">(aggId), rows);
    expect(isOk(r)).toBe(false);
  });
});
