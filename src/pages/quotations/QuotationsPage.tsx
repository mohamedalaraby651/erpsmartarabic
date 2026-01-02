import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, Printer, ArrowLeftRight, Eye } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import QuotationFormDialog from "@/components/quotations/QuotationFormDialog";
import { QuotationPrintView } from "@/components/print/QuotationPrintView";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printQuotationId, setPrintQuotationId] = useState<string | null>(null);
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('quotation_items').delete().eq('quotation_id', id);
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast({ title: "تم حذف عرض السعر بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف عرض السعر", variant: "destructive" });
    },
  });

  // Filter by search
  const searchFiltered = quotations.filter((q: any) =>
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { filteredData, filters, setFilter } = useTableFilter(searchFiltered);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const stats = {
    total: quotations.length,
    pending: quotations.filter((q: any) => q.status === 'pending').length,
    approved: quotations.filter((q: any) => q.status === 'approved').length,
    totalValue: quotations.reduce((sum: number, q: any) => sum + Number(q.total_amount), 0),
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
        <div className="flex gap-2">
          <ExportWithTemplateButton
            section="quotations"
            sectionLabel="عروض الأسعار"
            data={sortedData}
            columns={[
              { key: 'quotation_number', label: 'رقم العرض' },
              { key: 'customers.name', label: 'العميل' },
              { key: 'total_amount', label: 'الإجمالي' },
              { key: 'status', label: 'الحالة' },
              { key: 'valid_until', label: 'صالح حتى' },
              { key: 'created_at', label: 'التاريخ' },
            ]}
          />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 ml-2" />
            عرض سعر جديد
          </Button>
        </div>
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
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم العرض أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
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
          ) : sortedData.length === 0 ? (
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
                    <DataTableHeader
                      label="رقم العرض"
                      sortKey="quotation_number"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                    <DataTableHeader label="العميل" />
                    <DataTableHeader
                      label="التاريخ"
                      sortKey="created_at"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                    <DataTableHeader label="صالح حتى" />
                    <DataTableHeader
                      label="الإجمالي"
                      sortKey="total_amount"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                    <DataTableHeader
                      label="الحالة"
                      filterKey="status"
                      filterType="select"
                      filterOptions={[
                        { value: 'draft', label: 'مسودة' },
                        { value: 'pending', label: 'معلق' },
                        { value: 'approved', label: 'معتمد' },
                        { value: 'rejected', label: 'مرفوض' },
                      ]}
                      filterValue={filters.status as string}
                      onFilter={setFilter}
                    />
                    <DataTableHeader label="إجراءات" className="text-left" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((quotation: any) => (
                    <TableRow key={quotation.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/quotations/${quotation.id}`)}>
                      <TableCell>
                        <EntityLink type="quotation" id={quotation.id}>
                          {quotation.quotation_number}
                        </EntityLink>
                      </TableCell>
                      <TableCell>
                        {quotation.customers?.name ? (
                          <EntityLink type="customer" id={quotation.customer_id}>
                            {quotation.customers.name}
                          </EntityLink>
                        ) : '-'}
                      </TableCell>
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
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/quotations/${quotation.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(quotation.id)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          <DataTableActions
                            onEdit={() => handleEdit(quotation)}
                            onDelete={() => deleteMutation.mutate(quotation.id)}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            deleteDescription="سيتم حذف عرض السعر وجميع بنوده نهائياً."
                          />
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