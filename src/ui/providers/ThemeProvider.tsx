/**
 * ThemeProvider — applies layout state (theme mode, variant, direction)
 * to the DOM. Only writes `data-theme`, `data-variant`, `dir`, and the
 * `dark` class on `<html>`. No coupling to app code.
 */
import { useEffect, type ReactNode } from "react";
import { useLayout } from "./LayoutProvider";

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
    root.classList.toggle("dark", resolved === "dark");
    root.setAttribute("data-theme", resolved);
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
      document.documentElement.classList.toggle("dark", mq.matches);
      document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [state.themeMode]);

  return <>{children}</>;
}
