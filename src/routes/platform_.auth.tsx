import { createFileRoute } from "@tanstack/react-router";
import PlatformAuth from "@/pages/platform/PlatformAuth";

export const Route = createFileRoute("/platform_/auth")({
  component: PlatformAuth,
});
