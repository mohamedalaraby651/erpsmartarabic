import { createFileRoute } from "@tanstack/react-router";
import ExportTemplatesPage from "@/pages/admin/ExportTemplatesPage";

export const Route = createFileRoute("/_app/admin/export-templates")({
  component: ExportTemplatesPage,
});
