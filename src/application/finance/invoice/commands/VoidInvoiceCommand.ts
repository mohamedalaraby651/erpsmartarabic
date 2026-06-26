/**
 * VoidInvoiceCommand — primitive DTO for the Void use case.
 *
 * `reasonCode` is an enum drawn from the domain's `VoidReasonCode`.
 * Trimming / length validation of `reason` is performed INSIDE the
 * aggregate (Lock L5) — the handler forwards the raw string verbatim.
 */
import type { InvoiceId, VoidReasonCode } from "@/domain/finance";

export interface VoidInvoiceCommand {
  readonly invoiceId: InvoiceId;
  readonly reason: string;
  readonly reasonCode?: VoidReasonCode;
}

export interface VoidInvoiceResult {
  readonly invoiceId: InvoiceId;
  /** Aggregate version AFTER the append. */
  readonly newVersion: number;
  readonly status: "Void";
}
