import { createFileRoute } from "@tanstack/react-router";
import PermissionsPage from "@/pages/admin/PermissionsPage";

export const Route = createFileRoute("/_app/admin/permissions")({
  component: PermissionsPage,
});
