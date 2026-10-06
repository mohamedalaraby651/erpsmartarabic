import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import { PageLoader } from "@/components/layout/PageLoader";

// DEV-only surface (Classic App.tsx gated it on import.meta.env.DEV).
const PdfTelemetryPage = lazy(() => import("@/pages/dev/PdfTelemetryPage"));

export const Route = createFileRoute("/dev/pdf-telemetry")({
  component: DevOnlyPage,
});

function DevOnlyPage() {
  if (!import.meta.env.DEV) return <NotFound />;
  return (
    <Suspense fallback={<PageLoader />}>
      <PdfTelemetryPage />
    </Suspense>
  );
}
