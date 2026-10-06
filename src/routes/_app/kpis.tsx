import { createFileRoute } from "@tanstack/react-router";
import KPIDashboard from "@/pages/reports/KPIDashboard";

export const Route = createFileRoute("/_app/kpis")({
  component: KPIDashboard,
});
