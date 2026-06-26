/**
 * InvoiceApplicationError — the SOLE error type that may cross the
 * application boundary for the Invoice use-cases (UX-2B Wave 1).
 *
 * Reviewer-locked contract (the boundary rule):
 *   Handlers return `Promise<Result<TOk, InvoiceApplicationError>>`.
 *   NO `DomainError`, NO `RepositoryFailure`, NO `InfrastructureFailure`,
 *   NO raw `InvoiceDomainError` variants ever leak out. All such failures
 *   are translated here, inside the application layer, into one of the
 *   variants below. The UI / API layer therefore depends ONLY on this
 *   union — never on the kernel, the domain, or any adapter.
 *
 * The mapping is mechanical and exhaustive — see `fromDomainError` /
 * `fromRepositoryFailure` below.
 *
 * Discriminator layout (machine-typed, no UI messages):
 *   - ValidationError          DTO/VO validation failure (Currency, Money,
 *                              InvoiceNumber, InvoiceLine, command shape).
 *   - DomainRuleViolation      Aggregate rejected the command (e.g.
 *                              OverPayment, PaymentOnTerminalStatus,
 *                              VoidOnTerminalStatus, EmptyInvoice…).
 *   - NotFound                 Repository.load returned NotFound.
 *   - ConcurrencyConflict      appendEvents returned Conflict (optimistic
 *                              concurrency check fired).
 *   - InfrastructureUnavailable Every other RepositoryFailure variant.
 *                              `retryable` is sourced from the kernel's
 *                              `isRetryable` — application code never
 *                              re-classifies retry semantics (ADR-0010).
 */

import { isRetryable } from "@/shared-kernel";
import type { RepositoryFailure } from "@/shared-kernel";
import type {
  InvoiceDomainError,
  InvoiceError,
  InvoiceLineError,
  MoneyDomainError,
  CurrencyDomainError,
  TaxRateDomainError,
  InvoiceNumberDomainError,
} from "@/domain/finance";

// ── Error-code namespaces ─────────────────────────────────────────────────
// Strings are stable identifiers (machine-readable). UI/API layers may
// localize them; the application layer never carries presentation text.
export const ERR = {
  // ValidationError codes
  INVALID_CURRENCY: "INVOICE_APP/INVALID_CURRENCY",
  INVALID_MONEY: "INVOICE_APP/INVALID_MONEY",
  INVALID_TAX_RATE: "INVOICE_APP/INVALID_TAX_RATE",
  INVALID_INVOICE_NUMBER: "INVOICE_APP/INVALID_INVOICE_NUMBER",
  INVALID_INVOICE_LINE: "INVOICE_APP/INVALID_INVOICE_LINE",
  INVALID_COMMAND: "INVOICE_APP/INVALID_COMMAND",
  // DomainRuleViolation codes (kept aligned with InvoiceDomainError.kind)
  DOMAIN_RULE: "INVOICE_APP/DOMAIN_RULE",
  // Infrastructure codes
  NOT_FOUND: "INVOICE_APP/NOT_FOUND",
  CONCURRENCY_CONFLICT: "INVOICE_APP/CONCURRENCY_CONFLICT",
  INFRA_UNAVAILABLE: "INVOICE_APP/INFRA_UNAVAILABLE",
} as const;

export type InvoiceApplicationError =
  | {
      readonly kind: "ValidationError";
      readonly code: string;
      readonly field: string;
      readonly details?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: "DomainRuleViolation";
      readonly code: typeof ERR.DOMAIN_RULE;
      readonly rule: string; // mirrors InvoiceDomainError.kind / line kinds
      readonly details?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: "NotFound";
      readonly code: typeof ERR.NOT_FOUND;
      readonly invoiceId: string;
    }
  | {
      readonly kind: "ConcurrencyConflict";
      readonly code: typeof ERR.CONCURRENCY_CONFLICT;
      readonly expectedVersion?: number;
      readonly actualVersion?: number;
    }
  | {
      readonly kind: "InfrastructureUnavailable";
      readonly code: typeof ERR.INFRA_UNAVAILABLE;
      readonly cause:
        | "Timeout"
        | "Network"
        | "Serialization"
        | "DuplicateKey"
        | "PermissionDenied"
        | "Unknown";
      readonly retryable: boolean;
    };

// ─────────────────────────────────────────────────────────────────────────
// Factories — application-internal use only.
// They build the variant WITHOUT attaching optional fields when undefined
// (compatible with exactOptionalPropertyTypes).
// ─────────────────────────────────────────────────────────────────────────

export const validationError = (
  code: string,
  field: string,
  details?: Readonly<Record<string, unknown>>,
): InvoiceApplicationError => {
  const base = { kind: "ValidationError" as const, code, field };
  return details === undefined ? base : { ...base, details };
};

