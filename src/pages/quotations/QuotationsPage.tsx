import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, Edit, ArrowLeftRight, Printer } from "lucide-react";
import QuotationFormDialog from "@/components/quotations/QuotationFormDialog";
import { QuotationPrintView } from "@/components/print/QuotationPrintView";
import type { Database } from "@/integrations/supabase/types";

type Quotation = Database['public']['Tables']['quotations']['Row'];

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  pending: "معلق",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const QuotationsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printQuotationId, setPrintQuotationId] = useState<string | null>(null);

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations', searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('quotation_number', `%${searchQuery}%`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: quotations.length,
    pending: quotations.filter(q => q.status === 'pending').length,
    approved: quotations.filter(q => q.status === 'approved').length,
    totalValue: quotations.reduce((sum, q) => sum + Number(q.total_amount), 0),
  };

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedQuotation(null);
    setDialogOpen(true);
  };

  const handlePrint = (quotationId: string) => {
    setPrintQuotationId(quotationId);
    setPrintDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">عروض الأسعار</h1>
          <p className="text-muted-foreground">إدارة عروض الأسعار للعملاء</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 ml-2" />
          عرض سعر جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي العروض</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">معتمدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <ArrowLeftRight className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي القيمة (ج.م)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم العرض..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قائمة عروض الأسعار</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد عروض أسعار</p>
              <Button variant="link" onClick={handleAdd}>إضافة عرض سعر جديد</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم العرض</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>صالح حتى</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation: any) => (
                    <TableRow key={quotation.id}>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {quotation.quotation_number}
                        </code>
                      </TableCell>
                      <TableCell>{quotation.customers?.name || '-'}</TableCell>
                      <TableCell>
                        {new Date(quotation.created_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        {quotation.valid_until 
                          ? new Date(quotation.valid_until).toLocaleDateString('ar-EG')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">
                          {Number(quotation.total_amount).toLocaleString()} ج.م
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[quotation.status]}>
                          {statusLabels[quotation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(quotation)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(quotation.id)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <QuotationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        quotation={selectedQuotation}
      />

      {printQuotationId && (
        <QuotationPrintView
          quotationId={printQuotationId}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}
    </div>
  );
};

export default QuotationsPage;
