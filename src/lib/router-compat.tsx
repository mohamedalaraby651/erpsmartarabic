/**
 * Router-compat shim — bridges @/lib/router-compat v6 call sites to
 * @tanstack/react-router without hand-rewriting every component.
 * This is the same load-bearing pattern used in Klar's dev-copy migration.
 */
import {
  useNavigate as tsNavigate,
  useLocation as tsLocation,
  useParams as tsParams,
  useSearch as tsSearch,
  useRouter,
  Link as TSLink,
  Navigate as TSNavigate,
  Outlet as TSOutlet,
} from "@tanstack/react-router";
import { useMemo, useCallback, forwardRef, type ComponentProps, type ReactNode } from "react";

// ---------- shared URL parsing ----------

function parseTo(to: string): { pathname: string; search?: Record<string, string>; hash?: string } {
  const [beforeHash, hashStr] = (to ?? "").split("#");
  const [pathname, searchStr] = beforeHash.split("?");
  return {
    // react-router keeps the current path for search-only ("?a=1") and
    // hash-only ("#section") targets; TanStack's "." means current route.
    pathname: pathname || ".",
    search: searchStr ? Object.fromEntries(new URLSearchParams(searchStr)) : undefined,
    hash: hashStr || undefined,
  };
}

// ---------- useNavigate ----------

type NavigateOptions = { replace?: boolean; state?: unknown };

type NavigateFn = {
  (to: string | number, options?: NavigateOptions): void;
  (delta: number): void;
};

export function useNavigate(): NavigateFn {
  const tsNav = tsNavigate();
  const router = useRouter();
  return useCallback((to: string | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      router.history.go(to);
      return;
    }
    const { pathname, search, hash } = parseTo(to);
    tsNav({
      to: pathname,
      search: search as never,
      hash,
      state: options?.state as never,
      replace: options?.replace,
    });
  }, [tsNav, router]) as NavigateFn;
}

// ---------- useLocation ----------

export function useLocation() {
  const loc = tsLocation();
  return useMemo(
    () => ({
      pathname: loc.pathname,
      search: loc.searchStr ? `?${loc.searchStr}` : "",
      hash: loc.hash ?? "",
      state: (loc.state ?? null) as unknown,
      key: loc.pathname + (loc.searchStr ?? ""),
    }),
    [loc.pathname, loc.searchStr, loc.hash, loc.state],
  );
}

// ---------- useParams ----------

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return tsParams({ strict: false } as never) as T;
}


// ---------- useSearchParams (@/lib/router-compat compat) ----------

export function useSearchParams(): [URLSearchParams, (init: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams), opts?: { replace?: boolean }) => void] {
  const loc = tsLocation();
  const nav = tsNavigate();
  const router = useRouter();
  const params = useMemo(() => new URLSearchParams(loc.searchStr ?? ""), [loc.searchStr]);
  const setParams = useCallback(
    (
      init: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
      opts?: { replace?: boolean },
    ) => {
      // Functional updaters read the router's live location, not the render
      // snapshot — react-router passes call-time params, and chained updates
      // within one tick must see each other's writes.
      const live = router.state.location;
      const current = new URLSearchParams(live.searchStr ?? "");
      const next =
        typeof init === "function"
          ? init(current)
          : init instanceof URLSearchParams
            ? init
            : new URLSearchParams(init);
      const searchObj: Record<string, string> = {};
      next.forEach((v, k) => { searchObj[k] = v; });
      nav({ to: live.pathname, search: searchObj as never, replace: opts?.replace });
    },
    [nav, router],
  );
  return [params, setParams];
}

// ---------- Link ----------

type LinkProps = Omit<ComponentProps<typeof TSLink>, "to"> & {
  to: string;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, children, ...rest },
  ref,
) {
  const { pathname, search, hash } = parseTo(to);
  return (
    <TSLink
      ref={ref as never}
      to={pathname as never}
      search={search as never}
      hash={hash}
      replace={replace}
      state={state as never}
      {...((rest ?? {}) as Record<string, unknown>)}
    >
      {children}
    </TSLink>
  );
});


