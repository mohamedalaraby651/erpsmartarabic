/**
 * Application layer — Invoice use cases (UX-2B Wave 1, SOLE public surface).
 *
 * Outside `src/application/finance/**`, consumers MUST import from this
 * barrel only. The handlers expose only primitive DTOs and the sealed
 * `InvoiceApplicationError` union — never raw domain errors, never
 * `RepositoryFailure`, never `InfrastructureFailure`.
 */

// Handlers
export { IssueInvoiceHandler } from "./handlers/IssueInvoiceHandler";
export type { IssueInvoiceHandlerDeps } from "./handlers/IssueInvoiceHandler";
export { ApplyInvoicePaymentHandler } from "./handlers/ApplyInvoicePaymentHandler";
export type { ApplyInvoicePaymentHandlerDeps } from "./handlers/ApplyInvoicePaymentHandler";
export { VoidInvoiceHandler } from "./handlers/VoidInvoiceHandler";
export type { VoidInvoiceHandlerDeps } from "./handlers/VoidInvoiceHandler";

// Commands (primitive DTOs + result shapes)
export type {
  IssueInvoiceCommand,
  IssueInvoiceLineInput,
  IssueInvoiceResult,
  ApplyInvoicePaymentCommand,
  ApplyInvoicePaymentResult,
  VoidInvoiceCommand,
  VoidInvoiceResult,
} from "./commands";

// Sealed error surface
export type { InvoiceApplicationError } from "./errors/InvoiceApplicationError";
export { ERR as INVOICE_APP_ERR } from "./errors/InvoiceApplicationError";
