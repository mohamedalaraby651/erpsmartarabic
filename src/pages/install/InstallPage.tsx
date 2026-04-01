import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Bell, 
  Zap, 
  CheckCircle2,
  Share,
  MoreVertical,
  Plus,
  FileText,
  Link2,
  Share2,
  Sparkles,
  HardDrive,
  Shield
} from 'lucide-react';

// PWA Version
const PWA_VERSION = '2.0.0';

export default function InstallPage() {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isAndroid, 
    isStandalone,
    isWindowControlsOverlay,
    promptInstall 
  } = useInstallPrompt();

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      console.log('[PWA 2.0] تم تثبيت التطبيق بنجاح!');
    }
  };

  const features = [
    {
      icon: WifiOff,
      title: 'العمل دون اتصال',
      description: 'الوصول لبياناتك حتى بدون إنترنت'
    },
    {
      icon: Zap,
      title: 'سرعة فائقة',
      description: 'تحميل أسرع من المتصفح العادي'
    },
    {
      icon: Bell,
      title: 'إشعارات فورية',
      description: 'تنبيهات للطلبات والفواتير الجديدة'
    },
    {
      icon: Smartphone,
      title: 'تجربة أصلية',
      description: 'يعمل كتطبيق حقيقي على جهازك'
    }
  ];

  // PWA 2025 Advanced Features
  const advancedFeatures = [
    {
      icon: Share2,
      title: 'استقبال المشاركات',
      description: 'شارك الملفات والنصوص من أي تطبيق'
    },
    {
      icon: FileText,
      title: 'فتح الملفات',
      description: 'Excel و PDF مباشرة في التطبيق'
    },
    {
      icon: Link2,
      title: 'روابط مخصصة',
      description: 'web+invoice:// للوصول السريع'
    },
    {
      icon: HardDrive,
      title: 'تخزين محلي ذكي',
      description: 'IndexedDB v2 لأداء أفضل'
    }
  ];

  if (isStandalone || isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <CardTitle className="text-2xl">التطبيق مثبت بالفعل! 🎉</CardTitle>
            <CardDescription className="text-lg">
              أنت تستخدم ERP Smart كتطبيق مثبت
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>PWA 2025 - الإصدار {PWA_VERSION}</span>
            </div>
            <p className="text-muted-foreground">
              استمتع بالوصول السريع والعمل دون اتصال بالإنترنت مع جميع ميزات PWA المتقدمة
            </p>
            {isWindowControlsOverlay && (
              <div className="p-3 bg-primary/10 rounded-lg text-sm">
                <Shield className="w-4 h-4 inline ml-2" />
                وضع Window Controls Overlay نشط
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-4xl font-bold text-primary-foreground">ERP</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            ثبّت ERP Smart العربي
          </h1>
          <p className="text-xl text-muted-foreground">
            احصل على تجربة أفضل بتثبيت التطبيق على جهازك
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>PWA 2025 - الإصدار {PWA_VERSION}</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="text-center p-4">
              <feature.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        {/* PWA 2025 Features */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              ميزات PWA 2025 الجديدة
            </CardTitle>
            <CardDescription>
              ميزات متقدمة لتكامل أفضل مع النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {advancedFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Install Button for supported browsers */}
        {isInstallable && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-6">
              <Button 
                onClick={handleInstall} 
                size="lg" 
                className="w-full text-lg h-14 gap-3"
              >
                <Download className="w-6 h-6" />
                تثبيت التطبيق الآن
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                مجاني • لا يحتاج متجر تطبيقات • ~5 ميجابايت
              </p>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !isInstallable && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                تعليمات التثبيت على iPhone/iPad (iOS 17+)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">اضغط على زر المشاركة</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Share className="w-5 h-5" />
                    <span>في أسفل الشاشة (Safari)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">اختر "إضافة إلى الشاشة الرئيسية"</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Plus className="w-5 h-5" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">اضغط "إضافة"</p>
                  <p className="text-muted-foreground">سيظهر التطبيق على شاشتك الرئيسية</p>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>ملاحظة iOS 17+:</strong> يدعم التطبيق الآن الإشعارات وعداد الأيقونة على iOS
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (when prompt not available) */}
        {isAndroid && !isInstallable && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                تعليمات التثبيت على Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">اضغط على قائمة المتصفح</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <MoreVertical className="w-5 h-5" />
                    <span>النقاط الثلاث في الأعلى</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية"</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Download className="w-5 h-5" />
                    <span>Install app / Add to Home screen</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">اضغط "تثبيت"</p>
                  <p className="text-muted-foreground">سيظهر التطبيق على شاشتك الرئيسية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !isInstallable && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                تعليمات التثبيت على الكمبيوتر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">ابحث عن أيقونة التثبيت في شريط العنوان</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Download className="w-5 h-5" />
                    <span>عادة على اليمين في Chrome/Edge</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">اضغط "تثبيت"</p>
                  <p className="text-muted-foreground">سيُضاف التطبيق لقائمة التطبيقات</p>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>Edge:</strong> يدعم اللوحة الجانبية (Side Panel) لفتح التطبيق بجانب صفحاتك الأخرى
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>لماذا تثبت التطبيق؟</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>وصول سريع من الشاشة الرئيسية</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>يعمل بدون اتصال بالإنترنت</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>تجربة ملء الشاشة بدون شريط المتصفح</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>تحديثات تلقائية في الخلفية</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>لا يحتاج مساحة تخزين كبيرة (~5 ميجابايت)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>فتح ملفات Excel و PDF مباشرة (PWA 2025)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>استقبال المشاركات من تطبيقات أخرى</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
