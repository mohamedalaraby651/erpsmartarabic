/**
 * Invoice — Event-Sourced Aggregate Root (ADR-0011 §5–§6, Waves 4–5).
 *
 * Architectural shape (locked):
 *   - State is DERIVED from an immutable event stream — never stored as
 *     mutable status fields. The aggregate keeps:
 *       #history     : full ordered event log (replay source)
 *       #uncommitted : new events not yet pulled by infrastructure
 *     and exposes status() via the `statusOf` reducer (ADR-0011 §5).
 *   - Time and identity are NEVER injected as ports. Every state-changing
 *     command takes `now: Instant` and `eventId: DomainEventId` as plain
 *     value inputs supplied by the application layer. The aggregate remains
 *     pure: no ClockPort, no IdPort, no I/O, no framework.
 *   - Sequence is gap-free 1..N and authored exclusively by the aggregate.
 *
 * Wave 5 — Payment & Void behaviors (Reviewer-Locked L1..L7):
 *   - L1: overpayment guard uses outstandingAmount() — single source of truth.
 *   - L2: paidAmount() is a pure reduction over #history (no cached field).
 *   - L3: terminal-status check fires BEFORE any arithmetic.
 *   - L4: strict guard order — status → currency → positivity → overpayment.
 *   - L5: void reason is trimmed and length-validated (1..240) BEFORE record.
 *   - L6: NO `this.#status = ...` writes anywhere; status is reducer-only.
 *   - L7: lifecycle changes ONLY via InvoiceIssued | InvoicePaymentApplied
 *         | InvoiceVoided — no other mutation path exists.
 *
 * Per ADR-0011 §6 Amendment A2:
 *   - A2-R1: the FIRST event MUST be InvoiceIssued; no payment/void may
 *            precede it in the stream.
 *   - A2-R2: NO event MAY appear after InvoiceVoided.
 *
 * Structural Draft-time edits (addLine / removeLine) intentionally do NOT
 * emit events: a Draft has no public lifecycle, no consumers, and no read
 * model — its content is captured in InvoiceIssued at the moment of issue.
 *
 * pullEvents() drains *uncommitted* events only; #history is the durable
 * replay log and is not touched by drain.
 */

import { ok, err, isErr, AggregateRoot, freezeEvent } from "@/shared-kernel";
import type { Result, Id, Instant } from "@/shared-kernel";
import { Currency } from "../shared/Currency";
import { Money } from "../shared/Money";
import type { MoneyDomainError } from "../shared/Money";
import type { InvoiceId } from "./InvoiceId";
import { InvoiceNumber } from "./InvoiceNumber";
import { InvoiceLine } from "./InvoiceLine";
import type { InvoiceLineError } from "./InvoiceLine";
import { statusOf } from "./statusOf";
import type { InvoiceStatus } from "./statusOf";
import type {
  AnyInvoiceEvent,
  DomainEventId,
  InvoiceIssued,
  InvoicePaymentApplied,
  InvoiceVoided,
  VoidReasonCode,
} from "./events";
import {
  INVOICE_ISSUED,
  INVOICE_PAYMENT_APPLIED,
  INVOICE_VOIDED,
} from "./events";
// Wave 6 — InvoiceDomainError lives in its own module (Discriminated Union).
// Re-exported here so existing consumers keep working unchanged.
export type { InvoiceDomainError } from "./errors/InvoiceDomainError";
export { assertNever } from "./errors/InvoiceDomainError";
import type { InvoiceDomainError } from "./errors/InvoiceDomainError";

/** Business identity for an invoice's counterparty. Opaque outside this VO. */
export type CustomerId = Id<"CustomerId">;

export type { InvoiceStatus } from "./statusOf";

const VOID_REASON_MIN = 1;
const VOID_REASON_MAX = 240;

/** Errors a caller may surface — aggregate-level + propagated errors. */
export type InvoiceError =
  | InvoiceDomainError
  | InvoiceLineError
  | MoneyDomainError;

export interface InvoiceCreateProps {
  readonly id: InvoiceId;
  readonly number: InvoiceNumber;
  readonly currency: Currency;
  readonly customerId?: CustomerId;
}

export class Invoice extends AggregateRoot<"InvoiceId"> {
  // ─── Draft-time mutable working set ─────────────────────────────────────
  // Pre-issuance only; captured into InvoiceIssued on issue() and never
  // mutated again. Post-issuance state lives exclusively in the event log.
  #number: InvoiceNumber;
  #currency: Currency;
  #customerId: CustomerId | undefined;
  #draftLines: InvoiceLine[];

