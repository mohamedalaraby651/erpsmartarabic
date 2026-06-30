/**
 * SupabaseInvoiceRepository — pure transport adapter (UX-2B Wave 2A, R2).
 *
 * Design rules (ALL enforced):
 *   - Adapter is "schema-version blind": it never reads, writes, or
 *     branches on a version literal. All envelope semantics live in the
 *     EventCodec(Registry). A unit test (`*.purity.test.ts`) greps this
 *     file for forbidden literals.
 *   - Adapter never calls `Invoice.fromHistory`; rehydration lives in
 *     `EventStreamRehydrator` (R5 separation).
 *   - Adapter never throws — every failure is a `Result.err` whose
 *     payload is a `RepositoryFailure` produced by `pgErrorMap`.
 *   - Adapter never reads its own writes inside the same call
 *     (`check-transaction-finality`).
 *   - Adapter takes `ctx.tenantId` and forwards it on every insert; RLS
 *     enforces the rest at the DB layer (Wave 2B migration).
 */
import { ok, err, isErr } from "@/shared-kernel";
import type {
  Result,
  RepositoryFailure,
  RequestContext,
} from "@/shared-kernel";
import type {
  Invoice,
  InvoiceRepository,
  InvoiceId,
  AnyInvoiceEvent,
} from "@/domain/finance";
import type { EventCodecRegistry } from "../codec/EventCodecRegistry";
import type { EventStreamRehydrator } from "../rehydrator/EventStreamRehydrator";
import type { PersistedEventRow } from "../codec/PersistedEventRow";
import { mapPgError } from "./pgErrorMap";

/** Minimal Supabase-client surface this adapter consumes. Keeps tests fakeable. */
export interface InvoiceEventStoreClient {
  from(table: "invoice_events"): InvoiceEventTable;
}
export interface InvoiceEventTable {
  select(cols: "*"): InvoiceEventSelect;
  insert(rows: readonly InsertRow[]): Promise<{
    readonly error: { readonly code?: string | null; readonly message?: string | null; readonly details?: string | null } | null;
  }>;
}
export interface InvoiceEventSelect {
  eq(col: "aggregate_id", val: string): InvoiceEventSelect;
  order(col: "sequence", opts: { ascending: true }): Promise<{
    readonly data: readonly PersistedEventRow[] | null;
    readonly error: { readonly code?: string | null; readonly message?: string | null; readonly details?: string | null } | null;
  }>;
}

/** Row inserted into invoice_events; widened with tenant_id (RLS, Wave 2B). */
type InsertRow = PersistedEventRow & { readonly tenant_id: string };

export interface SupabaseInvoiceRepositoryDeps {
  readonly client: InvoiceEventStoreClient;
  readonly codec: EventCodecRegistry;
  readonly rehydrator: EventStreamRehydrator;
}

export class SupabaseInvoiceRepository implements InvoiceRepository {
  readonly #deps: SupabaseInvoiceRepositoryDeps;
  constructor(deps: SupabaseInvoiceRepositoryDeps) {
    this.#deps = deps;
  }

  async load(
    id: InvoiceId,
    _ctx: Readonly<RequestContext>,
  ): Promise<Result<Invoice, RepositoryFailure>> {
    const res = await this.#deps.client
      .from("invoice_events")
      .select("*")
      .eq("aggregate_id", String(id))
      .order("sequence", { ascending: true });

    if (res.error) return err(mapPgError(res.error));
    const rows = res.data ?? [];
    if (rows.length === 0)
      return err({
        kind: "NotFound",
        message: "invoice not found",
        id: String(id),
      });

    return this.#deps.rehydrator.rehydrate(id, rows);
  }

  async appendEvents(
    id: InvoiceId,
    expectedVersion: number,
    events: readonly AnyInvoiceEvent[],
    ctx: Readonly<RequestContext>,
  ): Promise<Result<void, RepositoryFailure>> {
    if (events.length === 0) return ok(undefined);

    const rows: InsertRow[] = [];
    for (const ev of events) {
      const encR = this.#deps.codec.encode(ev);
      if (isErr(encR)) return err(encR.error);
      rows.push({ ...encR.value, tenant_id: ctx.tenantId });
    }

    const res = await this.#deps.client.from("invoice_events").insert(rows);
    if (res.error) return err(mapPgError(res.error, { expectedVersion }));
    return ok(undefined);
  }
}
