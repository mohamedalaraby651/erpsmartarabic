import { createFileRoute } from "@tanstack/react-router";
import GoodsReceiptsPage from "@/pages/goods-receipts/GoodsReceiptsPage";

export const Route = createFileRoute("/_app/goods-receipts/")({
  head: () => ({ meta: [
    { title: 'استلام البضاعة | نظرة' },
    { name: 'description', content: 'متابعة إيصالات استلام الموردين والمستودعات في نظرة.' },
    { property: 'og:title', content: 'استلام البضاعة | نظرة' },
    { property: 'og:description', content: 'متابعة إيصالات استلام الموردين والمستودعات في نظرة.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: GoodsReceiptsPage,
});
