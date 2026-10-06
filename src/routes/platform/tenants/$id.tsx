import { createFileRoute } from "@tanstack/react-router";
import TenantDetailsPage from "@/pages/platform/TenantDetailsPage";

export const Route = createFileRoute("/platform/tenants/$id")({
  component: TenantDetailsPage,
});
