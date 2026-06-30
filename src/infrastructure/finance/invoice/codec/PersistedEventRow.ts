/**
 * EncodedEvent / PersistedEventRow — Infrastructure-only event row shapes
 * (UX-2B Wave 2A, refinement R2: schema_version is owned by the Codec).
 *
 * `PersistedEventRow` is the on-the-wire row exchanged with the database.
 * It uses snake_case to match the SQL column names so the Repository can
 * pass arrays straight to `client.from('invoice_events').insert(rows)`
 * with NO field renaming on its side (and therefore NO `schema_version`
 * literal in the Repository file — enforced by a purity test).
 *
 * Hard rule: nothing outside `src/infrastructure/finance/**` may import
 * these types. They are not re-exported from any application/domain
 * barrel; the Application layer speaks only `AnyInvoiceEvent`.
 */

/** JSON-safe value space accepted by the codecs. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [k: string]: JsonValue };

/**
 * Persisted row — what the DB returns and what we insert.
 * `metadata` is non-nullable on encode (default `{}`); on decode the
 * Codec coerces `null` → `{}`.
 */
export interface PersistedEventRow {
  readonly event_id: string;
  readonly aggregate_id: string;
  readonly sequence: number;
  readonly type: string;
  readonly schema_version: number;
  readonly payload: JsonValue;
  readonly metadata: { readonly [k: string]: JsonValue };
  readonly occurred_at: string; // ISO-8601 UTC
}
