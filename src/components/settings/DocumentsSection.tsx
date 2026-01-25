import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AttachmentUploadForm } from '@/components/shared/AttachmentUploadForm';
import { AttachmentsList } from '@/components/shared/AttachmentsList';
import { Paperclip } from 'lucide-react';

interface DocumentsSectionProps {
  userId: string;
}

export function DocumentsSection({ userId }: DocumentsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Paperclip className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>مستنداتي</CardTitle>
              <CardDescription>
                قم برفع وإدارة مستنداتك الشخصية (هوية، عقود، شهادات، إلخ)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <AttachmentUploadForm entityId={userId} entityType="profile" />
          <AttachmentsList entityId={userId} entityType="profile" />
        </CardContent>
      </Card>
    </div>
  );
}
