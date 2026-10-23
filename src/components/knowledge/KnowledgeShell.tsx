import type { ReactNode } from 'react';
import { BookMarked, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from '@/lib/router-compat';
import { cn } from '@/lib/utils';
import { KIND_LABELS, KNOWLEDGE_KINDS } from '@/domain/knowledge';
import { knowledgeHome, knowledgeIntegrityHref, knowledgeListHref, knowledgeMatrixHref } from './knowledgeLinks';

/** Page frame + section tabs for the knowledge module. */
export function KnowledgeShell({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  const tabs = [
    { href: knowledgeHome, label: 'الرئيسية' },
    ...KNOWLEDGE_KINDS.map((k) => ({ href: knowledgeListHref(k), label: KIND_LABELS[k] })),
    { href: knowledgeMatrixHref, label: 'مصفوفة الحالات' },
    { href: knowledgeIntegrityHref, label: 'سلامة الروابط' },
  ];
  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
            <BookMarked className="h-5 w-5 text-primary" aria-hidden="true" />
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      <div role="note" className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-2.5 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>عرض للقراءة فقط من مستندات المستودع كما هي في نسخة البناء الحالية. الحالات تُقرأ من نص المصدر فقط، ولا يمكن تغيير الاعتماد من هنا.</span>
      </div>
      <nav aria-label="أقسام المعرفة" className="-mx-1 overflow-x-auto">
        <ul className="flex gap-1 px-1 pb-1">
          {tabs.map((t) => {
            const active = t.href === knowledgeHome ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  to={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('inline-flex min-h-9 items-center whitespace-nowrap rounded-md border px-3 text-sm transition-colors',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}

export function KnowledgeLoading() {
  return <div role="status" className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل المستندات…</div>;
}

export function KnowledgeError({ message }: { message?: string }) {
  return <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">تعذّر تحميل المستندات{message ? `: ${message}` : ''}</div>;
}

/** Zero-result state with a reset action that restores default search/filters. */
export function KnowledgeNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
      <p className="text-sm font-medium">لا توجد سجلات مطابقة للبحث أو الفلاتر الحالية.</p>
      <p className="text-xs text-muted-foreground">جرّب كلمة أخرى أو امسح الفلاتر لعرض كل السجلات.</p>
      <button type="button" onClick={onReset} className="inline-flex min-h-11 items-center rounded-md border bg-background px-4 text-sm hover:bg-muted">مسح البحث والفلاتر</button>
    </div>
  );
}
