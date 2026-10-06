import { createFileRoute } from "@tanstack/react-router";
import QuoteNewPage from "@/pages/quotes/QuoteNewPage";

export const Route = createFileRoute("/_app/quotes/new")({
  component: QuoteNewPage,
});
