import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logErrorSafely } from '@/lib/errorHandler';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: any[];
  filename: string;
  headers?: Record<string, string>;
}

export function ExportButton({ data, filename, headers }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (!data || data.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    setIsExporting(true);
    try {
      // Transform data with Arabic headers if provided
      const exportData = headers
        ? data.map((row) => {
            const newRow: Record<string, any> = {};
            Object.keys(headers).forEach((key) => {
              newRow[headers[key]] = row[key];
            });
            return newRow;
          })
        : data;

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'البيانات');

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('تم تصدير الملف بنجاح');
    } catch (error) {
      logErrorSafely('ExportButton', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    if (!data || data.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    setIsExporting(true);
    try {
      const exportData = headers
        ? data.map((row) => {
            const newRow: Record<string, any> = {};
            Object.keys(headers).forEach((key) => {
              newRow[headers[key]] = row[key];
            });
            return newRow;
          })
        : data;

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('تم تصدير الملف بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="mr-2">تصدير</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 ml-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 ml-2" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
