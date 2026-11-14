import { createFileRoute } from "@tanstack/react-router";
import DeliveryNotesPage from "@/pages/delivery-notes/DeliveryNotesPage";

export const Route = createFileRoute("/_app/delivery-notes/")({
  head: () => ({ meta: [
    { title: 'تسليم البضاعة | نظرة' },
    { name: 'description', content: 'متابعة إذونات تسليم العملاء والمستودعات في نظرة.' },
    { property: 'og:title', content: 'تسليم البضاعة | نظرة' },
    { property: 'og:description', content: 'متابعة إذونات تسليم العملاء والمستودعات في نظرة.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: DeliveryNotesPage,
});
