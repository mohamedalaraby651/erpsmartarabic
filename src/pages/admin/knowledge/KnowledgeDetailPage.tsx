import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KIND_LABELS, backlinksFor, IMPACT_MAX_DEPTH, type ImpactNode } from '@/domain/knowledge';
import { useKnowledgeImpact, useKnowledgeIndex } from '@/hooks/knowledge/useKnowledgeIndex';
import { KnowledgeError, KnowledgeLoading, KnowledgeShell } from '@/components/knowledge/KnowledgeShell';
import { StatusTriad } from '@/components/knowledge/StatusTriad';
import { MarkdownView } from '@/components/knowledge/MarkdownView';
import { knowledgeDocHref, knowledgeListHref, makeResolvers } from '@/components/knowledge/knowledgeLinks';

export default function KnowledgeDetailPage({ path }: { path: string }) {
  const { data, isLoading, error } = useKnowledgeIndex();
  const record = data?.records.find((r) => r.path === path) ?? null;
  const impact = useKnowledgeImpact(record);

  if (isLoading) return <KnowledgeShell title="سجل"><KnowledgeLoading /></KnowledgeShell>;
  if (error || !data) return <KnowledgeShell title="سجل"><KnowledgeError message={error?.message} /></KnowledgeShell>;
  if (!record) {
    return (
      <KnowledgeShell title="السجل غير موجود">
        <p className="text-sm text-muted-foreground">لا يوجد ملف ضمن المصادر بالمسار <span dir="ltr">{path}</span>.</p>
      </KnowledgeShell>
    );
  }

  const resolvers = makeResolvers(data);
  const backlinks = backlinksFor(data, record);
  const sameId = data.records.filter((r) => r.id === record.id && r.path !== record.path);
  const issues = data.issues.filter((i) => i.path === record.path || (i.type === 'duplicate_id' && i.recordId === record.id));

  return (
    <KnowledgeShell title={record.title} description={KIND_LABELS[record.kind]}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="min-w-0 rounded-lg border bg-card p-4 md:p-6" aria-label="محتوى المستند">
          <MarkdownView content={record.body} path={record.path} {...resolvers} />
        </article>
        <aside className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">الخصائص</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <dl className="space-y-1.5">
                <div><dt className="text-xs text-muted-foreground">المعرّف</dt><dd className="font-mono text-xs" dir="ltr">{record.id}</dd></div>
                <div><dt className="text-xs text-muted-foreground">المسار</dt><dd className="break-all font-mono text-xs" dir="ltr">{record.path}</dd></div>
                <div><dt className="text-xs text-muted-foreground">التاريخ</dt><dd dir="ltr">{record.date ?? 'غير معروف'}</dd></div>
                {record.area && <div><dt className="text-xs text-muted-foreground">المجال</dt><dd>{record.area}</dd></div>}
                <div><dt className="text-xs text-muted-foreground">المصدر</dt><dd>المستودع (للقراءة فقط)</dd></div>
                <div>
                  <dt className="text-xs text-muted-foreground">نص الحالة في المصدر</dt>
                  <dd className="text-xs">{record.status.raw ?? 'غير موجود — الحالات غير معروفة'}</dd>
                </div>
              </dl>
              <StatusTriad status={record.status} />
            </CardContent>
          </Card>

          {(issues.length > 0 || sameId.length > 0) && (
            <Card className="border-destructive/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">مشكلات السلامة</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs">
                  {issues.map((i, j) => <li key={j}>{i.detail}</li>)}
                  {sameId.map((r) => <li key={r.path}>نسخة أخرى بنفس المعرّف: <Link to={knowledgeDocHref(r.path)} className="text-primary underline" dir="ltr">{r.path}</Link></li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">يشير إلى ({record.references.length})</CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {record.references.map((id) => {
                  const href = resolvers.hrefForId(id);
                  return <li key={id}>{href ? <Link to={href} className="text-primary underline" dir="ltr">{id}</Link> : <span className="text-muted-foreground line-through" dir="ltr" title="غير موجود">{id}</span>}</li>;
                })}
                {record.references.length === 0 && <li className="text-muted-foreground">لا شيء</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">روابط راجعة ({backlinks.length})</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {backlinks.map((r) => <li key={r.path}><Link to={knowledgeDocHref(r.path)} className="hover:underline">{r.title}</Link></li>)}
                {backlinks.length === 0 && <li className="text-muted-foreground">لا شيء</li>}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">الأدلة المذكورة ({record.evidence.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p role="note" className="rounded border border-dashed p-2 text-xs text-muted-foreground">ذكر الدليل لا يعني أنه متحقق منه.</p>
              <ul className="space-y-1.5 text-xs">
                {record.evidence.map((e) => (
                  <li key={e.path} className="flex flex-col gap-0.5">
                    <span className="break-all font-mono" dir="ltr">{e.path}</span>
                    <span className={e.exists ? 'text-success' : 'text-destructive'}>{e.exists ? 'موجود في المستودع' : 'مذكور لكنه غير موجود'}</span>
                  </li>
                ))}
                {record.evidence.length === 0 && <li className="text-muted-foreground">لا يذكر المستند أي ملف دليل</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">تحليل الأثر</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">السجلات التي تشير إلى هذا السجل صراحةً، حتى {IMPACT_MAX_DEPTH} مستويات.</p>
              {impact.length ? <ImpactList nodes={impact} /> : <p className="text-xs text-muted-foreground">لا يعتمد عليه أي سجل</p>}
            </CardContent>
          </Card>
          <Link to={knowledgeListHref(record.kind)} className="inline-block text-sm text-primary underline">العودة إلى {KIND_LABELS[record.kind]}</Link>
        </aside>
      </div>
    </KnowledgeShell>
  );
}

function ImpactList({ nodes }: { nodes: ImpactNode[] }) {
  return (
    <ul className="space-y-1 border-s ps-2 text-xs">
      {nodes.map((n) => (
        <li key={`${n.depth}-${n.record.path}`}>
          <Link to={knowledgeDocHref(n.record.path)} className="hover:underline">{n.record.title}</Link>
          {n.cycle && <span className="ms-1 text-warning">(دوران — توقف)</span>}
          {n.children.length > 0 && <div className="mt-1"><ImpactList nodes={n.children} /></div>}
        </li>
      ))}
    </ul>
  );
}
