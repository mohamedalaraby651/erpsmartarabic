import { useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  APPROVAL_LABELS, EXECUTION_LABELS, KIND_LABELS, VERIFICATION_LABELS, type KnowledgeRecord,
} from '@/domain/knowledge';
import { useKnowledgeIndex } from '@/hooks/knowledge/useKnowledgeIndex';
import { KnowledgeError, KnowledgeLoading, KnowledgeNoResults, KnowledgeShell } from '@/components/knowledge/KnowledgeShell';
import { knowledgeDocHref } from '@/components/knowledge/knowledgeLinks';
import { FilterSelect } from './KnowledgeListPage';

const cell = (v: string, label: string) => (
  <span className={v === 'unknown' ? 'text-muted-foreground' : 'font-medium'}>{label}</span>
);

export default function KnowledgeMatrixPage() {
  const { data, isLoading, error } = useKnowledgeIndex();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [exec, setExec] = useState('all');
  const [verif, setVerif] = useState('all');
  const [appr, setAppr] = useState('all');
  const reset = () => { setQ(''); setKind('all'); setExec('all'); setVerif('all'); setAppr('all'); };

  const rows = useMemo<KnowledgeRecord[]>(() => {
    const needle = q.trim().toLowerCase();
    return (data?.records ?? []).filter((r) => (kind === 'all' || r.kind === kind)
      && (exec === 'all' || r.status.execution === exec)
      && (verif === 'all' || r.status.verification === verif)
      && (appr === 'all' || r.status.approval === appr)
      && (!needle || `${r.id} ${r.title} ${r.path}`.toLowerCase().includes(needle)));
  }, [data, q, kind, exec, verif, appr]);

  return (
    <KnowledgeShell title="مصفوفة الحالات" description="كل محور يُقرأ من نص المصدر وحده؛ لا يُستنتج محور من آخر، وغير الموثق يبقى «غير معروف».">
      {isLoading ? <KnowledgeLoading /> : error || !data ? <KnowledgeError message={error?.message} /> : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative sm:min-w-64 sm:flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالمعرّف أو العنوان…" className="h-9 ps-8" aria-label="بحث في المصفوفة" />
            </div>
            <FilterSelect label="القسم" value={kind} onChange={setKind} options={KIND_LABELS} />
            <FilterSelect label="التنفيذ" value={exec} onChange={setExec} options={EXECUTION_LABELS} />
            <FilterSelect label="التحقق" value={verif} onChange={setVerif} options={VERIFICATION_LABELS} />
            <FilterSelect label="الاعتماد" value={appr} onChange={setAppr} options={APPROVAL_LABELS} />
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">{rows.length} سجلًا</p>
          {rows.length === 0 ? <KnowledgeNoResults onReset={reset} /> : (
            <>
              <ul className="space-y-2 md:hidden">
                {rows.map((r) => (
                  <li key={r.path} className="rounded-lg border bg-card p-3">
                    <Link to={knowledgeDocHref(r.path)} className="block min-h-11">
                      <div className="text-xs text-muted-foreground" dir="ltr">{r.id}</div>
                      <div className="text-sm font-medium">{r.title}</div>
                    </Link>
                    <dl className="mt-2 grid grid-cols-3 gap-1 text-xs">
                      <div><dt className="text-muted-foreground">التنفيذ</dt><dd>{cell(r.status.execution, EXECUTION_LABELS[r.status.execution])}</dd></div>
                      <div><dt className="text-muted-foreground">التحقق</dt><dd>{cell(r.status.verification, VERIFICATION_LABELS[r.status.verification])}</dd></div>
                      <div><dt className="text-muted-foreground">الاعتماد</dt><dd>{cell(r.status.approval, APPROVAL_LABELS[r.status.approval])}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>السجل</TableHead>
                      <TableHead className="w-36">القسم</TableHead>
                      <TableHead className="w-32">التنفيذ</TableHead>
                      <TableHead className="w-32">التحقق</TableHead>
                      <TableHead className="w-44">الاعتماد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.path}>
                        <TableCell>
                          <Link to={knowledgeDocHref(r.path)} className="font-medium hover:underline">{r.title}</Link>
                          <div className="font-mono text-xs text-muted-foreground" dir="ltr">{r.id}</div>
                        </TableCell>
                        <TableCell className="text-xs">{KIND_LABELS[r.kind]}</TableCell>
                        <TableCell className="text-xs">{cell(r.status.execution, EXECUTION_LABELS[r.status.execution])}</TableCell>
                        <TableCell className="text-xs">{cell(r.status.verification, VERIFICATION_LABELS[r.status.verification])}</TableCell>
                        <TableCell className="text-xs">{cell(r.status.approval, APPROVAL_LABELS[r.status.approval])}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </KnowledgeShell>
  );
}
