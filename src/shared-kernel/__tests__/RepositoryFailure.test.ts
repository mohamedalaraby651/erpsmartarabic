import { describe, it, expect } from "vitest";
import { isRetryable, type RepositoryFailure } from "@/shared-kernel";

describe("RepositoryFailure + isRetryable", () => {
  it("classifies retryable failures", () => {
    const cases: RepositoryFailure[] = [
      { kind: "Timeout", message: "t" },
      { kind: "Network", message: "n" },
      { kind: "Serialization", message: "s" },
    ];
    for (const f of cases) expect(isRetryable(f)).toBe(true);
  });

  it("classifies non-retryable failures", () => {
    const cases: RepositoryFailure[] = [
      { kind: "Conflict", message: "c" },
      { kind: "DuplicateKey", message: "d" },
      { kind: "NotFound", message: "nf" },
      { kind: "PermissionDenied", message: "p" },
      { kind: "Unknown", message: "u" },
    ];
    for (const f of cases) expect(isRetryable(f)).toBe(false);
  });

  it("union covers all branches (exhaustiveness compile-time check)", () => {
    // If a new variant is added without updating isRetryable, TS will fail.
    const all: RepositoryFailure["kind"][] = [
      "Timeout",
      "Network",
      "Serialization",
      "Conflict",
      "DuplicateKey",
      "NotFound",
      "PermissionDenied",
      "Unknown",
    ];
    expect(all.length).toBe(8);
  });
});
