import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  CreditCard,
  Edit,
  Plus,
  Trash2,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SupplierActivityTabProps {
  supplierId: string;
}

const actionLabels: Record<string, { label: string; icon: any; color: string }> = {
  create: { label: 'إنشاء', icon: Plus, color: 'bg-green-500/10 text-green-600' },
  update: { label: 'تحديث', icon: Edit, color: 'bg-blue-500/10 text-blue-600' },
  delete: { label: 'حذف', icon: Trash2, color: 'bg-red-500/10 text-red-600' },
};

const entityLabels: Record<string, { label: string; icon: any }> = {
  supplier: { label: 'المورد', icon: Activity },
  purchase_order: { label: 'أمر شراء', icon: ShoppingCart },
  supplier_payment: { label: 'دفعة', icon: CreditCard },
};

const SupplierActivityTab = ({ supplierId }: SupplierActivityTabProps) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['supplier-activity', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .or(`entity_id.eq.${supplierId},and(entity_type.eq.purchase_order,entity_id.in.(select id from purchase_orders where supplier_id='${supplierId}')),and(entity_type.eq.supplier_payment,entity_id.in.(select id from supplier_payments where supplier_id='${supplierId}'))`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">سجل النشاطات</CardTitle>
        <p className="text-sm text-muted-foreground">
          جميع العمليات المتعلقة بهذا المورد
        </p>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {activities.map((activity) => {
                const actionInfo = actionLabels[activity.action] || actionLabels.update;
                const entityInfo = entityLabels[activity.entity_type] || entityLabels.supplier;
                const Icon = actionInfo.icon;
                
                return (
                  <div key={activity.id} className="relative flex gap-4 pr-8">
                    {/* Timeline dot */}
                    <div className={`absolute right-2 w-4 h-4 rounded-full border-2 border-background ${actionInfo.color.replace('text-', 'bg-').replace('/10', '')}`} />
                    
                    <div className="flex-1 bg-muted/30 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={actionInfo.color}>
                            <Icon className="h-3 w-3 ml-1" />
                            {actionInfo.label}
                          </Badge>
                          <Badge variant="secondary">
                            <entityInfo.icon className="h-3 w-3 ml-1" />
                            {entityInfo.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), "d MMM yyyy HH:mm", { locale: ar })}
                        </span>
                      </div>
                      
                      {activity.entity_name && (
                        <p className="text-sm mt-2 font-medium">{activity.entity_name}</p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        بواسطة: مستخدم النظام
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد نشاطات مسجلة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierActivityTab;
