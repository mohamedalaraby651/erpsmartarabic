/**
 * InvoiceReadModel — read-side projection port (ADR-0011 §7 + A2-bis C3).
 *
 * Wave 6 hard contracts:
 *   - Return shape is `InvoiceView` only (see InvoiceView.ts).
 *   - All monetary amounts cross the boundary as `{ minor: string;
 *     currency: string }` — never `Money`, never `bigint`, never `number`
 *     for amounts.
 *   - Failures use `RepositoryFailure` (`NotFound` for missing aggregates).
 *   - List queries return `Page<InvoiceView>` (shared-kernel pagination).
 */
import type {
  Result,
  RepositoryFailure,
  RequestContext,
  Page,
  PageRequest,
} from "@/shared-kernel";
import type { InvoiceId } from "../InvoiceId";
import type { InvoiceStatus } from "../statusOf";
import type { InvoiceView } from "./InvoiceView";

export interface InvoiceListQuery {
  readonly page: PageRequest;
  readonly status?: InvoiceStatus;
  readonly customerId?: string;
  readonly currency?: string;
}

export interface InvoiceReadModel {
  byId(
    id: InvoiceId,
    ctx: Readonly<RequestContext>,
  ): Promise<Result<InvoiceView, RepositoryFailure>>;

  list(
    query: InvoiceListQuery,
    ctx: Readonly<RequestContext>,
  ): Promise<Result<Page<InvoiceView>, RepositoryFailure>>;
}
