import { createFileRoute } from "@tanstack/react-router";
import MetricsPage from "@/pages/admin/MetricsPage";

export const Route = createFileRoute("/_app/admin/metrics")({
  component: MetricsPage,
});
