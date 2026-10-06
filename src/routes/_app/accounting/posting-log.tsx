import { createFileRoute } from "@tanstack/react-router";
import PostingLogPage from "@/pages/accounting/PostingLogPage";

export const Route = createFileRoute("/_app/accounting/posting-log")({
  component: PostingLogPage,
});
