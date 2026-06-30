/**
 * SupabaseInvoiceRepository — unit tests against a hand-rolled fake
 * `InvoiceEventStoreClient`. No real network; no `@supabase/*` import.
 *
 * Asserts the four contractual behaviors:
 *   1. `load()` of an empty stream → NotFound.
 *   2. `load()` of a valid stream rehydrates the aggregate.
 *   3. `appendEvents()` translates a unique-constraint error to Conflict.
 *   4. `appendEvents([])` is a no-op (ok).
 */
import { describe, it, expect } from "vitest";
import { isErr, isOk } from "@/shared-kernel";
import {
  SupabaseInvoiceRepository,
  createDefaultInvoiceCodecRegistry,
  EventStreamRehydrator,
} from "../../index";
import type { PersistedEventRow } from "../../codec/PersistedEventRow";
import {
  IssueInvoiceHandler,
} from "@/application/finance";
import {
  makeDeps,
  makeIssueCmd,
  TEST_CTX,
  makeInvoiceId,
} from "@/application/finance/invoice/__tests__/fakes/testKit";

// ── Fake client ─────────────────────────────────────────────────────────
type PgErr = { code?: string | null; message?: string | null; details?: string | null };
function fakeClient(opts: {
  rows?: PersistedEventRow[];
  loadError?: PgErr;
  insertError?: PgErr;
}) {
  const inserts: unknown[][] = [];
  return {
    inserts,
    client: {
      from(_t: "invoice_events") {
        return {
          select(_cols: "*") {
            const chain = {
              eq(_c: "aggregate_id", _v: string) {
                return chain;
              },
              async order(_c: "sequence", _o: { ascending: true }) {
                return opts.loadError
                  ? { data: null, error: opts.loadError }
                  : { data: opts.rows ?? [], error: null };
              },
            };
            return chain;
          },
          async insert(rows: readonly unknown[]) {
            inserts.push([...rows]);
            return opts.insertError
              ? { error: opts.insertError }
              : { error: null };
          },
        };
      },
    },
  };
}

async function buildOneIssuedRow(): Promise<{
  row: PersistedEventRow;
  invoiceId: ReturnType<typeof makeInvoiceId>;
}> {
  const { repository, clock, idPort } = makeDeps();
  const issue = new IssueInvoiceHandler({ repository, clock, idPort });
  const id = makeInvoiceId("inv-supa-1");
  await issue.execute(makeIssueCmd({ invoiceId: id }), TEST_CTX);
  const events = repository.historyOf(id);
  const reg = createDefaultInvoiceCodecRegistry();
  const enc = reg.encode(events[0]!);
  if (!isOk(enc)) throw new Error("enc");
  return { row: enc.value as PersistedEventRow, invoiceId: id };
}


describe("SupabaseInvoiceRepository", () => {
  const codec = createDefaultInvoiceCodecRegistry();
  const rehydrator = new EventStreamRehydrator(codec);

  it("load() on empty stream → NotFound", async () => {
    const { client } = fakeClient({ rows: [] });
    const repo = new SupabaseInvoiceRepository({ client, codec, rehydrator });
    const r = await repo.load(makeInvoiceId("none"), TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("NotFound");
  });

  it("load() rehydrates a valid stream", async () => {
    const { row, invoiceId } = await buildOneIssuedRow();
    const { client } = fakeClient({ rows: [row] });
    const repo = new SupabaseInvoiceRepository({ client, codec, rehydrator });
    const r = await repo.load(invoiceId, TEST_CTX);
    expect(isOk(r)).toBe(true);
  });

  it("load() PostgREST error → mapped failure (Network)", async () => {
    const { client } = fakeClient({ loadError: { code: "08006", message: "x" } });
    const repo = new SupabaseInvoiceRepository({ client, codec, rehydrator });
    const r = await repo.load(makeInvoiceId("any"), TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("Network");
  });

  it("appendEvents([]) is a no-op ok", async () => {
    const { client, inserts } = fakeClient({});
    const repo = new SupabaseInvoiceRepository({ client, codec, rehydrator });
    const r = await repo.appendEvents(makeInvoiceId("x"), 0, [], TEST_CTX);
    expect(isOk(r)).toBe(true);
    expect(inserts).toEqual([]);
  });

  it("appendEvents forwards tenant_id on every row", async () => {
    const { row, invoiceId } = await buildOneIssuedRow();
    const decoded = codec.decode(row);
    if (!isOk(decoded)) throw new Error();
    const { client, inserts } = fakeClient({});
    const repo = new SupabaseInvoiceRepository({ client, codec, rehydrator });
    const r = await repo.appendEvents(invoiceId, 0, [decoded.value], TEST_CTX);
    expect(isOk(r)).toBe(true);
    expect((inserts[0] as { tenant_id: string }[])[0]!.tenant_id).toBe(
      "tenant-test",
    );
  });

  it("unique-violation on insert → Conflict carrying expectedVersion", async () => {
    const { row, invoiceId } = await buildOneIssuedRow();
    const decoded = codec.decode(row);
    if (!isOk(decoded)) throw new Error();
    const { client } = fakeClient({
      insertError: {
        code: "23505",
        message: "dup",
        details: "aggregate_id, sequence",
      },
    });
    const repo = new SupabaseInvoiceRepository({ client, codec, rehydrator });
    const r = await repo.appendEvents(invoiceId, 7, [decoded.value], TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("Conflict");
    expect((r.error as { expectedVersion?: number }).expectedVersion).toBe(7);
  });
});
