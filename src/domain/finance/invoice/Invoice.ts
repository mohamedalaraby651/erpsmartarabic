/**
 * Invoice — Event-Sourced Aggregate Root (ADR-0011 §5–§6, Wave 4).
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
 * Wave 4 wires the Draft → Issued transition end-to-end (event recorded,
 * replayed, drained). Payment and Void *behavior* are deferred to Wave 5;
 * their event payloads and the reducer already account for them so Wave 5
 * is purely additive.
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
} from "./events";
import { INVOICE_ISSUED } from "./events";

/** Business identity for an invoice's counterparty. Opaque outside this VO. */
export type CustomerId = Id<"CustomerId">;

export type { InvoiceStatus } from "./statusOf";

export type InvoiceDomainError =
  | { readonly kind: "EmptyInvoice" }
  | {
      readonly kind: "InvalidStateTransition";
      readonly from: InvoiceStatus;
      readonly to: InvoiceStatus;
    }
  | {
      readonly kind: "LineCurrencyMismatch";
      readonly invoiceCurrency: string;
      readonly lineCurrency: string;
    }
  | {
      readonly kind: "StructuralEditLocked";
      readonly status: InvoiceStatus;
      readonly op: "addLine" | "removeLine";
    }
  | { readonly kind: "LineIndexOutOfRange"; readonly index: number }
  | {
      readonly kind: "RehydrationError";
      readonly reason:
        | "EmptyHistory"
        | "NonMonotonicSequence"
        | "IssuedEventMissing"
        | "DuplicateIssuedEvent"
        | "InvoiceIdMismatch";
    };

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
   * never as a stored property.
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
   *
   * Inputs `now` and `eventId` are plain values; the aggregate is unaware
   * of their origin (ClockPort / IdPort live in the application layer).
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

    // Compute gross snapshot ONCE, here, using the same aggregate-level fold
    // policy as Wave 3 (sum of per-line rounded values; no aggregate re-round).
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
   * Drains *uncommitted* events (those recorded since the last pull) and
   * returns them as a frozen snapshot. The durable #history is untouched.
   *
   *   record(A); record(B); pullEvents() === [A, B]
   *   pullEvents()                       === []
   *
   * This mirrors the AggregateRoot.pullEvents contract from the kernel
   * but operates on the aggregate's own uncommitted buffer (the kernel's
   * default buffer is intentionally unused here because event-sourced
   * aggregates need both a history log AND a drain buffer).
   */
  override pullEvents(): readonly AnyInvoiceEvent[] {
    const snapshot = Object.freeze(this.#uncommitted.slice());
    this.#uncommitted = [];
    return snapshot;
  }

  /**
   * Rebuilds an Invoice exclusively from its event history. No snapshot
   * input (Wave 4 design): snapshots are a Wave-8+ performance concern
   * and must not leak into the model.
   *
   * Validates:
   *   - history is non-empty
   *   - sequences are gap-free 1..N
   *   - every event's invoiceId matches `id`
   *   - exactly one InvoiceIssued (and it is sequence 1 — the only event
   *     that introduces the snapshot the reducer relies on)
   */
  static fromHistory(
    id: InvoiceId,
    history: readonly AnyInvoiceEvent[],
  ): Result<Invoice, InvoiceDomainError> {
    if (history.length === 0) {
      return err({ kind: "RehydrationError", reason: "EmptyHistory" });
    }

    let issuedSeen = 0;
    let issuedEvent: InvoiceIssued | null = null;
    for (let i = 0; i < history.length; i++) {
      const ev = history[i];
      if (ev.sequence !== i + 1) {
        return err({
          kind: "RehydrationError",
          reason: "NonMonotonicSequence",
        });
      }
      if (ev.invoiceId !== id) {
        return err({
          kind: "RehydrationError",
          reason: "InvoiceIdMismatch",
        });
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
      }
    }
    if (issuedEvent === null) {
      return err({
        kind: "RehydrationError",
        reason: "IssuedEventMissing",
      });
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
