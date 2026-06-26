/**
 * InvoiceRepository — Event-Sourced write-side port (ADR-0011 §7 + A2-bis C1).
 *
 * Wave 6 hard contracts:
 *   1. NO `save(invoice)`. Persistence is an append of the events the
 *      aggregate just produced via `pullEvents()`.
 *   2. `appendEvents(id, expectedVersion, events, ctx)` where
 *      `expectedVersion` = the aggregate's pre-append version, i.e. the
 *      length of `#history` AT LOAD time:
 *        - brand-new aggregate (never persisted) → `expectedVersion = 0`
 *        - rehydrated from N events, M new events to append → `N`
 *      Storage mismatch ⇒ `RepositoryFailure { kind: "Conflict",
 *      expectedVersion, actualVersion }`.
 *   3. `load(id, ctx)` MUST return either the rehydrated aggregate or a
 *      `RepositoryFailure { kind: "NotFound" }` — never `null`.
 *   4. Every method takes `ctx: Readonly<RequestContext>`. The port MUST
 *      NOT mutate it.
 *
 * Forbidden in any implementation of this port:
 *   - leaking `SupabaseClient`, raw SQL fragments, or HTTP types into the
 *     return signature
 *   - throwing on business conflicts (use `RepositoryFailure.Conflict`)
 *   - performing reads after a write within the same call (transaction
 *     finality — enforced by `check-transaction-finality`)
 */
import type {
  Result,
  RepositoryFailure,
  RequestContext,
} from "@/shared-kernel";
import type { Invoice } from "../Invoice";
import type { InvoiceId } from "../InvoiceId";
import type { AnyInvoiceEvent } from "../events";

export interface InvoiceRepository {
  load(
    id: InvoiceId,
    ctx: Readonly<RequestContext>,
  ): Promise<Result<Invoice, RepositoryFailure>>;

  appendEvents(
    id: InvoiceId,
    expectedVersion: number,
    events: readonly AnyInvoiceEvent[],
    ctx: Readonly<RequestContext>,
  ): Promise<Result<void, RepositoryFailure>>;
}
