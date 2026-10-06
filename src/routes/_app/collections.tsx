import { createFileRoute } from "@tanstack/react-router";
import CollectionDashboard from "@/pages/collections/CollectionDashboard";

export const Route = createFileRoute("/_app/collections")({
  component: CollectionDashboard,
});
