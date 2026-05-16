import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Layers, ArrowRight, Shield } from 'lucide-react';
import { logErrorSafely } from '@/lib/errorHandler';
import { lovable } from '@/integrations/lovable';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    
    if (error) {
      logErrorSafely('Auth.handleLogin', error);
      // رسالة موحدة لجميع أخطاء المصادقة - لا تكشف تفاصيل الخطأ
      toast.error('فشل تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى');
    } else {
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail || !signupPassword || !signupName) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }
    
    if (signupPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);
    
    if (error) {
      logErrorSafely('Auth.handleSignup', error);
      // رسالة موحدة لأخطاء التسجيل - لا تكشف تفاصيل الخطأ
      toast.error('فشل إنشاء الحساب. يرجى التحقق من البيانات والمحاولة مرة أخرى');
    } else {
      toast.success('تم إنشاء الحساب بنجاح');
      navigate('/');
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setIsLoading(false);
      logErrorSafely('Auth.handleGoogle', result.error);
      toast.error('تعذّر تسجيل الدخول عبر Google. حاول مرة أخرى.');
    }
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
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 mb-4 shadow-lg shadow-primary/25">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">نظرة</h1>
          <p className="text-muted-foreground mt-2">نظام إدارة الأعمال الذكي</p>
        </div>

        <Card className="border-0 shadow-xl glass">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">الدخول إلى النظام</CardTitle>
            <CardDescription>سجل دخولك أو أنشئ حساباً جديداً</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>
              
              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">البريد الإلكتروني</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="example@domain.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="text-left"
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">كلمة المرور</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
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
                        جاري تسجيل الدخول...
                      </>
                    ) : (
                      'تسجيل الدخول'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">الاسم الكامل</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="أحمد محمد"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="example@domain.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="text-left"
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">كلمة المرور</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="6 أحرف على الأقل"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
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
                        جاري إنشاء الحساب...
                      </>
                    ) : (
                      'إنشاء حساب جديد'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            نظام ERP متكامل لإدارة الأعمال
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/landing')}
              className="text-primary hover:text-primary/80"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للصفحة الرئيسية
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/platform/auth')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Shield className="ml-2 h-4 w-4" />
              دخول المنصة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
