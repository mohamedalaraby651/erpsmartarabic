import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'أساسي',
    price: 'مجاني',
    period: '',
    description: 'للبدء واختبار النظام',
    features: [
      '5 مستخدمين',
      '1000 فاتورة/شهر',
      'شركة واحدة',
      'دعم عبر البريد',
      'تقارير أساسية',
    ],
    cta: 'ابدأ مجاناً',
    popular: false,
  },
  {
    name: 'احترافي',
    price: '299',
    period: '/شهرياً',
    description: 'للشركات الصغيرة والمتوسطة',
    features: [
      '25 مستخدم',
      'فواتير غير محدودة',
      '3 شركات',
      'دعم فوري',
      'تقارير متقدمة',
      'API كامل',
      'نسخ احتياطي يومي',
    ],
    cta: 'اشترك الآن',
    popular: true,
  },
  {
    name: 'مؤسسي',
    price: 'تواصل معنا',
    period: '',
    description: 'للشركات الكبيرة',
    features: [
      'مستخدمين غير محدود',
      'شركات غير محدود',
      'SLA مخصص',
      'مدير حساب مخصص',
      'تدريب الفريق',
      'تخصيص كامل',
      'استضافة خاصة',
    ],
    cta: 'تواصل معنا',
    popular: false,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            الباقات والأسعار
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اختر الباقة المناسبة لحجم أعمالك - يمكنك الترقية في أي وقت
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'relative border-2 transition-all hover:shadow-xl',
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-l from-primary to-violet-500">
                  الأكثر شيوعاً
                </Badge>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {plan.price === 'مجاني' || plan.price === 'تواصل معنا'
                      ? plan.price
                      : `${plan.price} ج.م`}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    'w-full',
                    plan.popular
                      ? 'bg-gradient-to-l from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90'
                      : ''
                  )}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => navigate('/auth')}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            لديك أسئلة؟{' '}
            <button className="text-primary hover:underline font-medium">
              تواصل مع فريق المبيعات
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}