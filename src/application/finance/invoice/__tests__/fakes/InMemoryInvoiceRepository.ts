/**
 * InMemoryInvoiceRepository — pure test double for `InvoiceRepository`.
 *
 * Storage model: a Map<InvoiceIdString, AnyInvoiceEvent[]>. Optimistic
 * concurrency is enforced by comparing `expectedVersion` to the current
 * stored history length. The aggregate is rehydrated via
 * `Invoice.fromHistory` on every `load` — no in-memory aggregate cache,
 * so behavior matches a real event store.
 *
 * Failure injection: callers may set `failNext` to simulate Conflict /
 * Timeout / Network / Unknown, supporting concurrency and retryability
 * tests without touching real infrastructure.
 */
import { ok, err } from "@/shared-kernel";
import type {
  Result,
  RepositoryFailure,
  RequestContext,
} from "@/shared-kernel";
import { Invoice } from "@/domain/finance";
import type {
  InvoiceRepository,
  InvoiceId,
  AnyInvoiceEvent,
} from "@/domain/finance";

export type RepoFailureSpec =
  | { readonly kind: "Conflict"; readonly actualVersion?: number }
  | { readonly kind: "Timeout" }
  | { readonly kind: "Network" }
  | { readonly kind: "Serialization" }
  | { readonly kind: "DuplicateKey" }
  | { readonly kind: "PermissionDenied" }
  | { readonly kind: "Unknown" }
  | { readonly kind: "NotFound" };

export class InMemoryInvoiceRepository implements InvoiceRepository {
  readonly #store = new Map<string, AnyInvoiceEvent[]>();
  /** Mutating helpers exposed for tests only. */
  failNextLoad: RepoFailureSpec | null = null;
  failNextAppend: RepoFailureSpec | null = null;
  appendCalls = 0;
  loadCalls = 0;

  async load(
    id: InvoiceId,
    _ctx: Readonly<RequestContext>,
  ): Promise<Result<Invoice, RepositoryFailure>> {
    this.loadCalls += 1;
    if (this.failNextLoad) {
      const f = this.failNextLoad;
      this.failNextLoad = null;
      return err(this.#materialize(f, id));
    }
    const history = this.#store.get(String(id));
    if (!history || history.length === 0) {
      return err({ kind: "NotFound", message: "invoice not found", id: String(id) });
    }
    const reh = Invoice.fromHistory(id, history.slice());
    if (reh.kind === "err") {
      return err({
        kind: "Serialization",
        message: `corrupt history: ${reh.error.kind}`,
      });
    }
    return ok(reh.value);
  }

  async appendEvents(
    id: InvoiceId,
    expectedVersion: number,
    events: readonly AnyInvoiceEvent[],
    _ctx: Readonly<RequestContext>,
  ): Promise<Result<void, RepositoryFailure>> {
    this.appendCalls += 1;
    if (this.failNextAppend) {
      const f = this.failNextAppend;
      this.failNextAppend = null;
      return err(this.#materialize(f, id, expectedVersion));
    }
    const key = String(id);
    const existing = this.#store.get(key) ?? [];
    if (existing.length !== expectedVersion) {
      return err({
        kind: "Conflict",
        message: "version mismatch",
        expectedVersion,
        actualVersion: existing.length,
      });
    }
    const next = existing.concat(events);
    this.#store.set(key, next);
    return ok(undefined);
  }

  // ── Test helpers ──────────────────────────────────────────────────────
  historyOf(id: InvoiceId): readonly AnyInvoiceEvent[] {
    return (this.#store.get(String(id)) ?? []).slice();
  }
  size(): number {
    return this.#store.size;
  }
  clear(): void {
    this.#store.clear();
    this.appendCalls = 0;
    this.loadCalls = 0;
    this.failNextLoad = null;
    this.failNextAppend = null;
  }

  #materialize(
    f: RepoFailureSpec,
    id: InvoiceId,
    expectedVersion?: number,
  ): RepositoryFailure {
    switch (f.kind) {
      case "Conflict": {
        const base = {
          kind: "Conflict" as const,
          message: "injected conflict",
        };
        const withExp =
          expectedVersion === undefined
            ? base
            : { ...base, expectedVersion };
        return f.actualVersion === undefined
          ? withExp
          : { ...withExp, actualVersion: f.actualVersion };
      }
      case "NotFound":
        return { kind: "NotFound", message: "injected", id: String(id) };
      case "Timeout":
        return { kind: "Timeout", message: "injected timeout" };
      case "Network":
        return { kind: "Network", message: "injected network" };
      case "Serialization":
        return { kind: "Serialization", message: "injected serialization" };
      case "DuplicateKey":
        return { kind: "DuplicateKey", message: "injected duplicate" };
      case "PermissionDenied":
        return { kind: "PermissionDenied", message: "injected perm" };
      case "Unknown":
        return { kind: "Unknown", message: "injected unknown" };
    }
  }
}
