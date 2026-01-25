import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ImageUpload from '@/components/shared/ImageUpload';
import { Save, Receipt, FileText, Package, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

interface PersonalInfoSectionProps {
  userId: string;
  profile: any;
  userEmail: string;
  userRole: string | null;
  onDataChange?: () => void;
}

export function PersonalInfoSection({
  userId,
  profile,
  userEmail,
  userRole,
  onDataChange,
}: PersonalInfoSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    phone2: '',
    job_title: '',
    department: '',
    address: '',
    avatar_url: '',
  });

  // Load profile data
  useEffect(() => {
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
  }, [profile]);

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const [invoicesResult, quotationsResult, ordersResult] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact' }).eq('created_by', userId),
        supabase.from('quotations').select('id', { count: 'exact' }).eq('created_by', userId),
        supabase.from('sales_orders').select('id', { count: 'exact' }).eq('created_by', userId),
      ]);
      return {
        invoices: invoicesResult.count || 0,
        quotations: quotationsResult.count || 0,
        orders: ordersResult.count || 0,
      };
    },
    enabled: !!userId,
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
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast({ title: 'تم حفظ البيانات بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حفظ البيانات', variant: 'destructive' });
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onDataChange?.();
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ImageUpload
              currentImageUrl={formData.avatar_url || profile?.avatar_url}
              onImageUploaded={(url) => handleChange('avatar_url', url)}
              onImageRemoved={() => handleChange('avatar_url', '')}
              bucket="avatars"
              folder={userId}
              size="xl"
              fallback={formData.full_name || profile?.full_name || userEmail || '?'}
            />
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl font-bold">{formData.full_name || profile?.full_name || 'المستخدم'}</h2>
              <p className="text-muted-foreground">{userEmail}</p>
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

      {/* Form Card */}
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
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="أدخل اسمك الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input value={userEmail} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>المسمى الوظيفي</Label>
              <Input
                value={formData.job_title}
                onChange={(e) => handleChange('job_title', e.target.value)}
                placeholder="مثال: مدير مبيعات"
              />
            </div>
            <div className="space-y-2">
              <Label>القسم</Label>
              <Input
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="مثال: المبيعات"
              />
            </div>
            <div className="space-y-2">
              <Label>الهاتف</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="01xxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>هاتف إضافي</Label>
              <Input
                value={formData.phone2}
                onChange={(e) => handleChange('phone2', e.target.value)}
                placeholder="01xxxxxxxxx"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>العنوان</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="أدخل عنوانك"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
              <Save className="h-4 w-4 ml-2" />
              {updateProfileMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
