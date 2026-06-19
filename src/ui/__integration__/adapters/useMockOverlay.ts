/**
 * Mock overlay adapter — UX-1E.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Consumes an `OverlaySpec` and returns local open/close state plus a
 * close-reason. The real Shell Dialog slot owns runtime concerns; this
 * adapter only proves the spec is consumable end-to-end.
 */
import * as React from "react";
import type { OverlaySpec } from "@/ui/contracts";

export type CloseReason = "user" | "submit" | "cancel" | "escape";

export interface MockOverlayState {
  readonly spec: OverlaySpec;
  readonly open: boolean;
  readonly lastCloseReason: CloseReason | null;
  openOverlay(): void;
  closeOverlay(reason: CloseReason): void;
}

export function useMockOverlay(spec: OverlaySpec): MockOverlayState {
  const [open, setOpen] = React.useState(false);
  const [lastCloseReason, setReason] = React.useState<CloseReason | null>(null);
  return {
    spec,
    open,
    lastCloseReason,
    openOverlay: () => {
      setOpen(true);
      setReason(null);
    },
    closeOverlay: (reason) => {
      setOpen(false);
      setReason(reason);
    },
  };
}
