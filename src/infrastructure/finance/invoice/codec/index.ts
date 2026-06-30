/**
 * Codec barrel — Infrastructure-only. NOT re-exported by any
 * application/domain barrel.
 */
export { EventCodecRegistry } from "./EventCodecRegistry";
export type { EventCodec } from "./EventCodec";
export type { PersistedEventRow, JsonValue } from "./PersistedEventRow";

export { InvoiceIssuedCodecV1 } from "./codecs/InvoiceIssuedCodec";
export { InvoicePaymentAppliedCodecV1 } from "./codecs/InvoicePaymentAppliedCodec";
export { InvoiceVoidedCodecV1 } from "./codecs/InvoiceVoidedCodec";

import { EventCodecRegistry } from "./EventCodecRegistry";
import { InvoiceIssuedCodecV1 } from "./codecs/InvoiceIssuedCodec";
import { InvoicePaymentAppliedCodecV1 } from "./codecs/InvoicePaymentAppliedCodec";
import { InvoiceVoidedCodecV1 } from "./codecs/InvoiceVoidedCodec";

/** Build the default registry pre-populated with all v1 invoice codecs. */
export function createDefaultInvoiceCodecRegistry(): EventCodecRegistry {
  return new EventCodecRegistry()
    .register(InvoiceIssuedCodecV1)
    .register(InvoicePaymentAppliedCodecV1)
    .register(InvoiceVoidedCodecV1);
}
