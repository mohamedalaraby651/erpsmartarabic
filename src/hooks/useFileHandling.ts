import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';


interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  data: any;
  preview?: string;
}

/**
 * Hook for handling files opened via PWA file_handlers
 * Supports Excel, CSV, PDF, and images
 */
export function useFileHandling() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processExcelFile = useCallback(async (file: File): Promise<unknown[][]> => {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          resolve(jsonData as unknown[][]);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const processCSVFile = useCallback(async (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n').map(row => 
            row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
          );
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  const processImageFile = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const processFile = useCallback(async (file: File): Promise<ProcessedFile> => {
    const baseInfo = {
      name: file.name,
      type: file.type,
      size: file.size,
    };

    // Excel files
    if (file.type.includes('spreadsheet') || 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls')) {
      const data = await processExcelFile(file);
      return { ...baseInfo, data, preview: `${data.length} صفوف` };
    }

    // CSV files
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const data = await processCSVFile(file);
      return { ...baseInfo, data, preview: `${data.length} صفوف` };
    }

    // Image files
    if (file.type.startsWith('image/')) {
      const preview = await processImageFile(file);
      return { ...baseInfo, data: null, preview };
    }

    // PDF files - just store metadata
    if (file.type === 'application/pdf') {
      return { 
        ...baseInfo, 
        data: null, 
        preview: 'ملف PDF - لا يمكن معاينته مباشرة' 
      };
    }

    return { ...baseInfo, data: null };
  }, [processExcelFile, processCSVFile, processImageFile]);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const processedFiles: ProcessedFile[] = [];
      
      for (const file of Array.from(fileList)) {
        const processed = await processFile(file);
        processedFiles.push(processed);
      }
      
      setFiles(processedFiles);
      if (import.meta.env.DEV) {
        console.log('[File Handling] Processed files:', processedFiles);
      }
      
      return processedFiles;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في معالجة الملفات';
      setError(message);
      console.error('[File Handling] Error:', err);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [processFile]);

  const importToSystem = useCallback((processedFile: ProcessedFile, targetType: 'products' | 'customers' | 'invoices') => {
    if (!processedFile.data) {
      setError('لا توجد بيانات للاستيراد');
      return;
    }

    // Store import data for the target page
    sessionStorage.setItem('importData', JSON.stringify({
      type: targetType,
      data: processedFile.data,
      fileName: processedFile.name,
    }));

    navigate(`/${targetType}?action=import`);
  }, [navigate]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  return {
    files,
    isProcessing,
    error,
    handleFiles,
    importToSystem,
    clearFiles,
  };
}
