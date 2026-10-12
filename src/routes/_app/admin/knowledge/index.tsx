import { createFileRoute } from "@tanstack/react-router";
import KnowledgeHomePage from "@/pages/admin/knowledge/KnowledgeHomePage";

export const Route = createFileRoute("/_app/admin/knowledge/")({
  component: KnowledgeHomePage,
});
