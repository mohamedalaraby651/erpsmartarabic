import { createFileRoute } from "@tanstack/react-router";
import ProtocolHandlerPage from "@/pages/protocol/ProtocolHandlerPage";

export const Route = createFileRoute("/_app/protocol")({
  component: ProtocolHandlerPage,
});