export const domainRuleViolation = (
  rule: string,
  details?: Readonly<Record<string, unknown>>,
): InvoiceApplicationError => {
  const base = {
    kind: "DomainRuleViolation" as const,
    code: ERR.DOMAIN_RULE,
    rule,
  };
  return details === undefined ? base : { ...base, details };
};

export const notFound = (invoiceId: string): InvoiceApplicationError => ({
  kind: "NotFound",
  code: ERR.NOT_FOUND,
  invoiceId,
});

// ─────────────────────────────────────────────────────────────────────────
// Mechanical translators.
//
// These are the ONLY translators in the application layer. Handlers must
// route every external error through them so the boundary stays sealed.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Translate any domain-level error reachable from the Invoice aggregate
 * (InvoiceDomainError, InvoiceLineError, MoneyDomainError) into an
 * application-boundary error.
 *
 * Pure VO validation failures (Currency/Money/TaxRate/InvoiceNumber)
 * surface as ValidationError. Aggregate guard violations
 * (InvoiceDomainError) surface as DomainRuleViolation. The kind string
 * is preserved verbatim in `rule` / `field` so UI/API layers can branch
 * deterministically without knowing the kernel taxonomy.
 */
export function fromInvoiceError(
  e: InvoiceError | InvoiceLineError | MoneyDomainError,
): InvoiceApplicationError {
  switch (e.kind) {
    // Money kernel errors — VO-level (treat as input validation)
    case "InvalidAmount":
    case "AmountOverflow":
    case "CurrencyMismatch":
    case "InvalidScalar":
      return validationError(ERR.INVALID_MONEY, "money", {
        moneyKind: e.kind,
        ...e,
      });
    // InvoiceLine VO errors
    case "InvalidQuantity":
    case "NegativeUnitPrice":
      return validationError(ERR.INVALID_INVOICE_LINE, "line", {
        lineKind: e.kind,
        ...e,
      });
    // Aggregate-level guard violations
    case "EmptyInvoice":
    case "InvalidStateTransition":
    case "LineCurrencyMismatch":
    case "StructuralEditLocked":
    case "LineIndexOutOfRange":
    case "PaymentOnTerminalStatus":
    case "PaymentCurrencyMismatch":
    case "NonPositivePayment":
    case "OverPayment":
    case "VoidOnTerminalStatus":
    case "VoidReasonInvalid":
    case "RehydrationError":
      return domainRuleViolation(e.kind, { ...e });
    default: {
      // Exhaustive — any new domain variant forces a compile-time update.
      const _exhaustive: never = e;
      return validationError(ERR.INVALID_COMMAND, "unknown", {
        unknown: String((_exhaustive as { kind?: string }).kind ?? "?"),
      });
    }
  }
}

export function fromInvoiceDomainError(
  e: InvoiceDomainError,
): InvoiceApplicationError {
  return fromInvoiceError(e);
}

export function fromCurrencyError(
  e: CurrencyDomainError,
): InvoiceApplicationError {
  return validationError(ERR.INVALID_CURRENCY, "currencyCode", { ...e });
}

export function fromTaxRateError(
  e: TaxRateDomainError,
): InvoiceApplicationError {
  return validationError(ERR.INVALID_TAX_RATE, "taxBasisPoints", { ...e });
}

export function fromInvoiceNumberError(
  e: InvoiceNumberDomainError,
): InvoiceApplicationError {
  return validationError(ERR.INVALID_INVOICE_NUMBER, "number", { ...e });
}

/**
 * Translate a RepositoryFailure (kernel taxonomy) into an
 * application-boundary error. NotFound / Conflict are promoted to their
 * own discriminators because callers (UI/API) routinely branch on them.
 * Every other variant is collapsed to InfrastructureUnavailable, with
 * `retryable` sourced from the kernel's single classifier (isRetryable).
 */
export function fromRepositoryFailure(
  rf: RepositoryFailure,
  fallbackInvoiceId?: string,
): InvoiceApplicationError {
  switch (rf.kind) {
    case "NotFound":
      return notFound(rf.id ?? fallbackInvoiceId ?? "");
    case "Conflict": {
      const base = {
        kind: "ConcurrencyConflict" as const,
        code: ERR.CONCURRENCY_CONFLICT,
      };
      const withExp =
        rf.expectedVersion === undefined
          ? base
          : { ...base, expectedVersion: rf.expectedVersion };
      return rf.actualVersion === undefined
        ? withExp
        : { ...withExp, actualVersion: rf.actualVersion };
    }
    case "Timeout":
    case "Network":
    case "Serialization":
    case "DuplicateKey":
    case "PermissionDenied":
    case "Unknown":
      return {
        kind: "InfrastructureUnavailable",
        code: ERR.INFRA_UNAVAILABLE,
        cause: rf.kind,
        retryable: isRetryable(rf),
      };
    default: {
      const _exhaustive: never = rf;
      return {
        kind: "InfrastructureUnavailable",
        code: ERR.INFRA_UNAVAILABLE,
        cause: "Unknown",
        retryable: false,
      };
    }
  }
}
