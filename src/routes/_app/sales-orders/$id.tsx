import { createFileRoute } from "@tanstack/react-router";
import SalesOrderDetailsPage from "@/pages/sales-orders/SalesOrderDetailsPage";

export const Route = createFileRoute("/_app/sales-orders/$id")({
  component: SalesOrderDetailsPage,
});
