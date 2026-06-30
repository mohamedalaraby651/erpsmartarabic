/**
 * Addendum A2 — `metadata` is operational, never a domain input
 * (ADR-0012 §D-0012-09).
 *
 * The rebuilt aggregate state must be IDENTICAL whether `metadata` is
 * empty or contains arbitrary tracing/audit data, including strings
 * that *look like* domain values.
 */
import { describe, it, expect } from "vitest";
import { isOk } from "@/shared-kernel";
import {
  createDefaultInvoiceCodecRegistry,
  EventStreamRehydrator,
} from "../../index";
import type { PersistedEventRow } from "../../codec/PersistedEventRow";
import { IssueInvoiceHandler } from "@/application/finance";
import {
  makeDeps,
  makeIssueCmd,
  TEST_CTX,
  makeInvoiceId,
} from "@/application/finance/invoice/__tests__/fakes/testKit";

async function buildRows(invoiceId: string): Promise<readonly PersistedEventRow[]> {
  const { repository, clock, idPort } = makeDeps();
  const issue = new IssueInvoiceHandler({ repository, clock, idPort });
  const r = await issue.execute(makeIssueCmd({ invoiceId }), TEST_CTX);
  expect(isOk(r)).toBe(true);
  const reg = createDefaultInvoiceCodecRegistry();
  const events = repository.historyOf(makeInvoiceId(invoiceId));
  return events.map((e) => {
    const enc = reg.encode(e);
    if (!isOk(enc)) throw new Error("encode failed in fixture");
    return enc.value;
  });
}

describe("EventCodec / Rehydrator — metadata is operational-only (A2)", () => {
  it("rebuilds identical aggregate state regardless of metadata contents", async () => {
    const id = makeInvoiceId("inv-metadata-1");
    const baselineRows = await buildRows(id);
    const noisyRows: PersistedEventRow[] = baselineRows.map((row) => ({
      ...row,
      metadata: {
        correlationId: "trace-abc-123",
        causationId: "cause-xyz-789",
        attempt: 7,
        nested: { foo: ["bar", null, true, 42] },
        // Strings that *look like* domain inputs — must be ignored.
        currency_code: "EUR_INJECTED",
        sequence: 999,
      },
    }));

    const reg = createDefaultInvoiceCodecRegistry();
    const rehydrator = new EventStreamRehydrator(reg);
    const baseline = rehydrator.rehydrate(makeInvoiceId(id), baselineRows);
    const noisy = rehydrator.rehydrate(makeInvoiceId(id), noisyRows);
    expect(isOk(baseline)).toBe(true);
    expect(isOk(noisy)).toBe(true);
    if (!isOk(baseline) || !isOk(noisy)) return;

    expect(noisy.value.committedVersion()).toBe(baseline.value.committedVersion());
    expect(String(noisy.value.id)).toBe(String(baseline.value.id));
  });

  it("decode tolerates arbitrary metadata blobs without producing a Result.err", async () => {
    const id = makeInvoiceId("inv-metadata-2");
    const baselineRows = await buildRows(id);
    const reg = createDefaultInvoiceCodecRegistry();
    for (const baselineRow of baselineRows) {
      const row: PersistedEventRow = {
        ...baselineRow,
        metadata: { correlationId: "abc", nested: { k: "v" }, n: 1 },
      };
      const dec = reg.decode(row);
      expect(isOk(dec)).toBe(true);
    }
  });
});
