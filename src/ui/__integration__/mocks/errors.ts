/**
 * Mock domain errors — UX-1E.
 *
 * @canonicalState Spike
 * @since UX-1E
 *
 * Pure discriminated union; never thrown from the data layer (there is none).
 * Adapters surface these as plain values the harness can render.
 */

export interface ValidationError {
  readonly kind: "validation";
  readonly field: string;
  readonly message: string;
}

export interface NetworkError {
  readonly kind: "network";
  readonly status: number;
  readonly message: string;
}

export interface PermissionError {
  readonly kind: "permission";
  readonly message: string;
}

export type MockError = ValidationError | NetworkError | PermissionError;

export function isMockError(value: unknown): value is MockError {
  if (!value || typeof value !== "object") return false;
  const k = (value as { kind?: unknown }).kind;
  return k === "validation" || k === "network" || k === "permission";
}
