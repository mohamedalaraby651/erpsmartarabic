import { createFileRoute } from "@tanstack/react-router";
import InventoryPage from "@/pages/inventory/InventoryPage";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});
