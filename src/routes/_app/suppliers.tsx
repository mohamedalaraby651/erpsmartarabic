import { createFileRoute } from "@tanstack/react-router";
import SuppliersPage from "@/pages/suppliers/SuppliersPage";

export const Route = createFileRoute("/_app/suppliers")({
  component: SuppliersPage,
});
