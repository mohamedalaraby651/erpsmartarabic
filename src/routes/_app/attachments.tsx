import { createFileRoute } from "@tanstack/react-router";
import AttachmentsPage from "@/pages/attachments/AttachmentsPage";

export const Route = createFileRoute("/_app/attachments")({
  component: AttachmentsPage,
});
