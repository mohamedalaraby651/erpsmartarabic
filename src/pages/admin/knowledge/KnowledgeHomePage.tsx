import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KIND_LABELS, KNOWLEDGE_KINDS, type KnowledgeRecord } from '@/domain/knowledge';
import { useKnowledgeIndex } from '@/hooks/knowledge/useKnowledgeIndex';
import { KnowledgeError, KnowledgeLoading, KnowledgeShell } from '@/components/knowledge/KnowledgeShell';
import { StatusTriad } from '@/components/knowledge/StatusTriad';
import { knowledgeDocHref, knowledgeIntegrityHref, knowledgeListHref } from '@/components/knowledge/knowledgeLinks';

const count = (rs: KnowledgeRecord[], f: (r: KnowledgeRecord) => boolean) => rs.filter(f).length;

export default function KnowledgeHomePage() {
  const { data, isLoading, error } = useKnowledgeIndex();

  return (
    <KnowledgeShell title="المعرفة الهندسية" description="القرارات المعمارية والحوكمة والمخاطر والمعمارية والعقود — من مستندات المستودع.">
      {isLoading ? <KnowledgeLoading /> : error || !data ? <KnowledgeError message={error?.message} /> : (() => {
        const rs = data.records;
        const errors = data.issues.filter((i) => i.severity === 'error').length;
        const warnings = data.issues.length - errors;
        const latest = [...rs].filter((r) => r.date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 8);
        return (
          <>
            <section aria-label="ملخص الأقسام" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {KNOWLEDGE_KINDS.map((k) => (
                <Link key={k} to={knowledgeListHref(k)} className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
                  <div className="text-2xl font-bold">{count(rs, (r) => r.kind === k)}</div>
                  <div className="text-xs text-muted-foreground">{KIND_LABELS[k]}</div>
                </Link>
              ))}
              <Link to={knowledgeIntegrityHref} className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
                <div className="text-2xl font-bold text-destructive">{errors}<span className="ms-2 text-base text-warning">/ {warnings}</span></div>
                <div className="text-xs text-muted-foreground">أخطاء / تنبيهات السلامة</div>
              </Link>
            </section>

            <section aria-label="توزيع الحالات" className="grid gap-3 md:grid-cols-3">
              {[
                { t: 'التنفيذ', rows: [['نُفّذ', count(rs, (r) => r.status.execution === 'executed')], ['قيد التنفيذ', count(rs, (r) => r.status.execution === 'in_progress')], ['غير معروف', count(rs, (r) => r.status.execution === 'unknown')]] },
                { t: 'التحقق', rows: [['متحقق', count(rs, (r) => r.status.verification === 'verified')], ['غير متحقق', count(rs, (r) => r.status.verification === 'unverified')], ['غير معروف', count(rs, (r) => r.status.verification === 'unknown')]] },
                { t: 'الاعتماد', rows: [['معتمد (مُسجّل في المصدر)', count(rs, (r) => r.status.approval === 'accepted')], ['بانتظار الاعتماد', count(rs, (r) => r.status.approval === 'pending')], ['مُستبدل', count(rs, (r) => r.status.approval === 'superseded')], ['غير معروف', count(rs, (r) => r.status.approval === 'unknown')]] },
              ].map((c) => (
                <Card key={c.t}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{c.t}</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="space-y-1 text-sm">
                      {c.rows.map(([l, v]) => (
                        <div key={String(l)} className="flex justify-between gap-2"><dt className="text-muted-foreground">{l}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </section>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">أحدث السجلات المؤرخة</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {latest.map((r) => (
                    <li key={r.path} className="flex flex-col gap-1.5 py-2 md:flex-row md:items-center md:justify-between">
                      <Link to={knowledgeDocHref(r.path)} className="min-w-0 text-sm font-medium hover:underline">
                        <span dir="ltr" className="me-2 text-xs text-muted-foreground">{r.date}</span>{r.title}
                      </Link>
                      <StatusTriad status={r.status} compact />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">إجمالي {rs.length} سجلًا من المستودع. لا توجد سجلات تجريبية أو مسودات محلية في هذه المرحلة.</p>
          </>
        );
      })()}
    </KnowledgeShell>
  );
}
