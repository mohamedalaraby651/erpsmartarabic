import { createFileRoute } from "@tanstack/react-router";
import TenantsManagementPage from "@/pages/platform/TenantsManagementPage";

export const Route = createFileRoute("/platform/tenants")({
  component: TenantsManagementPage,
});
