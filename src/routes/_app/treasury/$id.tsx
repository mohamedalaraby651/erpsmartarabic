import { createFileRoute } from "@tanstack/react-router";
import CashRegisterDetailsPage from "@/pages/treasury/CashRegisterDetailsPage";

export const Route = createFileRoute("/_app/treasury/$id")({
  component: CashRegisterDetailsPage,
});
