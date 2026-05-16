import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import { logErrorSafely } from '@/lib/errorHandler';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      logErrorSafely('ForgotPassword.submit', error);
    }
    // أمنياً: نعرض نفس الرسالة سواء وُجد البريد أم لا
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-0 shadow-xl glass">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3 mx-auto">
              {sent ? <CheckCircle2 className="h-7 w-7 text-success" /> : <Mail className="h-7 w-7 text-primary" />}
            </div>
            <CardTitle className="text-xl">{sent ? 'تحقق من بريدك الإلكتروني' : 'استرجاع كلمة المرور'}</CardTitle>
            <CardDescription>
              {sent
                ? 'إذا كان البريد مسجلاً لدينا، فستصلك رسالة بخطوات إعادة التعيين خلال دقائق.'
                : 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sent && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-left"
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    'إرسال رابط الاسترجاع'
                  )}
                </Button>
              </form>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="w-full mt-4 text-primary hover:text-primary/80"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة إلى تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
