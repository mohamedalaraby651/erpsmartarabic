/**
 * Shared primitive types — UX-1C.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 */
import type { ElementType, ReactNode } from "react";

export type Size = "sm" | "md" | "lg";
export type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info";
export type Variant = "solid" | "soft" | "outline" | "ghost";
export type Density = "comfortable" | "compact";

/** Polymorphic `as` prop helper. Kept minimal to avoid type-explosion. */
export type AsProp<C extends ElementType> = { as?: C };

export interface WithChildren {
  children?: ReactNode;
}

export interface FieldAriaProps {
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}
