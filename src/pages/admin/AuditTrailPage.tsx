import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Eye, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const TABLES = [
  'invoices', 'payments', 'credit_notes', 'journals', 'journal_entries',
  'expenses', 'supplier_payments', 'purchase_orders', 'customers', 'suppliers',
  'employees', 'custom_roles', 'role_section_permissions', 'role_limits',
];

const AuditTrailPage = () => {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-trail', tableFilter, opFilter],
    queryFn: async () => {
      let q = supabase
        .from('audit_trail' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (tableFilter !== 'all') q = q.eq('table_name', tableFilter);
      if (opFilter !== 'all') q = q.eq('operation', opFilter);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AuditEntry[];
    },
  });

  const filtered = (data || []).filter((row) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      row.table_name.toLowerCase().includes(s) ||
      row.record_id.toLowerCase().includes(s) ||
      (row.changed_fields || []).some((f) => f.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">سجل التدقيق الشامل</h1>
          <p className="text-sm text-muted-foreground">
            تتبع كامل قبل/بعد لجميع التغييرات على الجداول الحرجة
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الفلاتر</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث (جدول، حقل، معرّف)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger><SelectValue placeholder="الجدول" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الجداول</SelectItem>
              {TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger><SelectValue placeholder="العملية" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العمليات</SelectItem>
              <SelectItem value="INSERT">إنشاء</SelectItem>
              <SelectItem value="UPDATE">تعديل</SelectItem>
              <SelectItem value="DELETE">حذف</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>السجلات ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الجدول</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>الحقول المتغيرة</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{new Date(row.created_at).toLocaleString('ar-EG')}</TableCell>
                    <TableCell><Badge variant="outline">{row.table_name}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={row.operation === 'DELETE' ? 'destructive' : row.operation === 'INSERT' ? 'default' : 'secondary'}>
                        {row.operation}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(row.changed_fields || []).slice(0, 3).join(', ') || '—'}
                      {(row.changed_fields || []).length > 3 && ` +${(row.changed_fields || []).length - 3}`}
                    </TableCell>
                    <TableCell className="text-xs">{row.ip_address || '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل التغيير — {selected?.table_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold mb-2">قبل (Before)</h4>
                  <pre className="bg-muted p-3 rounded overflow-auto">
                    {JSON.stringify(selected.before_value, null, 2) || 'لا يوجد'}
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold mb-2">بعد (After)</h4>
                  <pre className="bg-muted p-3 rounded overflow-auto">
                    {JSON.stringify(selected.after_value, null, 2) || 'لا يوجد'}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrailPage;
