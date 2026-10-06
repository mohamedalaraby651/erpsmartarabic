import { createFileRoute } from "@tanstack/react-router";
import ApprovalChainsPage from "@/pages/admin/ApprovalChainsPage";

export const Route = createFileRoute("/_app/admin/approval-chains")({
  component: ApprovalChainsPage,
});
