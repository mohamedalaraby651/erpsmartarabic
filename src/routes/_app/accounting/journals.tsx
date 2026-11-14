import { createFileRoute } from "@tanstack/react-router";
import JournalEntriesPage from "@/pages/accounting/JournalEntriesPage";

export const Route = createFileRoute("/_app/accounting/journals")({
  head: () => ({ meta: [
    { title: 'قيود اليومية | نظرة' },
    { name: 'description', content: 'متابعة القيود المحاسبية ومدينها ودائنها.' },
    { property: 'og:title', content: 'قيود اليومية | نظرة' },
    { property: 'og:description', content: 'متابعة القيود المحاسبية ومدينها ودائنها.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: JournalEntriesPage,
});
