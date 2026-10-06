import { createFileRoute } from "@tanstack/react-router";
import PurchaseOrderDetailsPage from "@/pages/purchase-orders/PurchaseOrderDetailsPage";

export const Route = createFileRoute("/_app/purchase-orders/$id")({
  component: PurchaseOrderDetailsPage,
});
