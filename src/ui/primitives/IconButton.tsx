/**
 * Canonical IconButton — icon-only action.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 *
 * Requires an accessible name via `aria-label` or `aria-labelledby`.
 * Minimum 44×44 tap target for `size="md"` to satisfy mobile a11y rules.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { assertAccessibleName } from "./_internal/a11y";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "soft" | "solid" | "outline";
  /** Required accessible name. */
  "aria-label"?: string;
}

const sizeMap = {
  sm: "h-9 w-9",
  md: "h-11 w-11", // 44px = mobile a11y minimum
  lg: "h-12 w-12",
} as const;

const variantMap = {
  ghost: "hover:bg-accent hover:text-accent-foreground",
  soft: "bg-accent/40 hover:bg-accent text-accent-foreground",
  solid: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-input bg-background hover:bg-accent",
} as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", variant = "ghost", ...props }, ref) => {
    assertAccessibleName("IconButton", props);
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={cn(
          "inline-flex items-center justify-center rounded-md",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:size-5 [&_svg]:shrink-0",
          sizeMap[size],
          variantMap[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";
