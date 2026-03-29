import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Paperclip } from "lucide-react";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { useQueryClient } from "@tanstack/react-query";

export const CustomerTabAttachments = memo(function CustomerTabAttachments({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />المستندات والمرفقات</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <FileUpload entityType="customer" entityId={customerId} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'customer', customerId] })} />
        <AttachmentsList entityType="customer" entityId={customerId} />
      </CardContent>
    </Card>
  );
});
