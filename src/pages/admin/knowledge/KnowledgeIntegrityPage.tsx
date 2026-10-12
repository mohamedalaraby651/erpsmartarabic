import { useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IntegrityIssue } from '@/domain/knowledge';
import { useKnowledgeIndex } from '@/hooks/knowledge/useKnowledgeIndex';
import { KnowledgeError, KnowledgeLoading, KnowledgeShell } from '@/components/knowledge/KnowledgeShell';
import { knowledgeDocHref } from '@/components/knowledge/knowledgeLinks';

const TYPE_LABELS: Record<IntegrityIssue['type'], string> = {
  duplicate_id: 'معرّف مكرر',
  broken_file_link: 'رابط ملف مكسور',
  unresolved_reference: 'إشارة غير محلولة',
  index_drift: 'انحراف فهرس ADR',
  unparsed_status: 'حالة غير قابلة للقراءة',
};

export default function KnowledgeIntegrityPage() {
  const { data, isLoading, error } = useKnowledgeIndex();
  const [type, setType] = useState<string>('all');
  const issues = useMemo(() => (data?.issues ?? []).filter((i) => type === 'all' || i.type === type), [data, type]);
  const paths = useMemo(() => new Set((data?.records ?? []).map((r) => r.path)), [data]);

  return (
    <KnowledgeShell title="سلامة الروابط والمعرّفات" description="كشف فقط — لا يتم إصلاح أي ملف تلقائيًا.">
      {isLoading ? <KnowledgeLoading /> : error || !data ? <KnowledgeError message={error?.message} /> : (
        <>
          <ul className="flex flex-wrap gap-2" aria-label="ملخص المشكلات">
            {(Object.keys(TYPE_LABELS) as IntegrityIssue['type'][]).map((t) => (
              <li key={t}><Badge variant="outline">{TYPE_LABELS[t]}: {data.issues.filter((i) => i.type === t).length}</Badge></li>
            ))}
          </ul>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-full sm:w-56" aria-label="نوع المشكلة"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع ({data.issues.length})</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <ul className="divide-y rounded-lg border bg-card">
            {issues.map((i, j) => (
              <li key={j} className="flex flex-col gap-1 p-3 text-sm md:flex-row md:items-start md:gap-3">
                <Badge variant="outline" className={i.severity === 'error' ? 'border-destructive/40 text-destructive' : 'border-warning/40 text-warning'}>
                  {i.severity === 'error' ? 'خطأ' : 'تنبيه'} · {TYPE_LABELS[i.type]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="break-words">{i.detail}</p>
                  {i.path && (paths.has(i.path)
                    ? <Link to={knowledgeDocHref(i.path)} className="break-all font-mono text-xs text-primary underline" dir="ltr">{i.path}</Link>
                    : <span className="break-all font-mono text-xs text-muted-foreground" dir="ltr">{i.path}</span>)}
                </div>
              </li>
            ))}
            {issues.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">لا توجد مشكلات من هذا النوع.</li>}
          </ul>
        </>
      )}
    </KnowledgeShell>
  );
}
