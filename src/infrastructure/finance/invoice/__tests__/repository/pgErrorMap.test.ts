/**
 * pgErrorMap — 100% branch coverage.
 * Every recognized SQLSTATE and PostgREST-specific code maps to the
 * documented RepositoryFailure variant; unknown codes collapse to
 * `Unknown`. The unique-on-(aggregate_id, sequence) variant becomes
 * `Conflict` and carries the supplied `expectedVersion`.
 */
import { describe, it, expect } from "vitest";
import { mapPgError } from "../../repository/pgErrorMap";

describe("mapPgError", () => {
  it("null error → Unknown", () => {
    expect(mapPgError(null).kind).toBe("Unknown");
    expect(mapPgError(undefined).kind).toBe("Unknown");
  });

  it("unique on (aggregate_id, sequence) → Conflict + expectedVersion", () => {
    const r = mapPgError(
      {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "invoice_events_aggregate_sequence_uniq"',
        details: "Key (aggregate_id, sequence) already exists.",
      },
      { expectedVersion: 3 },
    );
    expect(r.kind).toBe("Conflict");
    expect((r as { expectedVersion?: number }).expectedVersion).toBe(3);
  });

  it("unique on (aggregate_id, sequence) WITHOUT expectedVersion stays Conflict", () => {
    const r = mapPgError({
      code: "23505",
      details: "aggregate_id, sequence",
      message: "dup",
    });
    expect(r.kind).toBe("Conflict");
    expect((r as { expectedVersion?: number }).expectedVersion).toBeUndefined();
  });

  it("other unique violation → DuplicateKey", () => {
    const r = mapPgError({
      code: "23505",
      message: "dup",
      details: "Key (number) already exists.",
    });
    expect(r.kind).toBe("DuplicateKey");
  });

  it("unique violation with no details → DuplicateKey without key", () => {
    const r = mapPgError({ code: "23505", message: "dup" });
    expect(r.kind).toBe("DuplicateKey");
  });

  it("FK violation → CorruptedPersistenceData{ForeignKey}", () => {
    const r = mapPgError({ code: "23503", message: "fk" });
    expect(r.kind).toBe("CorruptedPersistenceData");
  });

  it("check / not-null violation → CorruptedPersistenceData{ConstraintViolation}", () => {
    expect(mapPgError({ code: "23514", message: "ck" }).kind).toBe(
      "CorruptedPersistenceData",
    );
    expect(mapPgError({ code: "23502", message: "nn" }).kind).toBe(
      "CorruptedPersistenceData",
    );
  });

  it("permission denied → PermissionDenied", () => {
    expect(mapPgError({ code: "42501", message: "no" }).kind).toBe(
      "PermissionDenied",
    );
  });

  it("query canceled → Timeout", () => {
    expect(mapPgError({ code: "57014", message: "x" }).kind).toBe("Timeout");
  });

  it("connection codes → Network", () => {
    for (const c of ["08006", "08000", "57P01"]) {
      expect(mapPgError({ code: c, message: "x" }).kind).toBe("Network");
    }
  });

  it("PGRST116 → NotFound", () => {
    expect(mapPgError({ code: "PGRST116", message: "x" }).kind).toBe(
      "NotFound",
    );
  });

  it("unknown SQLSTATE → Unknown", () => {
    expect(mapPgError({ code: "ZZZZZ", message: "x" }).kind).toBe("Unknown");
  });

  it("missing code/message defaults still classify", () => {
    expect(mapPgError({}).kind).toBe("Unknown");
  });
});
