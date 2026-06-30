/**
 * pgErrorMap — translate raw PostgREST / Postgres error codes into
 * `RepositoryFailure` variants (UX-2B Wave 2A).
 *
 * The map is the ONLY place adapters classify storage errors. The
 * Repository itself stays free of switch statements over error codes.
 *
 * Coverage target: 100% branch (a unit test exercises every arm). Codes
 * we don't recognize collapse to `Unknown` (non-retryable, per kernel).
 *
 * Note: this file imports NO application types and no domain types,
 * staying within the Infrastructure-only boundary.
 */
import type { RepositoryFailure } from "@/shared-kernel";

/** PostgREST-shaped error object (loose subset of `PostgrestError`). */
export interface PgLikeError {
  readonly code?: string | null;
  readonly message?: string | null;
  readonly details?: string | null;
  readonly hint?: string | null;
}

const PG = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
  INSUFFICIENT_PRIVILEGE: "42501",
  QUERY_CANCELED: "57014",
  CONNECTION_FAILURE: "08006",
  CONNECTION_EXCEPTION: "08000",
  ADMIN_SHUTDOWN: "57P01",
  // PostgREST-specific
  PGRST_NO_ROWS: "PGRST116",
} as const;

const UNIQUE_INVOICE_EVENT_SEQ = "invoice_events_aggregate_sequence_uniq";

export function mapPgError(
  e: PgLikeError | null | undefined,
  ctx: { readonly expectedVersion?: number } = {},
): RepositoryFailure {
  if (e == null) {
    return { kind: "Unknown", message: "null error" };
  }
  const code = e.code ?? "";
  const message = e.message ?? "unknown postgres error";

  switch (code) {
    case PG.UNIQUE_VIOLATION: {
      // The unique (aggregate_id, sequence) index turns a concurrent
      // append into a Conflict — that's our optimistic-concurrency miss.
      const details = `${e.details ?? ""} ${e.message ?? ""}`;
      if (
        details.includes(UNIQUE_INVOICE_EVENT_SEQ) ||
        details.includes("aggregate_id") ||
        details.includes("sequence")
      ) {
        const base = {
          kind: "Conflict" as const,
          message: `concurrent append rejected by unique (aggregate_id, sequence)`,
        };
        return ctx.expectedVersion === undefined
          ? base
          : { ...base, expectedVersion: ctx.expectedVersion };
      }
      return e.details == null
        ? { kind: "DuplicateKey", message }
        : { kind: "DuplicateKey", message, key: e.details };
    }
    case PG.FOREIGN_KEY_VIOLATION:
      return {
        kind: "CorruptedPersistenceData",
        message: `FK violation: ${message}`,
        cause: { reason: "ForeignKey", code },
      };
    case PG.CHECK_VIOLATION:
    case PG.NOT_NULL_VIOLATION:
      return {
        kind: "CorruptedPersistenceData",
        message: `constraint violation: ${message}`,
        cause: { reason: "ConstraintViolation", code },
      };
    case PG.INSUFFICIENT_PRIVILEGE:
      return { kind: "PermissionDenied", message };
    case PG.QUERY_CANCELED:
      return { kind: "Timeout", message };
    case PG.CONNECTION_FAILURE:
    case PG.CONNECTION_EXCEPTION:
    case PG.ADMIN_SHUTDOWN:
      return { kind: "Network", message };
    case PG.PGRST_NO_ROWS:
      return { kind: "NotFound", message };
    default:
      return { kind: "Unknown", message };
  }
}
