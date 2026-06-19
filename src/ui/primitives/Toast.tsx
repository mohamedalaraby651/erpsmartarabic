/**
 * Canonical Toast — re-exports `sonner` with token-driven defaults.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 *
 * The host (`<Toaster />`) is intended to be mounted once at app root or
 * via a Shell slot. The imperative API (`toast(...)`) is workspace-safe.
 */
import * as React from "react";
import { Toaster as SonnerToaster, toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ToasterProps
  extends React.ComponentProps<typeof SonnerToaster> {}

export function Toaster({ className, ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className={cn("toaster group", className)}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { toast };
