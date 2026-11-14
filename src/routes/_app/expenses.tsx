import { createFileRoute } from "@tanstack/react-router";
import ExpensesPage from "@/pages/expenses/ExpensesPage";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({ meta: [
    { title: 'المصروفات | نظرة' },
    { name: 'description', content: 'متابعة المصروفات وحالات الاعتماد والسداد.' },
    { property: 'og:title', content: 'المصروفات | نظرة' },
    { property: 'og:description', content: 'متابعة المصروفات وحالات الاعتماد والسداد.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ExpensesPage,
});
