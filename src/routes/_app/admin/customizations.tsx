import { createFileRoute } from "@tanstack/react-router";
import CustomizationsPage from "@/pages/admin/CustomizationsPage";

export const Route = createFileRoute("/_app/admin/customizations")({
  component: CustomizationsPage,
});
