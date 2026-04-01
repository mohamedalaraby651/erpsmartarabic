import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Shield, Layers, ArrowRight } from 'lucide-react';

export default function PlatformAuth() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const { isPlatformAdmin, isLoading: platformLoading } = usePlatformAdmin();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && !platformLoading && isPlatformAdmin) {
      navigate('/platform');
    }
  }, [user, isPlatformAdmin, platformLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error('فشل تسجيل الدخول. يرجى التحقق من البيانات');
    }
    // isPlatformAdmin check will happen via useEffect
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 mb-4 shadow-lg shadow-primary/25">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">
            إدارة المنصة
          </h1>
          <p className="text-muted-foreground mt-2">لوحة تحكم مسؤولي المنصة</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات حساب مسؤول المنصة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-email">البريد الإلكتروني</Label>
                <Input
                  id="platform-email"
                  type="email"
                  placeholder="admin@platform.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform-password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="platform-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <Shield className="ml-2 h-4 w-4" />
                    دخول كمسؤول منصة
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-3">
          <div className="flex items-center gap-2 justify-center text-sm text-warning bg-warning/10 rounded-lg p-3">
            <Shield className="h-4 w-4" />
            <span>هذه المنطقة مخصصة لمسؤولي المنصة فقط</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            الدخول كمستخدم عادي
          </Button>
        </div>
      </div>
    </div>
  );
}
