/**
 * Infrastructure / Finance / Invoice — INTERNAL barrel.
 *
 * This barrel is consumed ONLY by the Composition Root
 * (`src/composition/finance.ts`). It is NEVER imported by the Domain or
 * Application layers — that boundary is enforced by
 * `check-adapter-error-boundary` (bidirectional).
 */
export { SupabaseInvoiceRepository } from "./repository/SupabaseInvoiceRepository";
export type {
  SupabaseInvoiceRepositoryDeps,
  InvoiceEventStoreClient,
} from "./repository/SupabaseInvoiceRepository";
export { mapPgError } from "./repository/pgErrorMap";
export type { PgLikeError } from "./repository/pgErrorMap";

export { EventStreamRehydrator } from "./rehydrator/EventStreamRehydrator";

export {
  EventCodecRegistry,
  createDefaultInvoiceCodecRegistry,
  InvoiceIssuedCodecV1,
  InvoicePaymentAppliedCodecV1,
  InvoiceVoidedCodecV1,
} from "./codec";
export type { EventCodec, PersistedEventRow, JsonValue } from "./codec";
