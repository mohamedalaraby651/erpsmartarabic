import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  Edit,
  User,
  Briefcase,
  Wallet,
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  Heart,
  AlertCircle,
  Paperclip,
} from 'lucide-react';
import EmployeeFormDialog from '@/components/employees/EmployeeFormDialog';
import { FileUpload } from '@/components/shared/FileUpload';
import { AttachmentsList } from '@/components/shared/AttachmentsList';
import { DetailPageSkeleton } from '@/components/shared/DetailPageSkeleton';

interface Employee {
  id: string;
  user_id: string | null;
  employee_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  national_id: string | null;
  image_url: string | null;
  job_title: string | null;
  department: string | null;
  hire_date: string | null;
  contract_type: string | null;
  employment_status: string | null;
  base_salary: number | null;
  bank_account: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: 'نشط', variant: 'default' },
  on_leave: { label: 'في إجازة', variant: 'secondary' },
  terminated: { label: 'منتهي', variant: 'destructive' },
};

const contractLabels: Record<string, string> = {
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  contract: 'عقد مؤقت',
};

const genderLabels: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
};

const maritalLabels: Record<string, string> = {
  single: 'أعزب',
  married: 'متزوج',
  divorced: 'مطلق',
  widowed: 'أرمل',
};

export default function EmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Employee;
    },
    enabled: !!id,
  });

  // Fetch activity logs for this employee
  const { data: activities = [] } = useQuery({
    queryKey: ['employee-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'employee')
        .eq('entity_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <DetailPageSkeleton variant="default" tabCount={4} />;
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">الموظف غير موجود</p>
        <Button variant="link" onClick={() => navigate('/employees')}>
          العودة للموظفين
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/employees')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">ملف الموظف</h1>
          <p className="text-muted-foreground">{employee.employee_number}</p>
        </div>
        <Button onClick={() => setEditDialogOpen(true)}>
          <Edit className="h-4 w-4 ml-2" />
          تعديل
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-32 w-32">
              <AvatarImage src={employee.image_url || undefined} />
              <AvatarFallback className="text-4xl">{employee.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{employee.full_name}</h2>
                <Badge variant={statusLabels[employee.employment_status || 'active']?.variant || 'secondary'}>
                  {statusLabels[employee.employment_status || 'active']?.label}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                {employee.job_title} • {employee.department}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {employee.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.hire_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>منذ {new Date(employee.hire_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
                {employee.contract_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{contractLabels[employee.contract_type] || employee.contract_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            البيانات الشخصية
          </TabsTrigger>
          <TabsTrigger value="job" className="gap-2">
            <Briefcase className="h-4 w-4" />
            البيانات الوظيفية
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <Wallet className="h-4 w-4" />
            البيانات المالية
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <Paperclip className="h-4 w-4" />
            المستندات
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Clock className="h-4 w-4" />
            النشاط
          </TabsTrigger>
        </TabsList>

        {/* Personal Data Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                البيانات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                    <p className="font-medium">{employee.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الرقم القومي</p>
                    <p className="font-medium">{employee.national_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                    <p className="font-medium">
                      {employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('ar-EG') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الجنس</p>
                    <p className="font-medium">{genderLabels[employee.gender || ''] || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الحالة الاجتماعية</p>
                    <p className="font-medium">{maritalLabels[employee.marital_status || ''] || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">العنوان</p>
                    <p className="font-medium">{employee.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الهاتف الأساسي</p>
                    <p className="font-medium">{employee.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">هاتف إضافي</p>
                    <p className="font-medium">{employee.phone2 || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  جهة اتصال الطوارئ
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-medium">{employee.emergency_contact_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الهاتف</p>
                    <p className="font-medium">{employee.emergency_contact_phone || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Data Tab */}
        <TabsContent value="job" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                البيانات الوظيفية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الموظف</p>
                    <p className="font-medium">{employee.employee_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المسمى الوظيفي</p>
                    <p className="font-medium">{employee.job_title || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">القسم</p>
                    <p className="font-medium">{employee.department || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ التعيين</p>
                    <p className="font-medium">
                      {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ar-EG') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">نوع العقد</p>
                    <p className="font-medium">{contractLabels[employee.contract_type || ''] || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">حالة التوظيف</p>
                    <Badge variant={statusLabels[employee.employment_status || 'active']?.variant || 'secondary'}>
                      {statusLabels[employee.employment_status || 'active']?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Data Tab */}
        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                البيانات المالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
                    <p className="text-2xl font-bold">
                      {employee.base_salary ? `${Number(employee.base_salary).toLocaleString()} ج.م` : '-'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الحساب البنكي</p>
                    <p className="font-medium">{employee.bank_account || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                المستندات والمرفقات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                entityType="employee"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'employee', id] })}
              />
              <AttachmentsList entityType="employee" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                سجل النشاط
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا يوجد نشاط مسجل</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notes */}
      {employee.notes && (
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{employee.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <EmployeeFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employee={employee}
      />
    </div>
  );
}
