import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Merge } from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import CustomerMergeDialog from "@/components/customers/CustomerMergeDialog";

interface DuplicateDetectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DuplicateResult {
  id1: string;
  name1: string;
  phone1: string | null;
  id2: string;
  name2: string;
  phone2: string | null;
  similarity_score: number;
  match_type: string;
}

export const DuplicateDetectionDialog = ({ open, onOpenChange }: DuplicateDetectionDialogProps) => {
  const [mergeOpen, setMergeOpen] = useState(false);

  const { data: duplicates = [], isLoading } = useQuery({
    queryKey: ['duplicate-customers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_duplicate_customers');
      if (error) throw error;
      return (data || []) as DuplicateResult[];
    },
    enabled: open,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              كشف العملاء المكررين
            </DialogTitle>
            <DialogDescription>
              يتم البحث تلقائياً عن العملاء المتشابهين بالاسم أو الهاتف
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="mr-2 text-sm text-muted-foreground">جاري البحث عن المكررين...</span>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا يوجد عملاء مكررين 🎉</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل الأول</TableHead>
                    <TableHead>العميل الثاني</TableHead>
                    <TableHead>نوع المطابقة</TableHead>
                    <TableHead>التشابه</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicates.map((dup, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{dup.name1}</p>
                          <p className="text-xs text-muted-foreground">{dup.phone1 || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{dup.name2}</p>
                          <p className="text-xs text-muted-foreground">{dup.phone2 || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dup.match_type === 'phone' ? 'destructive' : 'secondary'}>
                          {dup.match_type === 'phone' ? 'هاتف مطابق' : 'اسم متشابه'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {Math.round(dup.similarity_score * 100)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
            {duplicates.length > 0 && (
              <Button onClick={() => { onOpenChange(false); setMergeOpen(true); }}>
                <Merge className="h-4 w-4 ml-2" />فتح أداة الدمج
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <CustomerMergeDialog open={mergeOpen} onOpenChange={setMergeOpen} />
    </>
  );
};

export default DuplicateDetectionDialog;
