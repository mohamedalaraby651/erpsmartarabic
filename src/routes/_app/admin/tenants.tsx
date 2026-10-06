import { createFileRoute } from "@tanstack/react-router";
import TenantsPage from "@/pages/admin/TenantsPage";

export const Route = createFileRoute("/_app/admin/tenants")({
  component: TenantsPage,
});
