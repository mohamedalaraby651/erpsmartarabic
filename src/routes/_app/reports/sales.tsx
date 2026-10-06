import { createFileRoute } from "@tanstack/react-router";
import SalesReportsPage from "@/pages/reports/SalesReportsPage";

export const Route = createFileRoute("/_app/reports/sales")({
  component: SalesReportsPage,
});
