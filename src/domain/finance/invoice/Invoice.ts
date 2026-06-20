/**
 * Invoice — Aggregate Root (ADR-0011 §6, Wave 3).
 *
 * Boundaries (locked):
 *   - Identity (InvoiceId) is supplied by IdPort; the aggregate NEVER mints
 *     its own id. Business identity (InvoiceNumber) is supplied by an
 *     application-layer numbering service; the aggregate NEVER generates it.
 *   - Currency uniformity (R-1101) is enforced HERE, at the aggregate edge:
 *     every line MUST share the invoice's currency. InvoiceLine intentionally
 *     does not know about its siblings — uniformity is a multi-line invariant
 *     and therefore belongs to the root.
 *   - Aggregation (totalNet / totalTax / totalGross) is the SOLE responsibility
 *     of the aggregate. Lines never sum. Aggregates are computed on demand
 *     from current lines; no derived totals are stored. The only arithmetic
 *     sites remain Money.add (exact integer) and Money.mulScalar (single
 *     rounding boundary inside line-local ops). The aggregate introduces
 *     ZERO new rounding.
 *   - Lifecycle state machine: Draft → Issued → Paid, with Cancelled reachable
 *     from Draft or Issued. Paid and Cancelled are terminal. Structural edits
 *     (addLine / removeLine / currency) are permitted ONLY in Draft.
 *
 * Out of scope for Wave 3 (deliberate, per design review):
 *   - Domain events (InvoiceIssued / InvoicePaid / InvoiceCancelled) — kept
 *     out so the aggregate stays pure; can be layered later without model
 *     change via AggregateRoot.record().
 *   - Discounts, payments tracking, partial payments, due dates.
 *   - Persistence concerns and version bumping (UX-2B).
 *
 * Pure aggregate: no I/O, no time, no infrastructure. All failures are Results.
 */

import { ok, err, isErr, AggregateRoot } from "@/shared-kernel";
import type { Result, Id } from "@/shared-kernel";
import { Currency } from "../shared/Currency";
import { Money } from "../shared/Money";
import type { MoneyDomainError } from "../shared/Money";
import type { InvoiceId } from "./InvoiceId";
import { InvoiceNumber } from "./InvoiceNumber";
import { InvoiceLine } from "./InvoiceLine";
import type { InvoiceLineError } from "./InvoiceLine";

/** Business identity for an invoice's counterparty. Opaque outside this VO. */
export type CustomerId = Id<"CustomerId">;

export type InvoiceStatus = "Draft" | "Issued" | "Paid" | "Cancelled";

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
  | { readonly kind: "LineIndexOutOfRange"; readonly index: number };

/** Errors a caller may surface — aggregate-level + propagated Money errors. */
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
  readonly #number: InvoiceNumber;
  readonly #currency: Currency;
  readonly #customerId: CustomerId | undefined;
  #status: InvoiceStatus;
  #lines: InvoiceLine[];

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
    this.#status = "Draft";
    this.#lines = [];
  }

  // ─── Factory ──────────────────────────────────────────────────────────────

  /**
   * Creates a fresh Draft invoice with no lines. Identity and business number
   * are injected — never minted here. Returns Result for symmetry with the
   * rest of the kernel even though current creation has no failure modes.
   */
  static create(props: InvoiceCreateProps): Result<Invoice, InvoiceDomainError> {
    return ok(
      new Invoice(props.id, props.number, props.currency, props.customerId),
    );
  }

  // ─── Accessors (read-only views; no internal mutation surface) ────────────

  getNumber(): InvoiceNumber {
    return this.#number;
  }

  getCurrency(): Currency {
    return this.#currency;
  }

  getCustomerId(): CustomerId | undefined {
    return this.#customerId;
  }

  getStatus(): InvoiceStatus {
    return this.#status;
  }

  /** Snapshot. Mutating the returned array does not affect the aggregate. */
  getLines(): readonly InvoiceLine[] {
    return Object.freeze(this.#lines.slice());
  }

  lineCount(): number {
    return this.#lines.length;
  }

  // ─── Structural edits (Draft-only) ────────────────────────────────────────

  addLine(line: InvoiceLine): Result<void, InvoiceDomainError> {
    if (this.#status !== "Draft") {
      return err({
        kind: "StructuralEditLocked",
        status: this.#status,
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
    this.#lines.push(line);
    return ok(undefined);
  }

  removeLine(index: number): Result<void, InvoiceDomainError> {
    if (this.#status !== "Draft") {
      return err({
        kind: "StructuralEditLocked",
        status: this.#status,
        op: "removeLine",
      });
    }
    if (!Number.isInteger(index) || index < 0 || index >= this.#lines.length) {
      return err({ kind: "LineIndexOutOfRange", index });
    }
    this.#lines.splice(index, 1);
    return ok(undefined);
  }

  // ─── Lifecycle transitions ────────────────────────────────────────────────

  issue(): Result<void, InvoiceDomainError> {
    if (this.#status !== "Draft") {
      return err({
        kind: "InvalidStateTransition",
        from: this.#status,
        to: "Issued",
      });
    }
    if (this.#lines.length === 0) {
      return err({ kind: "EmptyInvoice" });
    }
    this.#status = "Issued";
    return ok(undefined);
  }

  markPaid(): Result<void, InvoiceDomainError> {
    if (this.#status !== "Issued") {
      return err({
        kind: "InvalidStateTransition",
        from: this.#status,
        to: "Paid",
      });
    }
    this.#status = "Paid";
    return ok(undefined);
  }

  cancel(): Result<void, InvoiceDomainError> {
    if (this.#status !== "Draft" && this.#status !== "Issued") {
      return err({
        kind: "InvalidStateTransition",
        from: this.#status,
        to: "Cancelled",
      });
    }
    this.#status = "Cancelled";
    return ok(undefined);
  }

  // ─── Aggregation (the ONLY place sums live) ───────────────────────────────
  //
  // Implementation note: each line-local computation already routes through
  // Money.mulScalar (the single rounding boundary). The aggregate then folds
  // results with Money.add — exact integer addition with currency-uniformity
  // checks — introducing no further rounding and no new arithmetic site.

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
    let acc = Money.zero(this.#currency);
    for (const line of this.#lines) {
      const partial = project(line);
      if (isErr(partial)) return partial;
      const next = acc.add(partial.value);
      if (isErr(next)) return next;
      acc = next.value;
    }
    return ok(acc);
  }
}
