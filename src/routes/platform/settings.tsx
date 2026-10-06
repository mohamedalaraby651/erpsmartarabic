import { createFileRoute } from "@tanstack/react-router";
import PlatformSettingsPage from "@/pages/platform/PlatformSettingsPage";

export const Route = createFileRoute("/platform/settings")({
  component: PlatformSettingsPage,
});
