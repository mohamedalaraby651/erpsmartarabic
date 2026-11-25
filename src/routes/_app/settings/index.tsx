import { createFileRoute } from "@tanstack/react-router";
import UnifiedSettingsPage from "@/pages/settings/UnifiedSettingsPage";

export const Route = createFileRoute("/_app/settings/")({
  head: () => ({ meta: [
    { title: 'إعدادات الشركة | نظرة' },
    { name: 'description', content: 'إدارة معلومات الشركة وشعارها وإعدادات المستندات في نظرة.' },
    { property: 'og:title', content: 'إعدادات الشركة | نظرة' },
    { property: 'og:description', content: 'معلومات الشركة والعلامة التجارية وإعدادات المستندات.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: UnifiedSettingsPage,
});
