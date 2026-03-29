import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Warehouse, Edit, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Database } from "@/integrations/supabase/types";

type WarehouseRow = Database['public']['Tables']['warehouses']['Row'];

interface InventoryWarehousesTabProps {
  warehouses: WarehouseRow[];
  isLoading: boolean;
  onEdit: (warehouse: WarehouseRow) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function InventoryWarehousesTab({ warehouses, isLoading, onEdit, onDelete, onAdd }: InventoryWarehousesTabProps) {
  const isMobile = useIsMobile();

  if (isLoading) return isMobile ? <MobileListSkeleton count={3} /> : (
    <Card className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></Card>
  );

  if (warehouses.length === 0) return (
    <EmptyState icon={Warehouse} title="لا توجد مستودعات" description="أضف مستودعًا جديدًا للبدء" action={{ label: "إضافة مستودع", onClick: onAdd }} />
  );

  if (isMobile) return (
    <div className="space-y-3">
      {warehouses.map((w) => (
        <DataCard
          key={w.id}
          title={w.name}
          subtitle={w.location || "لا يوجد موقع"}
          icon={<Warehouse className="h-5 w-5" />}
          badge={w.is_active ? { text: "نشط", variant: "default" } : { text: "غير نشط", variant: "secondary" }}
          fields={w.description ? [{ label: "الوصف", value: w.description }] : []}
          onEdit={() => onEdit(w)}
          onDelete={() => onDelete(w.id)}
        />
      ))}
    </div>
  );

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المستودع</TableHead>
            <TableHead>الموقع</TableHead>
            <TableHead>الوصف</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((w) => (
            <TableRow key={w.id}>
              <TableCell className="font-medium">{w.name}</TableCell>
              <TableCell>{w.location || "-"}</TableCell>
              <TableCell>{w.description || "-"}</TableCell>
              <TableCell><Badge variant={w.is_active ? "default" : "secondary"}>{w.is_active ? "نشط" : "غير نشط"}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(w)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
