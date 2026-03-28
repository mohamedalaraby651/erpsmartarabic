import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Layers, Edit, Trash2, FolderTree, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logErrorSafely, getSafeErrorMessage } from "@/lib/errorHandler";
import CategoryFormDialog from "@/components/categories/CategoryFormDialog";
import type { Database } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";

type ProductCategory = Database['public']['Tables']['product_categories']['Row'];

const CategoriesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Handle action parameter from URL (FAB/QuickActions)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ProductCategory[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: "تم حذف التصنيف بنجاح" });
    },
    onError: (error) => {
      logErrorSafely('CategoriesPage', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleEdit = (category: ProductCategory) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    setDialogOpen(true);
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '-';
    const parent = categories.find(c => c.id === parentId);
    return parent?.name || '-';
  };

  const getSubcategoriesCount = (categoryId: string) => {
    return categories.filter(c => c.parent_id === categoryId).length;
  };

  const rootCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Mobile Category Card
  const renderCategoryCard = (category: ProductCategory, level: number = 0): JSX.Element[] => {
    const children = getChildren(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return [
      <div key={category.id} style={{ marginRight: `${level * 16}px` }}>
        <DataCard
          title={category.name}
          subtitle={category.description || undefined}
          icon={<Layers className="h-5 w-5" />}
          badge={hasChildren ? { text: `${children.length} فرعي`, variant: "secondary" } : undefined}
          fields={([
            category.parent_id ? { label: "التصنيف الأب", value: getParentName(category.parent_id) } : null,
            { label: "الترتيب", value: category.sort_order || 0 },
          ] as const).filter(Boolean) as Array<{ label: string; value: string | number | React.ReactNode; icon?: React.ReactNode }>}
          onEdit={() => handleEdit(category)}
          onDelete={() => {
            if (confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
              deleteMutation.mutate(category.id);
            }
          }}
          rightContent={
            hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(category.id);
                }}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            ) : undefined
          }
        />
      </div>,
      ...(isExpanded ? children.flatMap(child => renderCategoryCard(child, level + 1)) : [])
    ];
  };

  const renderCategoryRow = (category: ProductCategory, level: number = 0): JSX.Element[] => {
    const children = getChildren(category.id);
    return [
      <TableRow key={category.id}>
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingRight: `${level * 24}px` }}>
            {level > 0 && <span className="text-muted-foreground">└</span>}
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-medium">{category.name}</span>
          </div>
        </TableCell>
        <TableCell>{getParentName(category.parent_id)}</TableCell>
        <TableCell>{category.description || '-'}</TableCell>
        <TableCell>{getSubcategoriesCount(category.id)}</TableCell>
        <TableCell>{category.sort_order || 0}</TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
                  deleteMutation.mutate(category.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>,
      ...children.flatMap(child => renderCategoryRow(child, level + 1))
    ];
  };

  const pageContent = (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة التصنيفات</h1>
          <p className="text-muted-foreground">تصنيفات المنتجات الهرمية</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة تصنيف
        </Button>
      </div>

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي التصنيفات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <FolderTree className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rootCategories.length}</p>
                <p className="text-sm text-muted-foreground">تصنيفات رئيسية</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {!isMobile && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Layers className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categories.length - rootCategories.length}</p>
                  <p className="text-sm text-muted-foreground">تصنيفات فرعية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        isMobile ? (
          <MobileListSkeleton count={5} />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </CardContent>
          </Card>
        )
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="لا توجد تصنيفات"
          description="أضف تصنيفًا جديدًا للبدء في تنظيم المنتجات"
          action={{
            label: "إضافة تصنيف",
            onClick: handleAdd
          }}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {rootCategories.flatMap(category => renderCategoryCard(category, 0))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>قائمة التصنيفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>التصنيف الأب</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الفرعية</TableHead>
                    <TableHead>الترتيب</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rootCategories.flatMap(category => renderCategoryRow(category, 0))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        categories={categories}
      />
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        {pageContent}
      </PullToRefresh>
    );
  }

  return pageContent;
};

export default CategoriesPage;
