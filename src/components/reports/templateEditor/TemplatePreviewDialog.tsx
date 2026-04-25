import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReportTemplate } from './types';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate | null;
}

export function TemplatePreviewDialog({ open, onOpenChange, template }: TemplatePreviewDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>معاينة القالب</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg p-6 bg-white text-black" dir="rtl">
          {/* Header */}
          {template.template_data.header?.showLogo && (
            <div className="flex justify-between items-start mb-6">
              <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                شعار
              </div>
              {template.template_data.header.showCompanyInfo && (
                <div className="text-left">
                  <p className="font-bold">اسم الشركة</p>
                  <p className="text-sm">العنوان</p>
                  <p className="text-sm">الهاتف</p>
                </div>
              )}
            </div>
          )}

          <h1
            className="text-2xl font-bold text-center mb-4"
            style={{ color: template.template_data.styling?.primaryColor }}
          >
            {template.template_data.header?.title}
          </h1>

          {template.template_data.header?.subtitle && (
            <p className="text-center text-gray-600 mb-6">
              {template.template_data.header.subtitle}
            </p>
          )}

          {/* Table */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr style={{ backgroundColor: template.template_data.styling?.primaryColor }}>
                {template.template_data.columns
                  .filter((c) => c.visible)
                  .map((column) => (
                    <th key={column.id} className="p-2 text-white text-right">
                      {column.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((row) => (
                <tr key={row} className="border-b">
                  {template.template_data.columns
                    .filter((c) => c.visible)
                    .map((column) => (
                      <td key={column.id} className="p-2">
                        بيانات {column.label}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t flex justify-between">
            {template.template_data.footer?.showSignature && (
              <div className="text-center">
                <div className="border-t border-dashed w-32 pt-2">التوقيع</div>
              </div>
            )}
            {template.template_data.footer?.showDate && (
              <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            )}
          </div>
          {template.template_data.footer?.notes && (
            <p className="mt-4 text-sm text-gray-600">
              {template.template_data.footer.notes}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
