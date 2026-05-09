import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TapTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Auto-close delay after tap-open (ms). 0 = stay until outside tap. */
  autoCloseMs?: number;
  /** If true, the first tap opens the tooltip and the second tap activates the child's onClick. */
  tapToReveal?: boolean;
}

/**
 * Tooltip that also opens on tap (touch devices), not just hover/focus.
 * - Desktop: behaves like a normal Radix Tooltip (hover + focus).
 * - Touch: tap once to reveal the tooltip; tap again (or outside) to dismiss.
 *   When `tapToReveal` is true, the first tap is "consumed" (child onClick is suppressed)
 *   and the second tap fires the child's onClick. This is the iOS/Android pattern.
 */
export function TapTooltip({
  content,
  children,
  side = "bottom",
  align = "center",
  autoCloseMs = 2200,
  tapToReveal = false,
}: TapTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const isTouchRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleClose = React.useCallback(() => {
    clearTimer();
    if (autoCloseMs > 0) {
      timerRef.current = window.setTimeout(() => setOpen(false), autoCloseMs);
    }
  }, [autoCloseMs]);

  React.useEffect(() => () => clearTimer(), []);

  // Dismiss on outside tap when open via touch.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-tap-tooltip-root]")) setOpen(false);
    };
    document.addEventListener("pointerdown", handler, { capture: true });
    return () => document.removeEventListener("pointerdown", handler, { capture: true } as any);
  }, [open]);

  const childOnClick = (children.props as any).onClick as
    | ((e: React.MouseEvent) => void)
    | undefined;

  const enhanced = React.cloneElement(children, {
    onPointerDown: (e: React.PointerEvent) => {
      isTouchRef.current = e.pointerType === "touch" || e.pointerType === "pen";
      (children.props as any).onPointerDown?.(e);
    },
    onClick: (e: React.MouseEvent) => {
      if (isTouchRef.current) {
        if (tapToReveal && !open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
          scheduleClose();
          return;
        }
        // Non-reveal mode: show tooltip briefly AND let click pass through.
        if (!tapToReveal) {
          setOpen(true);
          scheduleClose();
        } else {
          setOpen(false);
        }
      }
      childOnClick?.(e);
    },
  });

  return (
    <span data-tap-tooltip-root className="contents">
      <Tooltip open={open || undefined} onOpenChange={setOpen}>
        <TooltipTrigger asChild>{enhanced}</TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
