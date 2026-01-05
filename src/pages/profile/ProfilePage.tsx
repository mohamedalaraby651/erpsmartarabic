import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import { useTheme } from 'next-themes';
import ImageUpload from '@/components/shared/ImageUpload';
import {
  User,
  Shield,
  Bell,
  Palette,
  Save,
  Eye,
  Clock,
  Monitor,
  Moon,
  Sun,
  FileText,
  Package,
  Receipt,
  Users,
  Paperclip,
} from 'lucide-react';
import { AttachmentUploadForm } from '@/components/shared/AttachmentUploadForm';
import { AttachmentsList } from '@/components/shared/AttachmentsList';

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch notification settings
  const { data: notificationSettings } = useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data || {
        email_notifications: true,
        system_notifications: true,
        low_stock_alerts: true,
        overdue_invoice_alerts: true,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch login history
  const { data: loginHistory = [] } = useQuery({
    queryKey: ['login-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('login_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      const [invoicesResult, customersResult, quotationsResult, ordersResult] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact' }).eq('created_by', user!.id),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('quotations').select('id', { count: 'exact' }).eq('created_by', user!.id),
        supabase.from('sales_orders').select('id', { count: 'exact' }).eq('created_by', user!.id),
      ]);
      return {
        invoices: invoicesResult.count || 0,
        customers: customersResult.count || 0,
        quotations: quotationsResult.count || 0,
        orders: ordersResult.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    phone2: '',
    job_title: '',
    department: '',
    address: '',
    avatar_url: '',
  });

  // Update form when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        phone2: profile.phone2 || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
        address: profile.address || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          phone2: data.phone2 || null,
          job_title: data.job_title || null,
          department: data.department || null,
          address: data.address || null,
          avatar_url: data.avatar_url || null,
        })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({ title: 'تم حفظ البيانات بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حفظ البيانات', variant: 'destructive' });
    },
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user!.id,
          ...settings,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', user?.id] });
      toast({ title: 'تم حفظ إعدادات الإشعارات' });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم تغيير كلمة المرور بنجاح' });
    },
    onError: (error: any) => {
      logErrorSafely('ProfilePage.changePasswordMutation', error);
      toast({ title: 'خطأ في تغيير كلمة المرور', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(formData);
  };

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'كلمة المرور غير متطابقة', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }
    changePasswordMutation.mutate({ newPassword: passwordData.newPassword });
    setPasswordData({ newPassword: '', confirmPassword: '' });
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground">إدارة بياناتك الشخصية وإعدادات حسابك</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ImageUpload
              currentImageUrl={formData.avatar_url || profile?.avatar_url}
              onImageUploaded={(url) => setFormData({ ...formData, avatar_url: url })}
              onImageRemoved={() => setFormData({ ...formData, avatar_url: '' })}
              bucket="avatars"
              folder={user?.id}
              size="xl"
              fallback={profile?.full_name || user?.email || '?'}
            />
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl font-bold">{profile?.full_name || 'المستخدم'}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                {userRole && (
                  <Badge variant="secondary">{roleLabels[userRole] || userRole}</Badge>
                )}
                {profile?.last_login_at && (
                  <span className="text-sm text-muted-foreground">
                    آخر دخول: {new Date(profile.last_login_at).toLocaleDateString('ar-EG')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الفواتير</p>
                <p className="text-2xl font-bold">{stats?.invoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عروض الأسعار</p>
                <p className="text-2xl font-bold">{stats?.quotations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Package className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أوامر البيع</p>
                <p className="text-2xl font-bold">{stats?.orders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تسجيلات الدخول</p>
                <p className="text-2xl font-bold">{profile?.login_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            البيانات الشخصية
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            الأمان
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <Paperclip className="h-4 w-4" />
            مستنداتي
          </TabsTrigger>
        </TabsList>

        {/* Personal Data Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>البيانات الشخصية</CardTitle>
              <CardDescription>تحديث معلوماتك الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={user?.email || ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>المسمى الوظيفي</Label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="مثال: مدير مبيعات"
                  />
                </div>
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="مثال: المبيعات"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الهاتف</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>هاتف إضافي</Label>
                  <Input
                    value={formData.phone2}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="أدخل عنوانك"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                  <Save className="h-4 w-4 ml-2" />
                  {updateProfileMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة المرور</CardTitle>
              <CardDescription>تحديث كلمة المرور الخاصة بك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل تسجيلات الدخول</CardTitle>
              <CardDescription>آخر 10 عمليات تسجيل دخول</CardDescription>
            </CardHeader>
            <CardContent>
              {loginHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا يوجد سجل</p>
              ) : (
                <div className="space-y-3">
                  {loginHistory.map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(login.login_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">{login.device_type || 'غير معروف'}</p>
                        </div>
                      </div>
                      {login.ip_address && (
                        <Badge variant="outline">{login.ip_address}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الإشعارات</CardTitle>
              <CardDescription>تحكم في الإشعارات التي تتلقاها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">إشعارات النظام الداخلية</p>
                    <p className="text-sm text-muted-foreground">عرض الإشعارات داخل التطبيق</p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings?.system_notifications ?? true}
                  onCheckedChange={(checked) =>
                    updateNotificationsMutation.mutate({ system_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">تنبيهات المخزون المنخفض</p>
                    <p className="text-sm text-muted-foreground">إشعار عند انخفاض مخزون منتج</p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings?.low_stock_alerts ?? true}
                  onCheckedChange={(checked) =>
                    updateNotificationsMutation.mutate({ low_stock_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">تنبيهات الفواتير المتأخرة</p>
                    <p className="text-sm text-muted-foreground">إشعار بالفواتير التي تجاوزت تاريخ الاستحقاق</p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings?.overdue_invoice_alerts ?? true}
                  onCheckedChange={(checked) =>
                    updateNotificationsMutation.mutate({ overdue_invoice_alerts: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>المظهر</CardTitle>
              <CardDescription>تخصيص مظهر التطبيق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base">الوضع</Label>
                <p className="text-sm text-muted-foreground mb-4">اختر الوضع المفضل لديك</p>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-6 w-6" />
                    <span>نهاري</span>
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-6 w-6" />
                    <span>ليلي</span>
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="h-6 w-6" />
                    <span>تلقائي</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>مستنداتي</CardTitle>
              <CardDescription>إدارة المستندات والملفات الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {user?.id && (
                <>
                  <AttachmentUploadForm
                    entityType="profile"
                    entityId={user.id}
                    onUploadComplete={() => {}}
                  />
                  <AttachmentsList
                    entityType="profile"
                    entityId={user.id}
                    showSearch={true}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
