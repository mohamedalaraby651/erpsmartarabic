import { createFileRoute } from "@tanstack/react-router";
import InstallPage from "@/pages/install/InstallPage";

export const Route = createFileRoute("/_app/install")({
  component: InstallPage,
});
