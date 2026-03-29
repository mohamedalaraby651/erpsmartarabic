import React, { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MapPin, Plus, Edit, Trash2 } from "lucide-react";
import type { CustomerAddress } from "@/lib/customerConstants";

interface Props {
  addresses: CustomerAddress[];
  onAdd: () => void;
  onEdit: (address: CustomerAddress) => void;
  onDelete: (id: string) => void;
}

export const CustomerTabAddresses = memo(function CustomerTabAddresses({ addresses, onAdd, onEdit, onDelete }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />العناوين</CardTitle>
          <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 ml-2" />إضافة عنوان</Button>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-8"><MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد عناوين</p></div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{address.label}</span>
                      {address.is_default && <Badge variant="secondary">افتراضي</Badge>}
                    </div>
                    <p className="text-muted-foreground mt-1">{address.address}</p>
                    {(address.city || address.governorate) && (
                      <p className="text-sm text-muted-foreground">{[address.city, address.governorate].filter(Boolean).join(' - ')}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => onEdit(address)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => setDeleteId(address.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف العنوان</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا العنوان؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
