import { 
  BarChart3, 
  Shield, 
  Smartphone, 
  Building2, 
  CloudOff, 
  RefreshCw,
  Users,
  Receipt,
  Package,
  Wallet
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const mainFeatures = [
  {
    icon: BarChart3,
    title: 'تقارير لحظية',
    description: 'لوحة تحكم تفاعلية مع إحصائيات ورسوم بيانية محدثة لحظياً',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Shield,
    title: 'أمان مؤسسي',
    description: 'RLS + 2FA + Rate Limiting + سلاسل الموافقات المالية',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Smartphone,
    title: 'PWA متجاوب',
    description: 'يعمل على جميع الأجهزة كتطبيق أصلي مع دعم كامل للعربية',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    icon: Building2,
    title: 'تعدد الشركات',
    description: 'عزل تام للبيانات بين الشركات مع إمكانية التبديل الفوري',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: CloudOff,
    title: 'يعمل بدون إنترنت',
    description: 'Offline-First - حفظ البيانات محلياً والمزامنة عند الاتصال',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: RefreshCw,
    title: 'مزامنة ذكية',
    description: 'مزامنة تلقائية للبيانات مع كشف وحل التعارضات',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

const modules = [
  { icon: Users, title: 'إدارة العملاء', description: 'ملفات شاملة وتاريخ التعاملات' },
  { icon: Receipt, title: 'الفواتير والمبيعات', description: 'فواتير احترافية وتتبع المدفوعات' },
  { icon: Package, title: 'المخزون', description: 'تتبع المنتجات والتنبيهات الذكية' },
  { icon: Wallet, title: 'المحاسبة', description: 'قيود يومية وتقارير مالية' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            لماذا <span className="bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">نظرة</span>؟
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            نظام ERP متكامل صُمم خصيصاً للشركات العربية مع التركيز على الأمان والأداء
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {mainFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-background">
                <CardContent className="p-6">
                  <div className={`h-12 w-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modules */}
        <div className="bg-background rounded-2xl border shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-8">الوحدات المتكاملة</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.title} className="text-center p-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h4 className="font-bold mb-1">{module.title}</h4>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}