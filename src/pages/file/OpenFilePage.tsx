import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  FileSpreadsheet, 
  FileText, 
  Image, 
  Upload, 
  Download,
  Table,
  Users,
  Package,
  FileCheck,
  X
} from 'lucide-react';
import { useFileHandling } from '@/hooks/useFileHandling';
import { useLaunchQueue } from '@/hooks/useLaunchQueue';

export default function OpenFilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { files, isProcessing, error, handleFiles, importToSystem, clearFiles } = useFileHandling();
  const { launchParams, clearLaunchParams } = useLaunchQueue();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeFiles = async () => {
      // Check for files from Launch Queue
      if (launchParams?.files?.length) {
        const fileList = launchParams.files.map(f => f.file);
        await handleFiles(fileList);
        setInitialized(true);
        return;
      }

      // Check for files passed via location state
      if (location.state?.files) {
        await handleFiles(location.state.files);
        setInitialized(true);
        return;
      }

      // Check for stored launch files
      const storedFiles = sessionStorage.getItem('launchFiles');
      if (storedFiles) {
        // Files metadata only - actual files handled by Launch Queue
        setInitialized(true);
        return;
      }

      setInitialized(true);
    };

    if (!initialized) {
      initializeFiles();
    }
  }, [launchParams, location.state, handleFiles, initialized]);

  const getFileIcon = (type: string) => {
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return FileSpreadsheet;
    }
    if (type.includes('image')) {
      return Image;
    }
    if (type.includes('pdf')) {
      return FileText;
    }
    return FileCheck;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCancel = () => {
    clearFiles();
    clearLaunchParams();
    navigate('/');
  };

  if (isProcessing || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">جاري معالجة الملفات...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium mb-2">خطأ في معالجة الملفات</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleCancel}>العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">لم يتم العثور على ملفات</p>
            <p className="text-muted-foreground mb-4">
              يمكنك فتح الملفات عن طريق النقر عليها من مدير الملفات
            </p>
            <Button onClick={handleCancel}>العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">فتح ملفات</h1>
          <p className="text-muted-foreground">
            تم فتح {files.length} ملف/ملفات
          </p>
        </div>

        {/* Files List */}
        {files.map((file, index) => {
          const FileIcon = getFileIcon(file.type);
          const isSpreadsheet = file.type.includes('spreadsheet') || 
                                file.type.includes('csv') || 
                                file.name.endsWith('.xlsx') ||
                                file.name.endsWith('.xls');

          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{file.name}</CardTitle>
                    <CardDescription>
                      {file.type || 'نوع غير معروف'} • {formatFileSize(file.size)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Preview */}
                {file.preview && (
                  <div className="p-4 bg-muted rounded-lg">
                    {file.type.includes('image') ? (
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="max-w-full max-h-64 mx-auto rounded"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{file.preview}</p>
                    )}
                  </div>
                )}

                {/* Data Preview for spreadsheets */}
                {file.data && isSpreadsheet && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          {file.data[0]?.slice(0, 5).map((header: unknown, i: number) => (
                            <th key={i} className="p-2 text-right border">
                              {String(header) || `عمود ${i + 1}`}
                            </th>
                          ))}
                          {file.data[0]?.length > 5 && (
                            <th className="p-2 text-center border">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {file.data.slice(1, 4).map((row: unknown[], rowIndex: number) => (
                          <tr key={rowIndex}>
                            {row.slice(0, 5).map((cell: unknown, cellIndex: number) => (
                              <td key={cellIndex} className="p-2 border">
                                {String(cell) || '-'}
                              </td>
                            ))}
                            {row.length > 5 && (
                              <td className="p-2 text-center border">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {file.data.length > 4 && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        + {file.data.length - 4} صفوف أخرى
                      </p>
                    )}
                  </div>
                )}

                {/* Import Actions for spreadsheets */}
                {isSpreadsheet && file.data && (
                  <div className="space-y-3 pt-4 border-t">
                    <p className="font-medium">استيراد البيانات إلى:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => importToSystem(file, 'products')}
                        className="flex items-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        المنتجات
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => importToSystem(file, 'customers')}
                        className="flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        العملاء
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => importToSystem(file, 'invoices')}
                        className="flex items-center gap-2"
                      >
                        <Table className="w-4 h-4" />
                        الفواتير
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Cancel */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleCancel}>
            إلغاء والعودة للرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
