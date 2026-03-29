import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRightLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { EmptyState } from "@/components/shared/EmptyState";

interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  product: { id: string; name: string } | null;
  from_warehouse: { id: string; name: string } | null;
  to_warehouse: { id: string; name: string } | null;
}

const typeLabel: Record<string, string> = { in: "إدخال", out: "إخراج", transfer: "تحويل", adjustment: "تعديل" };
const typeBadge: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = { in: "default", out: "destructive", transfer: "secondary", adjustment: "outline" };

interface InventoryMovementsTabProps {
  movements: StockMovement[];
  onAddMovement: () => void;
}

export function InventoryMovementsTab({ movements, onAddMovement }: InventoryMovementsTabProps) {
  const isMobile = useIsMobile();

  if (movements.length === 0) return (
    <EmptyState icon={ArrowRightLeft} title="لا توجد حركات مخزون" description="سجل حركة مخزون جديدة" action={{ label: "حركة مخزون", onClick: onAddMovement }} />
  );

  if (isMobile) return (
    <div className="space-y-3">
      {movements.map((m) => (
        <DataCard
          key={m.id}
          title={m.product?.name || "منتج غير معروف"}
          subtitle={new Date(m.created_at).toLocaleDateString("ar-EG")}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          badge={{ text: typeLabel[m.movement_type] || m.movement_type, variant: typeBadge[m.movement_type] || "default" }}
          fields={([
            { label: "الكمية", value: m.quantity.toLocaleString() },
            m.from_warehouse ? { label: "من", value: m.from_warehouse.name } : null,
            m.to_warehouse ? { label: "إلى", value: m.to_warehouse.name } : null,
          ] as const).filter(Boolean) as Array<{ label: string; value: string | number | React.ReactNode }>}
        />
      ))}
    </div>
  );

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التاريخ</TableHead>
            <TableHead>المنتج</TableHead>
            <TableHead>نوع الحركة</TableHead>
            <TableHead>من</TableHead>
            <TableHead>إلى</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>ملاحظات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{new Date(m.created_at).toLocaleDateString("ar-EG")}</TableCell>
              <TableCell className="font-medium">{m.product?.name}</TableCell>
              <TableCell><Badge variant={typeBadge[m.movement_type] || "default"}>{typeLabel[m.movement_type] || m.movement_type}</Badge></TableCell>
              <TableCell>{m.from_warehouse?.name || "-"}</TableCell>
              <TableCell>{m.to_warehouse?.name || "-"}</TableCell>
              <TableCell>{m.quantity.toLocaleString()}</TableCell>
              <TableCell>{m.notes || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
