import { createFileRoute } from "@tanstack/react-router";
import ChartOfAccountsPage from "@/pages/accounting/ChartOfAccountsPage";

export const Route = createFileRoute("/_app/accounting/chart-of-accounts")({
  component: ChartOfAccountsPage,
});
