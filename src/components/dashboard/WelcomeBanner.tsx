 import { useState } from 'react';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { X, Sparkles, Check, Building2, Shield, Zap } from 'lucide-react';
 
 export function WelcomeBanner() {
   const [dismissed, setDismissed] = useState(() => {
     return localStorage.getItem('nazra-welcome-dismissed') === 'true';
   });
 
   if (dismissed) return null;
 
   const handleDismiss = () => {
     localStorage.setItem('nazra-welcome-dismissed', 'true');
     setDismissed(true);
   };
 
   const features = [
     { icon: Building2, label: 'عزل البيانات متعدد الشركات' },
     { icon: Shield, label: 'سلسلة الموافقات المالية' },
     { icon: Zap, label: 'حماية Rate Limiting' },
   ];
 
   return (
     <Card className="bg-gradient-to-l from-primary/10 via-violet-500/5 to-transparent border-primary/20 overflow-hidden">
       <CardContent className="p-6">
         <div className="flex items-start justify-between gap-4">
           <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shrink-0">
               <Sparkles className="h-6 w-6 text-white" />
             </div>
             <div>
               <h3 className="font-bold text-lg">مرحباً بك في نظرة 2.0!</h3>
               <p className="text-sm text-muted-foreground mt-1">
                 تم تفعيل الميزات المؤسسية الجديدة
               </p>
             </div>
           </div>
           <Button variant="ghost" size="icon" onClick={handleDismiss} className="shrink-0">
             <X className="h-4 w-4" />
           </Button>
         </div>
         <div className="grid sm:grid-cols-3 gap-4 mt-6">
           {features.map((feature) => (
             <div 
               key={feature.label}
               className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
             >
               <Check className="h-5 w-5 text-primary shrink-0" />
               <span className="text-sm">{feature.label}</span>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   );
 }
 
 export default WelcomeBanner;