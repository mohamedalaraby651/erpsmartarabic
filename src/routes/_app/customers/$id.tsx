import { createFileRoute } from "@tanstack/react-router";
import CustomerDetailsPage from "@/pages/customers/CustomerDetailsPage";

export const Route = createFileRoute("/_app/customers/$id")({
  component: CustomerDetailsPage,
});
