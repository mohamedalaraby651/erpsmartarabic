/**
 * InvoiceLine — Value Object owned by the Invoice aggregate (ADR-0011 §6).
 *
 * Aggregate-boundary contract:
 *   - InvoiceLine computes ONLY its own line-local values:
 *       lineNet   = unitPrice * qty
 *       lineTax   = taxRate.apply(lineNet)        (delegates to Money.mulScalar)
 *       lineGross = lineNet + lineTax
 *   - It does NOT aggregate across lines. Subtotal / tax total / grand total
 *     are the sole responsibility of the Invoice aggregate root.
 *   - It performs NO rounding. The single rounding boundary remains
 *     `Money.mulScalar` (ADR-0011 §4 R-1106c + Amendment A1). Even pure
 *     integer scaling (qty * amount) is routed through `mulScalar(qty, 1)`
 *     so the kernel exposes exactly one multiplication site.
 *
 * Locked invariants enforced here (R-1103, R-1104):
 *   - qty is an integer and qty > 0
 *   - unitPrice.amount >= 0
 *
 * Currency uniformity across lines (R-1101) is the aggregate's responsibility,
 * not the line's — a single line trivially holds a single currency.
 *
 * Pure VO: no I/O, no time, no infrastructure, no identity, no events.
 * All failures are Results.
 */

import { ok, err, isErr } from "@/shared-kernel";
import type { Result } from "@/shared-kernel";
import { Money } from "../shared/Money";
import type { MoneyDomainError } from "../shared/Money";
import { TaxRate } from "../shared/TaxRate";

export type InvoiceLineDomainError =
  | {
      readonly kind: "InvalidQuantity";
      readonly qty: number;
      readonly reason: "NonInteger" | "NonPositive" | "Unsafe";
    }
  | {
      readonly kind: "NegativeUnitPrice";
      readonly amount: number;
      readonly currencyCode: string;
    };

/** Errors a line may surface — own validation + propagated Money errors. */
export type InvoiceLineError = InvoiceLineDomainError | MoneyDomainError;

export interface InvoiceLineProps {
  readonly qty: number;
  readonly unitPrice: Money;
  readonly taxRate: TaxRate;
}

export class InvoiceLine {
  public readonly qty: number;
  public readonly unitPrice: Money;
  public readonly taxRate: TaxRate;

  private constructor(qty: number, unitPrice: Money, taxRate: TaxRate) {
    this.qty = qty;
    this.unitPrice = unitPrice;
    this.taxRate = taxRate;
    Object.freeze(this);
  }

  // ─── Factory ──────────────────────────────────────────────────────────────

  static of(
    props: InvoiceLineProps,
  ): Result<InvoiceLine, InvoiceLineDomainError> {
    const { qty, unitPrice, taxRate } = props;

    if (!Number.isInteger(qty)) {
      return err({ kind: "InvalidQuantity", qty, reason: "NonInteger" });
    }
    if (qty <= 0) {
      return err({ kind: "InvalidQuantity", qty, reason: "NonPositive" });
    }
    if (Math.abs(qty) > Number.MAX_SAFE_INTEGER) {
      return err({ kind: "InvalidQuantity", qty, reason: "Unsafe" });
    }
    if (unitPrice.amount < 0) {
      return err({
        kind: "NegativeUnitPrice",
        amount: unitPrice.amount,
        currencyCode: unitPrice.currency.code,
      });
    }

    return ok(new InvoiceLine(qty, unitPrice, taxRate));
  }

  // ─── Line-local computations (no aggregation, no rounding here) ───────────

  /**
   * lineNet = unitPrice * qty.
   * Routed through `Money.mulScalar(qty, 1)` to keep `mulScalar` as the sole
   * multiplication boundary in the finance kernel. denominator=1 means no
   * rounding ever occurs for this op — it is exact integer scaling.
   */
  lineNet(): Result<Money, MoneyDomainError> {
    return this.unitPrice.mulScalar(this.qty, 1);
  }

  /**
   * lineTax = taxRate.apply(lineNet). Delegates entirely to TaxRate, which
   * itself delegates to Money.mulScalar. No new arithmetic site introduced.
   */
  lineTax(): Result<Money, MoneyDomainError> {
    const net = this.lineNet();
    if (net.kind === "err") return net;
    return this.taxRate.apply(net.value);
  }

  /**
   * lineGross = lineNet + lineTax. Pure integer addition through Money.add,
   * which already enforces currency uniformity (here trivially satisfied).
   */
  lineGross(): Result<Money, MoneyDomainError> {
    const net = this.lineNet();
    if (net.kind === "err") return net;
    const tax = this.taxRate.apply(net.value);
    if (tax.kind === "err") return tax;
    return net.value.add(tax.value);
  }
}
