import { createFileRoute } from "@tanstack/react-router";
import QuotesPage from "@/pages/quotes/QuotesPage";

export const Route = createFileRoute("/_app/quotes")({
  component: QuotesPage,
});
