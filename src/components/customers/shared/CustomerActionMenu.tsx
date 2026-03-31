import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Edit, Trash2, Eye } from "lucide-react";
import { DataTableActions } from "@/components/ui/data-table-actions";
import type { Customer } from "@/lib/customerConstants";

interface CustomerActionMenuProps {
  customer: Customer;
  variant: 'table' | 'grid' | 'mobile';
  canEdit: boolean;
  canDelete: boolean;
  isDeleting?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNewInvoice?: () => void;
  onWhatsApp?: () => void;
}

export const CustomerActionMenu = memo(function CustomerActionMenu({
  customer, variant, canEdit, canDelete, isDeleting,
  onView, onEdit, onDelete, onNewInvoice, onWhatsApp,
}: CustomerActionMenuProps) {
  if (variant === 'table') {
    return (
      <div className="flex items-center gap-0.5">
        <DataTableActions
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
          isDeleting={isDeleting}
          deleteDescription="سيتم حذف العميل وجميع بياناته. هذا الإجراء لا يمكن التراجع عنه."
        />
        {canEdit && onNewInvoice && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewInvoice} title="فاتورة جديدة">
            <FileText className="h-4 w-4 text-primary" />
          </Button>
        )}
        {customer.phone && onWhatsApp && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onWhatsApp} title="واتساب">
            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {onNewInvoice && (
          <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:h-7 md:w-7 md:min-h-0 md:min-w-0" onClick={onNewInvoice} title="فاتورة جديدة">
            <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 text-primary" />
          </Button>
        )}
        {onWhatsApp && customer.phone && (
          <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:h-7 md:w-7 md:min-h-0 md:min-w-0" onClick={onWhatsApp} title="واتساب">
            <MessageSquare className="h-4 w-4 md:h-3.5 md:w-3.5 text-emerald-600" />
          </Button>
        )}
        {canEdit && (
          <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:h-7 md:w-7 md:min-h-0 md:min-w-0" onClick={onEdit} title="تعديل">
            <Edit className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground" />
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:h-7 md:w-7 md:min-h-0 md:min-w-0" onClick={onDelete} title="حذف">
            <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    );
  }

  // mobile variant — full touch-friendly buttons
  return (
    <div className="flex gap-1.5 flex-wrap">
      {onNewInvoice && (
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onNewInvoice} title="فاتورة جديدة">
          <FileText className="h-4 w-4 text-primary" />
        </Button>
      )}
      {onWhatsApp && customer.phone && (
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onWhatsApp} title="واتساب">
          <MessageSquare className="h-4 w-4 text-emerald-600" />
        </Button>
      )}
      {canEdit && (
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onEdit} title="تعديل">
          <Edit className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onView} title="عرض">
        <Eye className="h-4 w-4 text-primary" />
      </Button>
      {canDelete && (
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onDelete} title="حذف">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
});
