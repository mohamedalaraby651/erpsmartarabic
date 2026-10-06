import { createFileRoute } from "@tanstack/react-router";
import SupplierDetailsPage from "@/pages/suppliers/SupplierDetailsPage";

export const Route = createFileRoute("/_app/suppliers/$id")({
  component: SupplierDetailsPage,
});
