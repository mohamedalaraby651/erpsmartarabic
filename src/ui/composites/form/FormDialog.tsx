/**
 * FormDialog — UX-1D (declarative overlay spec).
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Invariant C11: Shell owns overlay lifecycle. FormDialog emits an
 * `OverlaySpec` to the Shell Dialog slot and does NOT render a portal,
 * focus trap, or escape handler itself.
 *
 * Usage:
 *   const spec = useFormDialog({ id, title, bodySlot: "myFormBody" });
 *   <ShellDialogSlot spec={spec} open={open} onClose={...} />
 */
import * as React from "react";
import type {
  CompositeEventHandler,
  OverlaySpec,
  OverlayUIEvent,
} from "@/ui/contracts";

export interface FormDialogConfig {
  id: string;
  title: string;
  description?: string;
  size?: OverlaySpec["size"];
  dismissible?: boolean;
  bodySlot: string;
  footerSlot?: string;
}

export interface FormDialogResult {
  spec: OverlaySpec;
  open: (handler?: CompositeEventHandler<OverlayUIEvent>) => void;
  close: (
    reason: "user" | "submit" | "cancel" | "escape",
    handler?: CompositeEventHandler<OverlayUIEvent>,
  ) => void;
}

export function useFormDialog(config: FormDialogConfig): FormDialogResult {
  const spec = React.useMemo<OverlaySpec>(
    () => ({
      id: config.id,
      title: config.title,
      description: config.description,
      size: config.size ?? "md",
      dismissible: config.dismissible ?? true,
      bodySlot: config.bodySlot,
      footerSlot: config.footerSlot,
    }),
    [
      config.id,
      config.title,
      config.description,
      config.size,
      config.dismissible,
      config.bodySlot,
      config.footerSlot,
    ],
  );
  return {
    spec,
    open: (handler) =>
      handler?.({ type: "overlay.open", payload: { id: config.id } }),
    close: (reason, handler) =>
      handler?.({
        type: "overlay.close",
        payload: { id: config.id, reason },
      }),
  };
}

/**
 * FormDialog — declarative React wrapper that exposes the spec via render
 * prop. It deliberately renders NO DOM of its own (no portal, no overlay).
 * The Shell Dialog slot is the sole owner of overlay runtime.
 */
export interface FormDialogProps {
  config: FormDialogConfig;
  children: (result: FormDialogResult) => React.ReactNode;
}

export function FormDialog({ config, children }: FormDialogProps) {
  const result = useFormDialog(config);
  return <>{children(result)}</>;
}
