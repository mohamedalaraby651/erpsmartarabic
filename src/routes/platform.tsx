import { createFileRoute } from "@tanstack/react-router";
import PlatformLayout from "@/components/platform/PlatformLayout";

export const Route = createFileRoute("/platform")({
  // Session lives in browser storage, so this subtree renders client-side only
  // (matches the Classic SPA behaviour; avoids SSR auth flashes/redirect loops).
  ssr: false,
  component: PlatformLayout,
});
