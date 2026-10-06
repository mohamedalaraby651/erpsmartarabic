import { createFileRoute } from "@tanstack/react-router";
import SalesOrdersPage from "@/pages/sales-orders/SalesOrdersPage";

export const Route = createFileRoute("/_app/sales-orders")({
  component: SalesOrdersPage,
});
