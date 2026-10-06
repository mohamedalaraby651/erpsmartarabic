import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import { PageLoader } from "@/components/layout/PageLoader";

// DEV-only surface (Classic App.tsx gated it on import.meta.env.DEV).
const IntegrationHarnessPage = lazy(() => import("@/ui/__integration__/harness/IntegrationHarnessPage"));

export const Route = createFileRoute("/__integration__/ux1e")({
  component: DevOnlyPage,
});

function DevOnlyPage() {
  if (!import.meta.env.DEV) return <NotFound />;
  return (
    <Suspense fallback={<PageLoader />}>
      <IntegrationHarnessPage />
    </Suspense>
  );
}
