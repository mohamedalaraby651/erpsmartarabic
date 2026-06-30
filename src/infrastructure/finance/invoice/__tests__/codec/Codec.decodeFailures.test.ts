/**
 * Codec — decode failure paths.
 *
 * Every malformed payload surfaces as `CorruptedPersistenceData` with
 * `cause.reason = "DecodeFailure"` (Wave 2A R1 — no new kernel variant).
 * Unknown `(type, schema_version)` pairs surface as `UnknownEventType`.
 */
import { describe, it, expect } from "vitest";
import { isErr } from "@/shared-kernel";
import { createDefaultInvoiceCodecRegistry } from "../../codec";
import type { PersistedEventRow } from "../../codec/PersistedEventRow";

const baseRow = (over: Partial<PersistedEventRow>): PersistedEventRow => ({
  event_id: "evt-1",
  aggregate_id: "inv-1",
  sequence: 1,
  type: "InvoiceIssued",
  schema_version: 1,
  payload: {},
  metadata: {},
  occurred_at: "2024-01-01T00:00:00.000Z",
  ...over,
});

describe("EventCodecRegistry — decode failures", () => {
  const reg = createDefaultInvoiceCodecRegistry();

  it("unknown event type → CorruptedPersistenceData{UnknownEventType}", () => {
    const r = reg.decode(baseRow({ type: "InvoiceNuked" }));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("CorruptedPersistenceData");
    expect((r.error as { cause: { reason: string } }).cause.reason).toBe(
      "UnknownEventType",
    );
  });

  it("unknown schema_version → CorruptedPersistenceData{UnknownEventType}", () => {
    const r = reg.decode(baseRow({ schema_version: 99 }));
    expect(isErr(r)).toBe(true);
  });

  it("non-object payload → DecodeFailure", () => {
    const r = reg.decode(baseRow({ payload: 42 }));
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect((r.error as { cause: { reason: string } }).cause.reason).toBe(
      "DecodeFailure",
    );
  });

  it("missing currency_code on InvoiceIssued → DecodeFailure", () => {
    const r = reg.decode(
      baseRow({
        payload: {
          number: "INV-1",
          lines: [],
          total_gross_minor: 0,
        },
      }),
    );
    expect(isErr(r)).toBe(true);
  });

  it("unknown currency code on InvoiceIssued → DecodeFailure", () => {
    const r = reg.decode(
      baseRow({
        payload: {
          number: "INV-1",
          currency_code: "ZZZ",
          lines: [],
          total_gross_minor: 0,
        },
      }),
    );
    expect(isErr(r)).toBe(true);
  });

  it("non-integer quantity on InvoiceIssued line → DecodeFailure", () => {
    const r = reg.decode(
      baseRow({
        payload: {
          number: "INV-1",
          currency_code: "USD",
          lines: [{ qty: 1.5, unit_price_minor: 100, tax_basis_points: 0 }],
          total_gross_minor: 100,
        },
      }),
    );
    expect(isErr(r)).toBe(true);
  });

  it("malformed payment payload → DecodeFailure", () => {
    const r = reg.decode(
      baseRow({
        type: "InvoicePaymentApplied",
        payload: { amount_minor: "100", currency_code: "USD" },
      }),
    );
    expect(isErr(r)).toBe(true);
  });

  it("unknown void reason_code → DecodeFailure", () => {
    const r = reg.decode(
      baseRow({
        type: "InvoiceVoided",
        payload: { reason_code: "Mistyped", reason: "x" },
      }),
    );
    expect(isErr(r)).toBe(true);
  });
});
