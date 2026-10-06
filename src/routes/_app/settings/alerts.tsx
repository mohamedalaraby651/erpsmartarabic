import { createFileRoute } from "@tanstack/react-router";
import CustomerAlertSettingsPage from "@/pages/settings/CustomerAlertSettings";

export const Route = createFileRoute("/_app/settings/alerts")({
  component: CustomerAlertSettingsPage,
});
