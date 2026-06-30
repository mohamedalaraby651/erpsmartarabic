/**
 * Finance Composition Root (UX-2B Wave 2B, ADR-0012 §D-0012-06).
 *
 * This is the ONE place permitted to import from `@/domain/finance`,
 * `@/application/finance`, AND `@/infrastructure/finance` in the same
 * file. Enforced by `check-composition-root-uniqueness` (≤1 root) and by
 * `check-adapter-error-boundary` (which scopes its bans to
 * `src/application` and `src/infrastructure` — NOT this directory).
 *
 * Hard rules (Wave 2B G-THIN):
 *   - No business logic. The body composes objects only.
 *   - No conditional branching beyond optional dependency-injection.
 *   - No I/O at module-load time (factory is invoked by the app shell).
 *   - No re-export of infrastructure symbols to the wider app.
 *
 * Public surface:
 *   - `createFinanceModule(deps)` returns the three application handlers
 *     wired against a single repository instance.
 *   - The returned `FinanceModule` exposes ONLY application-layer types.
 */
import type { ClockPort, IdPort } from "@/shared-kernel";
import {
  IssueInvoiceHandler,
  ApplyInvoicePaymentHandler,
  VoidInvoiceHandler,
} from "@/application/finance";
import {
  SupabaseInvoiceRepository,
  EventStreamRehydrator,
  createDefaultInvoiceCodecRegistry,
} from "@/infrastructure/finance/invoice";
import type { InvoiceEventStoreClient } from "@/infrastructure/finance/invoice";

export interface FinanceModuleDeps {
  /** Supabase-like client; only `from('invoice_events')` is consumed. */
  readonly client: InvoiceEventStoreClient;
  readonly clock: ClockPort;
  readonly idPort: IdPort;
}

export interface FinanceModule {
  readonly issueInvoice: IssueInvoiceHandler;
  readonly applyPayment: ApplyInvoicePaymentHandler;
  readonly voidInvoice: VoidInvoiceHandler;
}

export function createFinanceModule(deps: FinanceModuleDeps): FinanceModule {
  const codec = createDefaultInvoiceCodecRegistry();
  const rehydrator = new EventStreamRehydrator(codec);
  const repository = new SupabaseInvoiceRepository({
    client: deps.client,
    codec,
    rehydrator,
  });
  const handlerDeps = {
    repository,
    clock: deps.clock,
    idPort: deps.idPort,
  } as const;
  return Object.freeze({
    issueInvoice: new IssueInvoiceHandler(handlerDeps),
    applyPayment: new ApplyInvoicePaymentHandler(handlerDeps),
    voidInvoice: new VoidInvoiceHandler(handlerDeps),
  });
}