  // ─── Event-sourced state ────────────────────────────────────────────────
  #history: AnyInvoiceEvent[] = [];
  #uncommitted: AnyInvoiceEvent[] = [];
  #nextSequence = 1;
  /** Snapshot captured from InvoiceIssued for read-side projections. */
  #issuedSnapshot: InvoiceIssued | null = null;

  private constructor(
    id: InvoiceId,
    number: InvoiceNumber,
    currency: Currency,
    customerId: CustomerId | undefined,
  ) {
    super(id);
    this.#number = number;
    this.#currency = currency;
    this.#customerId = customerId;
    this.#draftLines = [];
  }

  // ─── Factory ────────────────────────────────────────────────────────────

  static create(props: InvoiceCreateProps): Result<Invoice, InvoiceDomainError> {
    return ok(
      new Invoice(props.id, props.number, props.currency, props.customerId),
    );
  }

  // ─── Accessors (derived; never stored as primary state post-issuance) ───

  getNumber(): InvoiceNumber {
    return this.#number;
  }

  getCurrency(): Currency {
    return this.#currency;
  }

  getCustomerId(): CustomerId | undefined {
    return this.#customerId;
  }

  /**
   * Status is ALWAYS computed via the reducer. Even when the aggregate has
   * just recorded an event, the public surface presents status as derived,
   * never as a stored property. (Lock L6/L7.)
   */
  status(): InvoiceStatus {
    return statusOf(this.#history);
  }

  /** Snapshot. Mutating the returned array does not affect the aggregate. */
  getLines(): readonly InvoiceLine[] {
    const src = this.#issuedSnapshot
      ? this.#issuedSnapshot.payload.lines
      : this.#draftLines;
    return Object.freeze(src.slice());
  }

  lineCount(): number {
    return this.#issuedSnapshot
      ? this.#issuedSnapshot.payload.lines.length
      : this.#draftLines.length;
  }

  /** Read-only view of the full event log (for projections / audit). */
  getHistory(): readonly AnyInvoiceEvent[] {
    return Object.freeze(this.#history.slice());
  }

  // ─── Structural edits (Draft only; do NOT emit events) ──────────────────

  addLine(line: InvoiceLine): Result<void, InvoiceDomainError> {
    if (this.status() !== "Draft") {
      return err({
        kind: "StructuralEditLocked",
        status: this.status(),
        op: "addLine",
      });
    }
    if (!line.unitPrice.currency.equals(this.#currency)) {
      return err({
        kind: "LineCurrencyMismatch",
        invoiceCurrency: this.#currency.code,
        lineCurrency: line.unitPrice.currency.code,
      });
    }
    this.#draftLines.push(line);
    return ok(undefined);
  }

  removeLine(index: number): Result<void, InvoiceDomainError> {
    if (this.status() !== "Draft") {
      return err({
        kind: "StructuralEditLocked",
        status: this.status(),
        op: "removeLine",
      });
    }
    if (!Number.isInteger(index) || index < 0 || index >= this.#draftLines.length) {
      return err({ kind: "LineIndexOutOfRange", index });
    }
    this.#draftLines.splice(index, 1);
    return ok(undefined);
  }

  // ─── Lifecycle commands ─────────────────────────────────────────────────

  /**
   * Draft → Issued. Records InvoiceIssued with a full snapshot.
   */
  issue(
    now: Instant,
    eventId: DomainEventId,
  ): Result<void, InvoiceError> {
    if (this.status() !== "Draft") {
      return err({
        kind: "InvalidStateTransition",
        from: this.status(),
        to: "Issued",
      });
    }
    if (this.#draftLines.length === 0) {
      return err({ kind: "EmptyInvoice" });
    }

    const gross = this.#computeGross(this.#draftLines);
    if (isErr(gross)) return gross;

    const ev: InvoiceIssued = {
      id: eventId,
      occurredAt: now,
      type: INVOICE_ISSUED,
      sequence: this.#nextSequence,
      invoiceId: this.id,
      payload: {
        number: this.#number,
        currency: this.#currency,
        customerId: this.#customerId,
        lines: Object.freeze(this.#draftLines.slice()),
        totalGrossMinor: gross.value.amount,
        currencyCode: this.#currency.code,
      },
    };
    this.#append(freezeEvent(ev) as InvoiceIssued);
    return ok(undefined);
  }

  /**
   * Issued | PartiallyPaid → PartiallyPaid | Paid. Records
   * InvoicePaymentApplied with the validated minor-unit amount.
   *
   * Guard order (Lock L4, irreversible):
   *   1. status terminality (Draft/Paid/Void are rejected)   — L3
   *   2. currency uniformity                                  — financial integrity
   *   3. positivity (> 0 minor units)                         — domain rule
   *   4. overpayment vs outstandingAmount()                   — L1
   */
  applyPayment(
    amount: Money,
    now: Instant,
    eventId: DomainEventId,
  ): Result<void, InvoiceError> {
    const s = this.status();
    if (s !== "Issued" && s !== "PartiallyPaid") {
      return err({ kind: "PaymentOnTerminalStatus", status: s });
    }
    if (!amount.currency.equals(this.#currency)) {
      return err({
        kind: "PaymentCurrencyMismatch",
        invoiceCurrency: this.#currency.code,
        paymentCurrency: amount.currency.code,
      });
    }
    if (!amount.isPositive()) {
      return err({
        kind: "NonPositivePayment",
        amountMinor: amount.amount,
      });
    }
    const outstanding = this.outstandingAmount();
    if (isErr(outstanding)) return outstanding;
    if (amount.amount > outstanding.value.amount) {
      return err({
        kind: "OverPayment",
        attemptedMinor: amount.amount,
        outstandingMinor: outstanding.value.amount,
      });
    }

    const ev: InvoicePaymentApplied = {
      id: eventId,
      occurredAt: now,
      type: INVOICE_PAYMENT_APPLIED,
      sequence: this.#nextSequence,
      invoiceId: this.id,
      payload: {
        amountMinor: amount.amount,
        currencyCode: this.#currency.code,
      },
    };
    this.#append(freezeEvent(ev) as InvoicePaymentApplied);
    return ok(undefined);
  }

  /**
   * Issued | PartiallyPaid | Draft → Void. Records InvoiceVoided after
   * trimming and length-validating the reason text (Lock L5).
   *
   * Cancelled-from-Paid is explicitly rejected (Paid is terminal).
   *
   * Method name is `void` per ADR-0011 §6 (valid in ES method shorthand).
   */
  void(
    reason: string,
    now: Instant,
    eventId: DomainEventId,
    reasonCode: VoidReasonCode = "Other",
  ): Result<void, InvoiceError> {
    const s = this.status();
    if (s === "Paid" || s === "Void") {
      return err({ kind: "VoidOnTerminalStatus", status: s });
    }
    const normalized = reason.trim();
    if (normalized.length < VOID_REASON_MIN) {
      return err({
        kind: "VoidReasonInvalid",
        reason: "Empty",
        length: normalized.length,
      });
    }
    if (normalized.length > VOID_REASON_MAX) {
      return err({
        kind: "VoidReasonInvalid",
        reason: "TooLong",
        length: normalized.length,
      });
    }

    const ev: InvoiceVoided = {
      id: eventId,
      occurredAt: now,
      type: INVOICE_VOIDED,
      sequence: this.#nextSequence,
      invoiceId: this.id,
      payload: { reasonCode, reason: normalized },
    };
    this.#append(freezeEvent(ev) as InvoiceVoided);
    return ok(undefined);
  }

  // ─── Aggregation (lines source = issued snapshot if present else draft) ─

  totalNet(): Result<Money, InvoiceError> {
    return this.#fold((line) => line.lineNet());
  }

  totalTax(): Result<Money, InvoiceError> {
    return this.#fold((line) => line.lineTax());
  }

  totalGross(): Result<Money, InvoiceError> {
    return this.#fold((line) => line.lineGross());
  }

  /**
   * Pure reduction over the event history — Lock L2.
   * NO cached field exists; the value is always computed.
   */
  paidAmount(): Result<Money, MoneyDomainError> {
    let total = 0;
    for (const ev of this.#history) {
      if (ev.type === "InvoicePaymentApplied") {
        total += ev.payload.amountMinor;
      }
    }
    return Money.of(total, this.#currency);
  }

  /**
   * outstandingAmount = totalGross − paidAmount.
   * Single source of truth used by the overpayment guard (Lock L1).
   * Floors at zero if cumulative payments somehow exceed gross (shouldn't
   * occur given the L1 guard, but defended for replay-only invariants).
   */
  outstandingAmount(): Result<Money, InvoiceError> {
    const gross = this.totalGross();
    if (isErr(gross)) return gross;
    const paid = this.paidAmount();
    if (isErr(paid)) return paid;
    const diff = gross.value.sub(paid.value);
    if (isErr(diff)) return diff;
    if (diff.value.isNegative()) {
      return ok(Money.zero(this.#currency));
    }
    return diff;
  }

  #fold(
    project: (line: InvoiceLine) => Result<Money, MoneyDomainError>,
  ): Result<Money, InvoiceError> {
    const lines = this.#issuedSnapshot
      ? this.#issuedSnapshot.payload.lines
      : this.#draftLines;
    let acc = Money.zero(this.#currency);
    for (const line of lines) {
      const partial = project(line);
      if (isErr(partial)) return partial;
      const next = acc.add(partial.value);
      if (isErr(next)) return next;
      acc = next.value;
    }
    return ok(acc);
  }

  #computeGross(
    lines: readonly InvoiceLine[],
  ): Result<Money, InvoiceError> {
    let acc = Money.zero(this.#currency);
    for (const line of lines) {
      const g = line.lineGross();
      if (isErr(g)) return g;
      const next = acc.add(g.value);
      if (isErr(next)) return next;
      acc = next.value;
    }
    return ok(acc);
  }

  // ─── Event sourcing infrastructure ──────────────────────────────────────

  /**
   * Drains *uncommitted* events (recorded since the last pull) and returns
   * a frozen snapshot. The durable #history is untouched. Replayed
   * aggregates always return [] until a fresh command runs.
   */
  override pullEvents(): readonly AnyInvoiceEvent[] {
    const snapshot = Object.freeze(this.#uncommitted.slice());
    this.#uncommitted = [];
    return snapshot;
  }

  /**
   * Rebuilds an Invoice exclusively from its event history.
   *
   * Validates (in declaration order; first failure wins):
   *   - history is non-empty
   *   - sequences are gap-free 1..N
   *   - every event's invoiceId matches `id`
   *   - the FIRST event is InvoiceIssued (A2-R1)
   *   - exactly one InvoiceIssued
   *   - NO event appears after InvoiceVoided (A2-R2)
   */
  static fromHistory(
    id: InvoiceId,
    history: readonly AnyInvoiceEvent[],
  ): Result<Invoice, InvoiceDomainError> {
    if (history.length === 0) {
      return err({ kind: "RehydrationError", reason: "EmptyHistory" });
    }

    let issuedSeen = 0;
    let voidedSeen = false;
    let issuedEvent: InvoiceIssued | null = null;
    for (let i = 0; i < history.length; i++) {
      const ev = history[i];
      if (ev.sequence !== i + 1) {
        return err({ kind: "RehydrationError", reason: "NonMonotonicSequence" });
      }
      if (ev.invoiceId !== id) {
        return err({ kind: "RehydrationError", reason: "InvoiceIdMismatch" });
      }
      if (voidedSeen) {
        return err({ kind: "RehydrationError", reason: "EventAfterVoid" });
      }
      if (i === 0 && ev.type !== "InvoiceIssued") {
        return err({ kind: "RehydrationError", reason: "IssuedNotFirst" });
      }
      if (ev.type === "InvoiceIssued") {
        issuedSeen++;
        if (issuedSeen > 1) {
          return err({
            kind: "RehydrationError",
            reason: "DuplicateIssuedEvent",
          });
        }
        issuedEvent = ev;
      } else if (ev.type === "InvoiceVoided") {
        voidedSeen = true;
      }
    }
    if (issuedEvent === null) {
      return err({ kind: "RehydrationError", reason: "IssuedEventMissing" });
    }

    const payload = issuedEvent.payload;
    const inv = new Invoice(
      id,
      payload.number,
      payload.currency,
      payload.customerId,
    );
    inv.#issuedSnapshot = issuedEvent;
    inv.#history = history.slice();
    inv.#nextSequence = history.length + 1;
    // #uncommitted stays empty — replay produces NO new events.
    return ok(inv);
  }

  #append(ev: AnyInvoiceEvent): void {
    this.#history.push(ev);
    this.#uncommitted.push(ev);
    this.#nextSequence = ev.sequence + 1;
    if (ev.type === "InvoiceIssued") {
      this.#issuedSnapshot = ev;
    }
  }
}
