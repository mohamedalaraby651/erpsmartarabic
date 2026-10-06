import { createFileRoute } from "@tanstack/react-router";
import SupplierPaymentsPage from "@/pages/suppliers/SupplierPaymentsPage";

export const Route = createFileRoute("/_app/supplier-payments")({
  component: SupplierPaymentsPage,
});
