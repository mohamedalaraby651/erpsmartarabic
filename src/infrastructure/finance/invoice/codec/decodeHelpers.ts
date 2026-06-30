/**
 * decodeHelpers — small JSON-safe accessors shared by all codecs.
 * Every accessor returns a Result so codecs can short-circuit cleanly
 * into a `CorruptedPersistenceData` failure with `cause.reason = "DecodeFailure"`.
 */
import { ok, err } from "@/shared-kernel";
import type { Result, RepositoryFailure } from "@/shared-kernel";
import type { JsonValue, PersistedEventRow } from "./PersistedEventRow";

export function decodeFailure(
  row: PersistedEventRow,
  field: string,
  detail: string,
): RepositoryFailure {
  return {
    kind: "CorruptedPersistenceData",
    message: `decode failure on ${row.type}@v${row.schema_version} field "${field}": ${detail}`,
    aggregateId: row.aggregate_id,
    sequence: row.sequence,
    cause: {
      reason: "DecodeFailure",
      type: row.type,
      schemaVersion: row.schema_version,
      field,
      detail,
    },
  };
}

export function asObject(
  v: JsonValue,
  row: PersistedEventRow,
  field: string,
): Result<{ readonly [k: string]: JsonValue }, RepositoryFailure> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    return err(decodeFailure(row, field, "expected object"));
  }
  return ok(v as { readonly [k: string]: JsonValue });
}

export function asString(
  v: JsonValue | undefined,
  row: PersistedEventRow,
  field: string,
): Result<string, RepositoryFailure> {
  if (typeof v !== "string")
    return err(decodeFailure(row, field, "expected string"));
  return ok(v);
}

export function asInt(
  v: JsonValue | undefined,
  row: PersistedEventRow,
  field: string,
): Result<number, RepositoryFailure> {
  if (typeof v !== "number" || !Number.isInteger(v))
    return err(decodeFailure(row, field, "expected integer"));
  return ok(v);
}

export function asArray(
  v: JsonValue | undefined,
  row: PersistedEventRow,
  field: string,
): Result<readonly JsonValue[], RepositoryFailure> {
  if (!Array.isArray(v))
    return err(decodeFailure(row, field, "expected array"));
  return ok(v as readonly JsonValue[]);
}
