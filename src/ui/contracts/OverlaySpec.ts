/**
 * OverlaySpec — declarative overlay descriptor — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Invariant C11: Shell owns overlay lifecycle (focus trap, stacking, escape,
 * portal). Composites describe what to render, never how to mount it.
 *
 * `body` and `footer` are slot identifiers, not React nodes — the contract
 * stays runtime-free (Invariant C8). The Shell Dialog slot resolves
 * identifiers to renderers it owns.
 */
import type { CompositeEvent, EventPayload } from "./CompositeEvent";

export type OverlaySize = "sm" | "md" | "lg" | "xl";

export interface OverlaySpec {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly size?: OverlaySize;
  readonly dismissible?: boolean;
  /** Slot identifier resolved by the Shell Dialog renderer. */
  readonly bodySlot: string;
  /** Optional footer slot identifier. */
  readonly footerSlot?: string;
}

export interface OverlayOpenPayload extends EventPayload {
  readonly id: string;
}

export interface OverlayClosePayload extends EventPayload {
  readonly id: string;
  readonly reason: "user" | "submit" | "cancel" | "escape";
}

export type OverlayUIEvent =
  | CompositeEvent<"overlay.open", OverlayOpenPayload>
  | CompositeEvent<"overlay.close", OverlayClosePayload>;
