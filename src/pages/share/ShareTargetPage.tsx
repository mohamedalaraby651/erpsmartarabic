import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Share2, FileText, Image, Link, CheckCircle2, X } from 'lucide-react';
import { useFileHandling } from '@/hooks/useFileHandling';

interface SharedContent {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export default function ShareTargetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleFiles, files, isProcessing } = useFileHandling();
  const [sharedContent, setSharedContent] = useState<SharedContent>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const parseSharedContent = async () => {
      // Get text/url from query params (GET) or form data (POST)
      const title = searchParams.get('title') || '';
      const text = searchParams.get('text') || '';
      const url = searchParams.get('url') || '';

      setSharedContent({ title, text, url });

      // Check for shared files in POST data
      if ('launchQueue' in window) {
        // Files will be handled by useLaunchQueue
      }

      setIsLoading(false);
    };

    parseSharedContent();
  }, [searchParams]);

  const handleCreateInvoice = () => {
    const notes = [
      sharedContent.title,
      sharedContent.text,
      sharedContent.url
    ].filter(Boolean).join('\n');

    sessionStorage.setItem('sharedContent', JSON.stringify({ notes }));
    navigate('/invoices?action=new&source=share');
  };

  const handleCreateCustomer = () => {
    sessionStorage.setItem('sharedContent', JSON.stringify({
      name: sharedContent.title || '',
      notes: sharedContent.text || '',
    }));
    navigate('/customers?action=new&source=share');
  };

  const handleUploadAttachment = () => {
    sessionStorage.setItem('sharedContent', JSON.stringify(sharedContent));
    navigate('/attachments?action=upload&source=share');
  };

  if (isLoading || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">جاري معالجة المحتوى المشارك...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasContent = sharedContent.title || sharedContent.text || sharedContent.url || files.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Share2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">محتوى مشارك</h1>
          <p className="text-muted-foreground">
            تم استلام محتوى من تطبيق آخر
          </p>
        </div>

        {/* Shared Content Preview */}
        {hasContent ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المحتوى المستلم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sharedContent.title && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">العنوان</p>
                    <p className="font-medium">{sharedContent.title}</p>
                  </div>
                </div>
              )}
              
              {sharedContent.text && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">النص</p>
                    <p className="whitespace-pre-wrap">{sharedContent.text}</p>
                  </div>
                </div>
              )}
              
              {sharedContent.url && (
                <div className="flex items-start gap-3">
                  <Link className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">الرابط</p>
                    <a 
                      href={sharedContent.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {sharedContent.url}
                    </a>
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="flex items-start gap-3">
                  <Image className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">الملفات ({files.length})</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {files.map((file, index) => (
                        <div 
                          key={index}
                          className="px-3 py-1 bg-muted rounded-full text-sm"
                        >
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <X className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">لم يتم العثور على محتوى مشارك</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {hasContent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ماذا تريد أن تفعل؟</CardTitle>
              <CardDescription>اختر إجراء للمحتوى المستلم</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start h-auto py-4"
                onClick={handleCreateInvoice}
              >
                <FileText className="w-5 h-5 ml-3" />
                <div className="text-right">
                  <p className="font-medium">إنشاء فاتورة جديدة</p>
                  <p className="text-sm text-muted-foreground">إضافة المحتوى كملاحظات للفاتورة</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start h-auto py-4"
                onClick={handleCreateCustomer}
              >
                <CheckCircle2 className="w-5 h-5 ml-3" />
                <div className="text-right">
                  <p className="font-medium">إضافة عميل جديد</p>
                  <p className="text-sm text-muted-foreground">استخدام المحتوى لإنشاء سجل عميل</p>
                </div>
              </Button>

              {(files.length > 0 || sharedContent.url) && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto py-4"
                  onClick={handleUploadAttachment}
                >
                  <Image className="w-5 h-5 ml-3" />
                  <div className="text-right">
                    <p className="font-medium">حفظ كمرفق</p>
                    <p className="text-sm text-muted-foreground">إضافة للمرفقات العامة</p>
                  </div>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancel */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            إلغاء والعودة للرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
