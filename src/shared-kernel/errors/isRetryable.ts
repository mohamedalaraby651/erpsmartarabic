/**
 * SINGLE source of repository retry classification (ADR-0010, Rule R-0010-03).
 *
 * Retryable: Timeout, Network, Serialization
 * Non-retryable: Conflict, DuplicateKey, NotFound, PermissionDenied, Unknown
 *
 * Enforced by check-retryability-single-source: exactly one exported
 * isRetryable in shared-kernel/errors/**; zero re-implementations elsewhere.
 */
import type { RepositoryFailure } from "./errors";

export function isRetryable(failure: RepositoryFailure): boolean {
  switch (failure.kind) {
    case "Timeout":
    case "Network":
    case "Serialization":
      return true;
    case "CorruptedPersistenceData":
    case "Conflict":
    case "DuplicateKey":
    case "NotFound":
    case "PermissionDenied":
    case "Unknown":
      return false;
    default: {
      // Exhaustiveness guard
      const _exhaustive: never = failure;
      void _exhaustive;
      return false;
    }
  }
}
