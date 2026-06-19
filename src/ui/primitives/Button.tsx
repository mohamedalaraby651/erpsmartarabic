/**
 * Canonical Button — UX-1A primitive pilot.
 *
 * Purpose
 *   First canonical component built strictly on design tokens. It exercises
 *   every token category (colors, typography, radius, motion, elevation)
 *   so we can validate the token contract before scaling to the full
 *   primitive set in UX-1C.
 *
 * Rules
 *   - All visual properties derive from CSS variables (semantic tokens).
 *   - No hardcoded HSL/HEX/RGB or pixel radii.
 *   - API is intentionally a strict superset of `shadcn/ui` Button so the
 *     migration path from `src/components/ui/button` is a drop-in import
 *     swap once the rest of the system catches up.
 *
 * Lifecycle: Candidate → promoted to Canonical at end of UX-1A.
 * See: docs/architecture/CANONICAL_COMPONENT_CRITERIA.md
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — typography (font-medium), radius (rounded-md → var(--radius)),
  // motion (transition-colors → tokens.motion), focus ring (ring tokens),
  // disabled state, icon slot sizing.
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md text-sm font-medium",
    "ring-offset-background transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      elevation: {
        none: "shadow-none",
        sm: "shadow-sm",
        md: "shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      elevation: "none",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child slot (Radix Slot) — useful for `<Link>` wrappers. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, elevation, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, elevation, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
