/**
 * Shared-kernel error taxonomy (ADR-0008 + ADR-0010).
 */

export interface DomainError {
  readonly kind: "DomainError";
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface ApplicationError {
  readonly kind: "ApplicationError";
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type InfrastructurePhase = "execution" | "commit" | "post-commit";

export interface InfrastructureFailure {
  readonly kind: "InfrastructureFailure";
  readonly phase: InfrastructurePhase;
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Canonical repository failure union (ADR-0010, refined by ADR-0012).
 * isRetryable() is the SINGLE classifier — no adapter may re-implement it.
 *
 * Serialization vs CorruptedPersistenceData (ADR-0012 refinement):
 *   - `Serialization`           transport / parse-level failures: invalid
 *                               JSON, an undecodable wire shape, an
 *                               unknown event `type` discriminator.
 *                               (Retryable: another node / replica may
 *                               return a healthy payload.)
 *   - `CorruptedPersistenceData` semantic invariant broken AT REST:
 *                               negative `sequence`, payload missing
 *                               required fields, type known but its
 *                               fields violate the domain contract. The
 *                               row itself is bad — retrying cannot help.
 *                               (Non-retryable. Operator must investigate.)
 */
export type RepositoryFailure =
  | { readonly kind: "Timeout"; readonly message: string; readonly cause?: unknown }
  | { readonly kind: "Network"; readonly message: string; readonly cause?: unknown }
  | {
      readonly kind: "Serialization";
      readonly message: string;
      readonly cause?: unknown;
    }
  | {
      readonly kind: "CorruptedPersistenceData";
      readonly message: string;
      readonly aggregateId?: string;
      readonly sequence?: number;
      readonly cause?: unknown;
    }
  | {
      readonly kind: "Conflict";
      readonly message: string;
      readonly expectedVersion?: number;
      readonly actualVersion?: number;
    }
  | { readonly kind: "DuplicateKey"; readonly message: string; readonly key?: string }
  | { readonly kind: "NotFound"; readonly message: string; readonly id?: string }
  | { readonly kind: "PermissionDenied"; readonly message: string }
  | { readonly kind: "Unknown"; readonly message: string; readonly cause?: unknown };

// Defect D3 (Wave 8 G2): under exactOptionalPropertyTypes the factories
// must NOT write `details: undefined` / `cause: undefined` onto the object.
// The optional key is attached only when the caller supplied a value.
export const DomainError = (
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): DomainError => {
  const base = { kind: "DomainError" as const, code, message };
  return details === undefined ? base : { ...base, details };
};

export const ApplicationError = (
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): ApplicationError => {
  const base = { kind: "ApplicationError" as const, code, message };
  return details === undefined ? base : { ...base, details };
};

export const InfrastructureFailure = (
  phase: InfrastructurePhase,
  code: string,
  message: string,
  cause?: unknown,
): InfrastructureFailure => {
  const base = { kind: "InfrastructureFailure" as const, phase, code, message };
  return cause === undefined ? base : { ...base, cause };
};
