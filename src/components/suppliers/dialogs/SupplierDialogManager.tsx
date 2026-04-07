import React, { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import SupplierImportDialog from "@/components/suppliers/SupplierImportDialog";
import SupplierPaymentDialog from "@/components/suppliers/SupplierPaymentDialog";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

export interface SupplierDialogManagerHandle {
  openAdd: () => void;
  openEdit: (supplier: Supplier) => void;
  confirmDelete: (id: string) => void;
  openImport: () => void;
  openPayment: (supplier: Supplier) => void;
  openBulkDelete: () => void;
  openBulkStatus: (isActive: boolean) => void;
}

interface SupplierDialogManagerProps {
  onDeleteConfirm: (id: string) => void;
  onBulkDelete: () => void;
  onBulkStatusUpdate: (isActive: boolean) => void;
  bulkSelectedCount: number;
}

export const SupplierDialogManager = forwardRef<SupplierDialogManagerHandle, SupplierDialogManagerProps>(
  function SupplierDialogManager({ onDeleteConfirm, onBulkDelete, onBulkStatusUpdate, bulkSelectedCount }, ref) {
    const [formOpen, setFormOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkStatusValue, setBulkStatusValue] = useState(true);

    useImperativeHandle(ref, () => ({
      openAdd: () => { setSelectedSupplier(null); setFormOpen(true); },
      openEdit: (supplier: Supplier) => { setSelectedSupplier(supplier); setFormOpen(true); },
      confirmDelete: (id: string) => setDeleteConfirmId(id),
      openImport: () => setImportOpen(true),
      openPayment: (supplier: Supplier) => { setPaymentSupplier(supplier); setPaymentOpen(true); },
      openBulkDelete: () => setBulkDeleteOpen(true),
      openBulkStatus: (isActive: boolean) => { setBulkStatusValue(isActive); setBulkStatusOpen(true); },
    }));

    const handleDeleteConfirm = useCallback(() => {
      if (!deleteConfirmId) return;
      onDeleteConfirm(deleteConfirmId);
      setDeleteConfirmId(null);
    }, [deleteConfirmId, onDeleteConfirm]);

    return (
      <>
        <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={selectedSupplier} />
        <SupplierImportDialog open={importOpen} onOpenChange={setImportOpen} />
        {paymentSupplier && <SupplierPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} supplier={paymentSupplier} />}

        {/* Single Delete Confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف المورد</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف هذا المورد وجميع بياناته بشكل نهائي. هل أنت متأكد؟</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف {bulkSelectedCount} مورد</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف الموردين المحددين وجميع بياناتهم. هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={() => { onBulkDelete(); setBulkDeleteOpen(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف الكل</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Status */}
        <AlertDialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{bulkStatusValue ? 'تفعيل' : 'إلغاء تفعيل'} {bulkSelectedCount} مورد</AlertDialogTitle>
              <AlertDialogDescription>سيتم {bulkStatusValue ? 'تفعيل' : 'إلغاء تفعيل'} جميع الموردين المحددين.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={() => { onBulkStatusUpdate(bulkStatusValue); setBulkStatusOpen(false); }}>تأكيد</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);
