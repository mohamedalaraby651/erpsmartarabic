/**
 * ThemeProvider — applies layout state (theme mode, variant, direction)
 * to the DOM. Only writes `data-theme`, `data-variant`, `dir`, and the
 * `dark` class on `<html>`. No coupling to app code.
 *
 * Wave 2 (UX-3A): theme resolution now goes through
 * `src/ui/providers/themeRegistry.ts` (ADR-0030). Behavior is unchanged
 * for existing consumers; the registry is the extension point.
 */
import { useEffect, type ReactNode } from "react";
import { useLayout } from "./LayoutProvider";
import { getTheme } from "./themeRegistry";

function resolveMode(mode: "light" | "dark" | "system"): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { state } = useLayout();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const resolved = resolveMode(state.themeMode);
    // Resolve through the registry so future themes plug in without
    // editing this provider (ADR-0030). Fall back gracefully if a caller
    // set an unknown id — preserve Wave 1 behavior.
    const themeDef = getTheme(resolved);
    const dataAttr = themeDef?.dataAttr ?? resolved;
    const prefersDark = themeDef?.prefersDark ?? resolved === "dark";
    root.classList.toggle("dark", prefersDark);
    root.setAttribute("data-theme", dataAttr);
    root.setAttribute("data-variant", state.themeVariant);
    root.setAttribute("data-density", state.density);
    root.setAttribute("dir", state.dir);
    root.setAttribute("lang", state.dir === "rtl" ? "ar" : "en");
  }, [state.themeMode, state.themeVariant, state.density, state.dir]);

  // Re-apply when system theme flips.
  useEffect(() => {
    if (typeof window === "undefined" || state.themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const themeDef = getTheme(mq.matches ? "dark" : "light");
      document.documentElement.classList.toggle("dark", themeDef?.prefersDark ?? mq.matches);
      document.documentElement.setAttribute("data-theme", themeDef?.dataAttr ?? (mq.matches ? "dark" : "light"));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [state.themeMode]);

  return <>{children}</>;
}
