import { createFileRoute } from "@tanstack/react-router";
import PlatformAuth from "@/pages/platform/PlatformAuth";

export const Route = createFileRoute("/platform_/auth")({
  // Session lives in browser storage, so this subtree renders client-side only
  // (matches the Classic SPA behaviour; avoids SSR auth flashes/redirect loops).
  ssr: false,
  component: PlatformAuth,
});
