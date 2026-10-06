import { createFileRoute } from "@tanstack/react-router";
import UnifiedSettingsPage from "@/pages/settings/UnifiedSettingsPage";

export const Route = createFileRoute("/_app/settings/")({
  component: UnifiedSettingsPage,
});
