import type { NavigationPort, NavigationTarget } from "../../NavigationPort";

/**
 * Thin browser navigation adapter using history + location.
 * Wave 2 will replace with a router-aware adapter injected from the shell.
 */
export class BrowserNavigationAdapter implements NavigationPort {
  navigate(target: NavigationTarget): void {
    if (typeof window === "undefined") return;
    if (target.replace) window.history.replaceState(target.state ?? null, "", target.path);
    else window.history.pushState(target.state ?? null, "", target.path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: target.state ?? null }));
  }
  back(): void {
    if (typeof window !== "undefined") window.history.back();
  }
  current(): string {
    if (typeof window === "undefined") return "/";
    return window.location.pathname + window.location.search;
  }
}
