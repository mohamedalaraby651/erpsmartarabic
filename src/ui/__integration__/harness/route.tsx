/**
 * Harness route registration — UX-1E (dev-only).
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Returns the lazy route element. The actual route is mounted from
 * `App.tsx` behind `import.meta.env.DEV`. No router type is imported here
 * to keep this module fully tree-shakable.
 */
import * as React from "react";

const LazyHarness = React.lazy(() => import("./IntegrationHarnessPage"));

export function IntegrationHarnessRoute(): JSX.Element {
  return (
    <React.Suspense fallback={null}>
      <LazyHarness />
    </React.Suspense>
  );
}

export const INTEGRATION_HARNESS_PATH = "/__integration__/ux1e";
