import React, { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerFormDialog from "@/components/customers/dialogs/CustomerFormDialog";
import CustomerImportDialog from "@/components/customers/dialogs/CustomerImportDialog";
import CustomerMergeDialog from "@/components/customers/dialogs/CustomerMergeDialog";
import { DuplicateDetectionDialog } from "@/components/customers/dialogs/DuplicateDetectionDialog";
import { vipOptions } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";

export interface DialogManagerHandle {
  openAdd: () => void;
  openEdit: (customer: Customer) => void;
  confirmDelete: (id: string) => void;
  openImport: () => void;
  openMerge: () => void;
  openDuplicates: () => void;
  openBulkDelete: () => void;
  openBulkVip: () => void;
}

interface DialogManagerProps {
  onDeleteConfirm: (id: string) => void;
  onBulkDelete: () => void;
  onBulkVipUpdate: (vipLevel: string) => void;
  bulkSelectedCount: number;
}

export const CustomerDialogManager = forwardRef<DialogManagerHandle, DialogManagerProps>(
  function CustomerDialogManager({ onDeleteConfirm, onBulkDelete, onBulkVipUpdate, bulkSelectedCount }, ref) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkVipOpen, setBulkVipOpen] = useState(false);
    const [bulkVipValue, setBulkVipValue] = useState('regular');

    useImperativeHandle(ref, () => ({
      openAdd: () => { setSelectedCustomer(null); setDialogOpen(true); },
      openEdit: (customer: Customer) => { setSelectedCustomer(customer); setDialogOpen(true); },
      confirmDelete: (id: string) => setDeleteConfirmId(id),
      openImport: () => setImportDialogOpen(true),
      openMerge: () => setMergeDialogOpen(true),
      openDuplicates: () => setDuplicateDialogOpen(true),
      openBulkDelete: () => setBulkDeleteOpen(true),
      openBulkVip: () => setBulkVipOpen(true),
    }));

    const handleDeleteConfirm = useCallback(() => {
      if (!deleteConfirmId) return;
      onDeleteConfirm(deleteConfirmId);
      setDeleteConfirmId(null);
    }, [deleteConfirmId, onDeleteConfirm]);

    return (
      <>
        {/* Customer Form Dialog */}
        <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={selectedCustomer} />
        <CustomerImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
        <CustomerMergeDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen} />
        <DuplicateDetectionDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen} />

        {/* Single Delete Confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف هذا العميل وجميع بياناته بشكل نهائي. هل أنت متأكد؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Dialog */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف {bulkSelectedCount} عميل</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف العملاء المحددين وجميع بياناتهم. هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { onBulkDelete(); setBulkDeleteOpen(false); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف الكل
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk VIP Dialog */}
        <AlertDialog open={bulkVipOpen} onOpenChange={setBulkVipOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تغيير مستوى VIP لـ {bulkSelectedCount} عميل</AlertDialogTitle>
            </AlertDialogHeader>
            <Select value={bulkVipValue} onValueChange={setBulkVipValue}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vipOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={() => { onBulkVipUpdate(bulkVipValue); setBulkVipOpen(false); }}>
                تحديث
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);
