import { useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  APPROVAL_LABELS, EXECUTION_LABELS, KIND_LABELS, VERIFICATION_LABELS, type KnowledgeKind,
} from '@/domain/knowledge';
import { useKnowledgeIndex } from '@/hooks/knowledge/useKnowledgeIndex';
import { KnowledgeError, KnowledgeLoading, KnowledgeNoResults, KnowledgeShell } from '@/components/knowledge/KnowledgeShell';
import { StatusTriad } from '@/components/knowledge/StatusTriad';
import { knowledgeDocHref } from '@/components/knowledge/knowledgeLinks';

type SortKey = 'id' | 'date_desc' | 'title';

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full sm:w-44" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: الكل</SelectItem>
        {Object.entries(options).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function KnowledgeListPage({ kind }: { kind: KnowledgeKind }) {
  const { data, isLoading, error } = useKnowledgeIndex();
  const [q, setQ] = useState('');
  const [exec, setExec] = useState('all');
  const [verif, setVerif] = useState('all');
  const [appr, setAppr] = useState('all');
  const [sort, setSort] = useState<SortKey>('id');

  const resetFilters = () => { setQ(''); setExec('all'); setVerif('all'); setAppr('all'); setSort('id'); };

  const issueIds = useMemo(() => new Set((data?.issues ?? []).filter((i) => i.severity === 'error').map((i) => i.recordId)), [data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (data?.records ?? []).filter((r) => r.kind === kind
      && (exec === 'all' || r.status.execution === exec)
      && (verif === 'all' || r.status.verification === verif)
      && (appr === 'all' || r.status.approval === appr)
      && (!needle || `${r.id} ${r.title} ${r.path} ${r.area ?? ''}`.toLowerCase().includes(needle)));
    return list.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ar')
      : sort === 'date_desc' ? (b.date ?? '').localeCompare(a.date ?? '')
      : a.id.localeCompare(b.id) || a.path.localeCompare(b.path));
  }, [data, kind, q, exec, verif, appr, sort]);

  return (
    <KnowledgeShell title={KIND_LABELS[kind]}>
      {isLoading ? <KnowledgeLoading /> : error || !data ? <KnowledgeError message={error?.message} /> : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative sm:min-w-64 sm:flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالمعرّف أو العنوان أو المسار…" className="h-9 ps-8" aria-label="بحث في السجلات" />
            </div>
            <FilterSelect label="التنفيذ" value={exec} onChange={setExec} options={EXECUTION_LABELS} />
            <FilterSelect label="التحقق" value={verif} onChange={setVerif} options={VERIFICATION_LABELS} />
            <FilterSelect label="الاعتماد" value={appr} onChange={setAppr} options={APPROVAL_LABELS} />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-full sm:w-40" aria-label="الترتيب"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="id">ترتيب: المعرّف</SelectItem>
                <SelectItem value="date_desc">ترتيب: الأحدث</SelectItem>
                <SelectItem value="title">ترتيب: العنوان</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">{rows.length} سجلًا</p>

          {/* Mobile cards */}
          {rows.length > 0 && <>
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.path} className="rounded-lg border bg-card p-3">
                <Link to={knowledgeDocHref(r.path)} className="block min-h-11">
                  <div className="text-xs text-muted-foreground" dir="ltr">{r.id}{r.date ? ` · ${r.date}` : ''}</div>
                  <div className="text-sm font-medium">{r.title}</div>
                </Link>
                <div className="mt-2"><StatusTriad status={r.status} compact /></div>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">المعرّف</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead className="w-28">التاريخ</TableHead>
                  <TableHead>الحالة (تنفيذ / تحقق / اعتماد)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.path}>
                    <TableCell className="font-mono text-xs" dir="ltr">
                      {r.id}
                      {issueIds.has(r.id) && <span className="ms-1 text-destructive" title="توجد مشكلة سلامة">●</span>}
                    </TableCell>
                    <TableCell><Link to={knowledgeDocHref(r.path)} className="font-medium hover:underline">{r.title}</Link></TableCell>
                    <TableCell className="text-xs" dir="ltr">{r.date ?? '—'}</TableCell>
                    <TableCell><StatusTriad status={r.status} compact /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>}
          {rows.length === 0 && <KnowledgeNoResults onReset={resetFilters} />}
        </>
      )}
    </KnowledgeShell>
  );
}
