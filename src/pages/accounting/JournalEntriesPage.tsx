import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Eye,
} from "lucide-react";
import JournalFormDialog from "@/components/accounting/JournalFormDialog";
import JournalDetailDialog from "@/components/accounting/JournalDetailDialog";

type Journal = {
  id: string;
  journal_number: string;
  journal_date: string;
  description: string;
  is_posted: boolean;
  posted_at: string | null;
  source_type: string | null;
  source_id: string | null;
  total_debit: number;
  total_credit: number;
  created_at: string;
  fiscal_periods?: { name: string } | null;
};

const sourceTypeLabels: Record<string, string> = {
  manual: "قيد يدوي",
  invoice: "فاتورة",
  payment: "دفعة",
  expense: "مصروف",
  stock_movement: "حركة مخزون",
};

const JournalEntriesPage = () => {
  const { userRole } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canCreate = userRole === "admin" || userRole === "accountant";

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journals")
        .select("*, fiscal_periods(name)")
        .order("journal_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Journal[];
    },
  });

  const filteredJournals = journals.filter((j) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "posted") return j.is_posted;
    if (statusFilter === "draft") return !j.is_posted;
    return true;
  });

  const stats = {
    total: journals.length,
    posted: journals.filter((j) => j.is_posted).length,
    draft: journals.filter((j) => !j.is_posted).length,
    totalAmount: journals.reduce((sum, j) => sum + Number(j.total_debit), 0),
  };

  const handleView = (journal: Journal) => {
    setSelectedJournal(journal);
    setDetailOpen(true);
  };

  const handleAdd = () => {
    setSelectedJournal(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">القيود اليومية</h1>
          <p className="text-muted-foreground">إدارة القيود المحاسبية</p>
        </div>
        {canCreate && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 ml-2" />
            قيد جديد
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي القيود</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.posted}</p>
                <p className="text-sm text-muted-foreground">مرحّلة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-sm text-muted-foreground">مسودة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <FileText className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي المبالغ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="posted">مرحّلة</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Journals Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة القيود</CardTitle>
          <CardDescription>{filteredJournals.length} قيد</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القيد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>المدين</TableHead>
                  <TableHead>الدائن</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJournals.map((journal) => (
                  <TableRow key={journal.id}>
                    <TableCell className="font-mono font-bold">
                      {journal.journal_number}
                    </TableCell>
                    <TableCell>
                      {new Date(journal.journal_date).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {journal.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sourceTypeLabels[journal.source_type || "manual"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {Number(journal.total_debit).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono">
                      {Number(journal.total_credit).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          journal.is_posted
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }
                      >
                        {journal.is_posted ? "مرحّل" : "مسودة"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(journal)}
                      >
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredJournals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد قيود
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <JournalFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <JournalDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        journal={selectedJournal}
      />
    </div>
  );
};

export default JournalEntriesPage;
