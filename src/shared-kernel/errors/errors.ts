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
 * Canonical repository failure union (ADR-0010).
 * isRetryable() is the SINGLE classifier — no adapter may re-implement it.
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
