/**
 * InvoiceIssuedCodec — schemaVersion 1 (UX-2B Wave 2A).
 *
 * Wire payload (snake-free; lives inside JSON column):
 *   {
 *     number:           string,
 *     currency_code:    string,
 *     customer_id?:     string,
 *     lines: [{ qty: int, unit_price_minor: int, tax_basis_points: int }],
 *     total_gross_minor: int
 *   }
 *
 * Decoding rebuilds every VO via its `.of()` factory; any factory error
 * surfaces as `CorruptedPersistenceData{cause:{reason:"DecodeFailure"}}`.
 * The codec NEVER calls Invoice.fromHistory — invariant checks live in
 * the Rehydrator (Wave 2A R5 separation).
 */
import { ok, err, isErr, unsafeId } from "@/shared-kernel";
import type { Result, RepositoryFailure } from "@/shared-kernel";
import {
  Currency,
  Money,
  TaxRate,
  InvoiceLine,
  InvoiceNumber,
  INVOICE_ISSUED,
} from "@/domain/finance";
import type {
  InvoiceIssued,
  InvoiceIssuedPayload,
  CustomerId,
} from "@/domain/finance";
import type { EventCodec } from "../EventCodec";
import type { JsonValue, PersistedEventRow } from "../PersistedEventRow";
import {
  asArray,
  asInt,
  asObject,
  asString,
  decodeFailure,
} from "../decodeHelpers";

const SCHEMA_VERSION = 1 as const;

export const InvoiceIssuedCodecV1: EventCodec<InvoiceIssued> = {
  type: INVOICE_ISSUED,
  schemaVersion: SCHEMA_VERSION,

  encode(event: InvoiceIssued): PersistedEventRow {
    const p = event.payload;
    const linesJson: readonly JsonValue[] = p.lines.map((ln) => ({
      qty: ln.qty,
      unit_price_minor: ln.unitPrice.amount,
      tax_basis_points: ln.taxRate.basisPoints,
    }));
    const payload: { [k: string]: JsonValue } = {
      number: p.number.value,
      currency_code: p.currency.code,
      lines: linesJson,
      total_gross_minor: p.totalGrossMinor,
    };
    if (p.customerId !== undefined) {
      payload["customer_id"] = String(p.customerId);
    }
    return {
      event_id: String(event.eventId),
      aggregate_id: String(event.invoiceId),
      sequence: event.sequence,
      type: INVOICE_ISSUED,
      schema_version: SCHEMA_VERSION,
      payload,
      metadata: {},
      occurred_at: event.occurredAt.toISOString(),
    };
  },

  decode(row: PersistedEventRow): Result<InvoiceIssued, RepositoryFailure> {
    const objR = asObject(row.payload, row, "payload");
    if (isErr(objR)) return err(objR.error);
    const p = objR.value;

    const numberStr = asString(p["number"], row, "payload.number");
    if (isErr(numberStr)) return err(numberStr.error);
    const numberR = InvoiceNumber.of(numberStr.value);
    if (isErr(numberR))
      return err(decodeFailure(row, "payload.number", numberR.error.reason));

    const ccStr = asString(p["currency_code"], row, "payload.currency_code");
    if (isErr(ccStr)) return err(ccStr.error);
    const currR = Currency.of(ccStr.value);
    if (isErr(currR))
      return err(decodeFailure(row, "payload.currency_code", "UnknownCurrency"));
    const currency = currR.value;

    let customerId: CustomerId | undefined;
    if (p["customer_id"] !== undefined) {
      const cidR = asString(p["customer_id"], row, "payload.customer_id");
      if (isErr(cidR)) return err(cidR.error);
      customerId = unsafeId<"CustomerId">(cidR.value);
    }

    const linesArrR = asArray(p["lines"], row, "payload.lines");
    if (isErr(linesArrR)) return err(linesArrR.error);
    const lines: InvoiceLine[] = [];
    for (let i = 0; i < linesArrR.value.length; i++) {
      const raw = linesArrR.value[i]!;
      const lnObjR = asObject(raw, row, `payload.lines[${i}]`);
      if (isErr(lnObjR)) return err(lnObjR.error);
      const ln = lnObjR.value;

      const qtyR = asInt(ln["qty"], row, `payload.lines[${i}].qty`);
      if (isErr(qtyR)) return err(qtyR.error);
      const upR = asInt(
        ln["unit_price_minor"],
        row,
        `payload.lines[${i}].unit_price_minor`,
      );
      if (isErr(upR)) return err(upR.error);
      const tbpR = asInt(
        ln["tax_basis_points"],
        row,
        `payload.lines[${i}].tax_basis_points`,
      );
      if (isErr(tbpR)) return err(tbpR.error);

      const moneyR = Money.of(upR.value, currency);
      if (isErr(moneyR))
        return err(
          decodeFailure(
            row,
            `payload.lines[${i}].unit_price_minor`,
            moneyR.error.kind,
          ),
        );
      const taxR = TaxRate.of(tbpR.value);
      if (isErr(taxR))
        return err(
          decodeFailure(
            row,
            `payload.lines[${i}].tax_basis_points`,
            taxR.error.reason,
          ),
        );
      const lineR = InvoiceLine.of({
        qty: qtyR.value,
        unitPrice: moneyR.value,
        taxRate: taxR.value,
      });
      if (isErr(lineR))
        return err(
          decodeFailure(row, `payload.lines[${i}]`, lineR.error.kind),
        );
      lines.push(lineR.value);
    }

    const tgmR = asInt(
      p["total_gross_minor"],
      row,
      "payload.total_gross_minor",
    );
    if (isErr(tgmR)) return err(tgmR.error);

    const payloadOut: InvoiceIssuedPayload = (() => {
      const base = {
        number: numberR.value,
        currency,
        lines,
        totalGrossMinor: tgmR.value,
        currencyCode: currency.code,
      };
      return customerId === undefined
        ? base
        : { ...base, customerId };
    })();

    const ev: InvoiceIssued = Object.freeze({
      type: INVOICE_ISSUED,
      eventId: unsafeId<"DomainEvent">(row.event_id),
      invoiceId: unsafeId<"InvoiceId">(row.aggregate_id),
      sequence: row.sequence,
      occurredAt: instantFromIso(row.occurred_at),
      payload: payloadOut,
    });
    return ok(ev);
  },
};

import { Instant } from "@/shared-kernel";
function instantFromIso(iso: string): Instant {
  return Instant.fromISOString(iso);
}
