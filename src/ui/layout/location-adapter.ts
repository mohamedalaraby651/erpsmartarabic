/**
 * Default LocationAdapter backed by `window.location` + `popstate`.
 *
 * The Shell is router-agnostic. A `ReactRouterAdapter` ships in UX-1C
 * without touching any layout component.
 */
import type { LocationAdapter } from "./types";

export function createWindowLocationAdapter(): LocationAdapter {
  return {
    pathname() {
      return typeof window === "undefined" ? "/" : window.location.pathname;
    },
    params() {
      return Object.freeze({});
    },
    query() {
      if (typeof window === "undefined") return Object.freeze({});
      const sp = new URLSearchParams(window.location.search);
      const out: Record<string, string> = {};
      for (const [k, v] of sp.entries()) out[k] = v;
      return Object.freeze(out);
    },
    subscribe(listener) {
      if (typeof window === "undefined") return () => {};
      const handler = () => listener();
      window.addEventListener("popstate", handler);
      return () => window.removeEventListener("popstate", handler);
    },
    navigate(to) {
      if (typeof window === "undefined") return;
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  };
}
