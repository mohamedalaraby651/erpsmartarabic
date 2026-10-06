import { createFileRoute } from "@tanstack/react-router";
import PlatformLayout from "@/components/platform/PlatformLayout";

export const Route = createFileRoute("/platform")({
  component: PlatformLayout,
});
