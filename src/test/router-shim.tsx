/**
 * Test-only router helpers. Provide a TanStack Router context (memory history)
 * so hooks from `@/lib/router-compat` work inside unit/integration tests that
 * were written against the pre-migration router API.
 */
import React, { useMemo } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { matchPath, useLocation } from "@/lib/router-compat";

function TestRouter({ initialEntries = ["/"], children }: { initialEntries?: string[]; children?: React.ReactNode }) {
  const router = useMemo(
    () =>
      createRouter({
        routeTree: createRootRoute(),
        history: createMemoryHistory({ initialEntries }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return <RouterContextProvider router={router}>{children}</RouterContextProvider>;
}

export function BrowserRouter({ children }: { children?: React.ReactNode }) {
  return <TestRouter>{children}</TestRouter>;
}

export function MemoryRouter({ initialEntries, children }: { initialEntries?: string[]; children?: React.ReactNode }) {
  return <TestRouter initialEntries={initialEntries}>{children}</TestRouter>;
}

export function Route(_props: { path: string; element: React.ReactNode }) {
  return null;
}

export function Routes({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const items = React.Children.toArray(children) as React.ReactElement<{ path: string; element: React.ReactNode }>[];
  const hit = items.find((c) => c.props.path === "*" || matchPath({ path: c.props.path, end: true }, pathname));
  return <>{hit?.props.element ?? null}</>;
}
