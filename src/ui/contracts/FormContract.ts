/**
 * Form contract — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Schema-agnostic form descriptors. No Zod, no runtime validators
 * (Invariant C8). A schema adapter slot is exposed by the Form composite
 * itself; the contract only declares its shape.
 */
import type { CompositeEvent, EventPayload } from "./CompositeEvent";

export type FormLifecyclePhase =
  | "idle"
  | "dirty"
  | "submitting"
  | "submitted"
  | "error";

export interface FieldDescriptor {
  readonly name: string;
  readonly label?: string;
  readonly required?: boolean;
  readonly hint?: string;
}

export interface FormDirtyPayload extends EventPayload {
  readonly dirty: boolean;
}

export interface FormSubmitPayload extends EventPayload {
  readonly id: string;
}

export interface FormResetPayload extends EventPayload {
  readonly id: string;
}

export interface FormErrorPayload extends EventPayload {
  readonly id: string;
  readonly message: string;
}

export type FormUIEvent =
  | CompositeEvent<"form.dirty", FormDirtyPayload>
  | CompositeEvent<"form.submit", FormSubmitPayload>
  | CompositeEvent<"form.reset", FormResetPayload>
  | CompositeEvent<"form.error", FormErrorPayload>;
