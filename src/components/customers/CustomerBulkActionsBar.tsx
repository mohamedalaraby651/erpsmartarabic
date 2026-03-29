import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Star, Trash2, X } from "lucide-react";

interface CustomerBulkActionsBarProps {
  selectedCount: number;
  canDelete: boolean;
  onVipChange: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export const CustomerBulkActionsBar = memo(function CustomerBulkActionsBar({
  selectedCount, canDelete, onVipChange, onActivate, onDeactivate, onDelete, onClear,
}: CustomerBulkActionsBarProps) {
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium">
          تم تحديد {selectedCount} عميل{' '}
          <span className="text-xs text-muted-foreground">(من هذه الصفحة فقط)</span>
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onVipChange}>
            <Crown className="h-4 w-4 ml-1" />تغيير VIP
          </Button>
          <Button variant="outline" size="sm" onClick={onActivate}>
            <Star className="h-4 w-4 ml-1" />تفعيل
          </Button>
          <Button variant="outline" size="sm" onClick={onDeactivate}>
            تعطيل
          </Button>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 ml-1" />حذف المحدد
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 ml-1" />إلغاء
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
