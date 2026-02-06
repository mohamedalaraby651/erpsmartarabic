import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Check, Play, Sparkles } from 'lucide-react';

export function HeroSection() {
  const navigate = useNavigate();

  const features = [
    'يعمل بدون إنترنت',
    'متعدد الشركات',
    'تقارير لحظية',
    'أمان مؤسسي',
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-violet-500/5" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl opacity-50" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge variant="outline" className="mb-6 py-2 px-4 border-primary/30 bg-primary/5">
            <Sparkles className="h-4 w-4 ml-2 text-primary" />
            الإصدار 2.0 - تعدد الشركات والأمان المؤسسي
          </Badge>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-2xl shadow-primary/30">
                <Layers className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-3xl blur-2xl -z-10" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">
              نظرة
            </span>
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground mb-4">
            نظام إدارة الأعمال الذكي
          </p>
          <p className="text-lg text-muted-foreground/80 mb-8 max-w-2xl mx-auto">
            إدارة شاملة لمؤسستك: العملاء • المبيعات • المخزون • المحاسبة
            <br />
            في منصة واحدة متكاملة تعمل على جميع الأجهزة
          </p>

          {/* Features List */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2"
              >
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-l from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-lg px-8 py-6 shadow-lg shadow-primary/25"
            >
              ابدأ مجاناً
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 group"
            >
              <Play className="h-5 w-5 ml-2 group-hover:text-primary transition-colors" />
              شاهد العرض التوضيحي
            </Button>
          </div>

          {/* Trust Badge */}
          <p className="mt-8 text-sm text-muted-foreground">
            لا حاجة لبطاقة ائتمان • إعداد خلال دقائق • دعم فني مجاني
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl border shadow-2xl p-4 md:p-6">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'العملاء', value: '1,250', color: 'text-blue-500' },
                  { label: 'الفواتير', value: '3,480', color: 'text-emerald-500' },
                  { label: 'المنتجات', value: '890', color: 'text-violet-500' },
                  { label: 'الإيرادات', value: '٤٥٠ ألف', color: 'text-amber-500' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-background/60 rounded-xl p-3 text-center border">
                    <p className={`text-lg md:text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 bg-background/60 rounded-xl p-4 border h-32 flex items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 80].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${h}%` }}>
                      <div className="w-full bg-primary rounded-t" style={{ height: '60%' }} />
                    </div>
                  ))}
                </div>
                <div className="bg-background/60 rounded-xl p-3 border flex flex-col justify-center items-center gap-2">
                  <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center">
                    <span className="text-sm font-bold">87%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">نسبة التحصيل</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}