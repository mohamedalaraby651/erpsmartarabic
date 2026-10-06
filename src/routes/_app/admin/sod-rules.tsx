import { createFileRoute } from "@tanstack/react-router";
import SodRulesPage from "@/pages/admin/SodRulesPage";

export const Route = createFileRoute("/_app/admin/sod-rules")({
  component: SodRulesPage,
});