// ---------- Navigate ----------

export function Navigate({ to, replace, state }: { to: string; replace?: boolean; state?: unknown }) {
  const { pathname, search, hash } = parseTo(to);
  return <TSNavigate to={pathname as never} search={search as never} hash={hash} state={state as never} replace={replace} />;
}

// ---------- Outlet ----------

export const Outlet = TSOutlet;

// ---------- matchPath / useMatch (react-router v6 semantics, subset) ----------

export type PathPattern = { path: string; end?: boolean; caseSensitive?: boolean };
export type PathMatch = { params: Record<string, string | undefined>; pathname: string; pattern: PathPattern };

function compilePath(path: string, end: boolean, caseSensitive: boolean): { re: RegExp; keys: string[] } {
  const keys: string[] = [];
  let source =
    "^" +
    path
      .replace(/\/*\*?$/, "")
      .replace(/^\/*/, "/")
      .replace(/[\\.*+^${}|()[\]]/g, "\\$&")
      .replace(/\/:([\w-]+)(\?)?/g, (_m, key: string, optional?: string) => {
        keys.push(key);
        return optional ? "(?:/([^\\/]+))?" : "/([^\\/]+)";
      });
  if (path.endsWith("*")) {
    keys.push("*");
    source += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    source += "\\/*$";
  } else if (path !== "" && path !== "/") {
    source += "(?:(?=\\/|$))";
  }
  return { re: new RegExp(source, caseSensitive ? undefined : "i"), keys };
}

export function matchPath(pattern: PathPattern | string, pathname: string): PathMatch | null {
  const p: PathPattern = typeof pattern === "string" ? { path: pattern, end: true } : pattern;
  const { re, keys } = compilePath(p.path, p.end ?? true, p.caseSensitive ?? false);
  const m = pathname.match(re);
  if (!m) return null;
  const params: Record<string, string | undefined> = {};
  keys.forEach((k, i) => {
    const v = m[i + 1];
    params[k] = v === undefined ? undefined : decodeURIComponent(v);
  });
  return { params, pathname: m[0] ?? pathname, pattern: p };
}

export function useMatch(pattern: PathPattern | string): PathMatch | null {
  const { pathname } = useLocation();
  const key = typeof pattern === "string" ? pattern : `${pattern.path}|${pattern.end}|${pattern.caseSensitive}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => matchPath(pattern, pathname), [key, pathname]);
}

// ---------- NavLink (active-state aware) ----------

type NavLinkRenderProps = { isActive: boolean; isPending: boolean; isTransitioning: boolean };

export type NavLinkProps = Omit<LinkProps, "className" | "style" | "children"> & {
  end?: boolean;
  caseSensitive?: boolean;
  className?: string | ((props: NavLinkRenderProps) => string | undefined);
  style?: React.CSSProperties | ((props: NavLinkRenderProps) => React.CSSProperties | undefined);
  children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end = false, caseSensitive = false, className, style, children, ...rest },
  ref,
) {
  const { pathname } = useLocation();
  const target = parseTo(to).pathname;
  const isActive =
    target !== "." &&
    matchPath({ path: target, end, caseSensitive }, pathname) !== null;
  const state: NavLinkRenderProps = { isActive, isPending: false, isTransitioning: false };
  const resolvedClassName = typeof className === "function" ? className(state) : className;
  const resolvedStyle = typeof style === "function" ? style(state) : style;
  const resolvedChildren = typeof children === "function" ? children(state) : children;
  return (
    <Link
      ref={ref}
      to={to}
      aria-current={isActive ? "page" : undefined}
      {...(resolvedClassName !== undefined && { className: resolvedClassName })}
      {...(resolvedStyle !== undefined && { style: resolvedStyle })}
      {...(rest as Record<string, unknown>)}
    >
      {resolvedChildren}
    </Link>
  );
});
