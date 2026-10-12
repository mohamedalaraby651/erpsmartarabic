import { createFileRoute } from "@tanstack/react-router";
import KnowledgeIntegrityPage from "@/pages/admin/knowledge/KnowledgeIntegrityPage";

export const Route = createFileRoute("/_app/admin/knowledge/integrity")({
  component: KnowledgeIntegrityPage,
});
