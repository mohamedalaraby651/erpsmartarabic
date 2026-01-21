import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { MobileListSkeleton } from '@/components/mobile/MobileListSkeleton';
import { DataCard } from '@/components/mobile/DataCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, FolderTree, Pencil, Trash2 } from 'lucide-react';
import { ExpenseCategoryFormDialog } from '@/components/expenses/ExpenseCategoryFormDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent_id: string | null;
  created_at: string;
}

export default function ExpenseCategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['expense-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: 'تم حذف التصنيف' });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: 'لا يمكن حذف التصنيف', description: 'قد يكون مرتبطًا بمصروفات', variant: 'destructive' });
    },
  });

  const handleEdit = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const content = (
    <div className="space-y-6">
      <PageHeader
        title="تصنيفات المصروفات"
        description="إدارة تصنيفات المصروفات"
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            تصنيف جديد
          </Button>
        }
      />

      {isLoading ? (
        <MobileListSkeleton count={5} />
      ) : categories?.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="لا توجد تصنيفات"
          description="ابدأ بإضافة تصنيف جديد للمصروفات"
          action={{
            label: 'إضافة تصنيف',
            onClick: () => setIsDialogOpen(true),
            icon: Plus,
          }}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {categories?.map((category) => (
            <DataCard
              key={category.id}
              title={category.name}
              subtitle={category.description || 'بدون وصف'}
              badge={{
                text: category.is_active ? 'نشط' : 'غير نشط',
                variant: category.is_active ? 'default' : 'secondary',
              }}
              onClick={() => handleEdit(category)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                      {category.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteId(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ExpenseCategoryFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        category={selectedCategory}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا التصنيف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4">
          {content}
        </div>
      </PullToRefresh>
    );
  }

  return <div className="p-6">{content}</div>;
}
