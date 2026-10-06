import { createFileRoute } from "@tanstack/react-router";
import DomainEventsPage from "@/pages/admin/DomainEventsPage";

export const Route = createFileRoute("/_app/admin/domain-events")({
  component: DomainEventsPage,
});
