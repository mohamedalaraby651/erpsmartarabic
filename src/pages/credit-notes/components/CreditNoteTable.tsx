import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Loader2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CreditNoteWithRelations } from '../types';

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  confirmed: 'مؤكدة',
  cancelled: 'ملغاة',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  confirmed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

interface Props {
  creditNotes: CreditNoteWithRelations[];
  canManage: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  pendingId?: string;
}

export function CreditNoteTable({ creditNotes, canManage, onConfirm, onCancel, pendingId }: Props) {
  const navigate = useNavigate();
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الرقم</TableHead>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">الفاتورة</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">السبب</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creditNotes.map((cn) => (
            <TableRow key={cn.id}>
              <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
              <TableCell>{cn.customers?.name || '-'}</TableCell>
              <TableCell>{cn.invoices?.invoice_number || '-'}</TableCell>
              <TableCell className="font-bold text-destructive">
                {Number(cn.amount).toLocaleString()} ج.م
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{cn.reason || '-'}</TableCell>
              <TableCell>
                <Badge className={statusColors[cn.status] || ''}>
                  {statusLabels[cn.status] || cn.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(cn.created_at).toLocaleDateString('ar-EG')}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/credit-notes/${cn.id}`)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  {canManage && cn.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConfirm(cn.id)}
                        disabled={pendingId === cn.id}
                      >
                        {pendingId === cn.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <CheckCircle2 className="h-3 w-3 text-success" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCancel(cn.id)}
                        disabled={pendingId === cn.id}
                      >
                        <XCircle className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
