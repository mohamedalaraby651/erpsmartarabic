import { createFileRoute } from "@tanstack/react-router";
import OpenFilePage from "@/pages/file/OpenFilePage";

export const Route = createFileRoute("/_app/open-file")({
  component: OpenFilePage,
});
