import { createFileRoute } from "@tanstack/react-router";
import ShareTargetPage from "@/pages/share/ShareTargetPage";

export const Route = createFileRoute("/_app/share-target")({
  component: ShareTargetPage,
});
