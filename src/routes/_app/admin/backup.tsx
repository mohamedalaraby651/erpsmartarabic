import { createFileRoute } from "@tanstack/react-router";
import BackupPage from "@/pages/admin/BackupPage";

export const Route = createFileRoute("/_app/admin/backup")({
  component: BackupPage,
});
