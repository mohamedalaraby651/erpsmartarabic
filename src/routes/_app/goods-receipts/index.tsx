import { createFileRoute } from "@tanstack/react-router";
import GoodsReceiptsPage from "@/pages/goods-receipts/GoodsReceiptsPage";

export const Route = createFileRoute("/_app/goods-receipts/")({
  component: GoodsReceiptsPage,
});
