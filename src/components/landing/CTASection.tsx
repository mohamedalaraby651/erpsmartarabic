import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layers, ArrowLeft } from 'lucide-react';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-violet-500/5 to-primary/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-2xl shadow-primary/30">
              <Layers className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            هل أنت جاهز لإدارة أعمالك بذكاء؟
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            انضم لآلاف الشركات التي تستخدم نظرة لإدارة أعمالها بكفاءة
          </p>

          {/* CTA */}
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-l from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-lg px-10 py-7 shadow-lg shadow-primary/25 group"
          >
            ابدأ تجربتك المجانية اليوم
            <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </Button>

          {/* Trust */}
          <p className="mt-6 text-sm text-muted-foreground">
            لا حاجة لبطاقة ائتمان • إعداد خلال دقائق
          </p>
        </div>
      </div>
    </section>
  );
}