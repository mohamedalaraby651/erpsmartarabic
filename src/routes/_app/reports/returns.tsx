import { createFileRoute } from "@tanstack/react-router";
import ReturnsReportPage from "@/pages/reports/ReturnsReportPage";

export const Route = createFileRoute("/_app/reports/returns")({
  component: ReturnsReportPage,
});
