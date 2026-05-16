import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { logErrorSafely } from '@/lib/errorHandler';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase يرسل المستخدم مع hash يحتوي على access_token + type=recovery
    // SDK يعالج الجلسة تلقائياً عبر onAuthStateChange
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    // إن كانت الجلسة موجودة فعلاً (المستخدم وصل من الرابط)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      logErrorSafely('ResetPassword.submit', error);
      toast.error('تعذّر تحديث كلمة المرور. الرابط قد يكون منتهي الصلاحية.');
      return;
    }
    toast.success('تم تحديث كلمة المرور بنجاح');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-0 shadow-xl glass">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3 mx-auto">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">تعيين كلمة مرور جديدة</CardTitle>
            <CardDescription>
              {ready
                ? 'اختر كلمة مرور قوية مكوّنة من 8 أحرف على الأقل.'
                : 'جاري التحقق من الرابط...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-left pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="text-left"
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري التحديث...
                    </>
                  ) : (
                    'تحديث كلمة المرور'
                  )}
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
