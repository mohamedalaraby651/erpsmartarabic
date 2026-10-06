import { createFileRoute } from "@tanstack/react-router";
import TreasuryPage from "@/pages/treasury/TreasuryPage";

export const Route = createFileRoute("/_app/treasury/")({
  component: TreasuryPage,
});
