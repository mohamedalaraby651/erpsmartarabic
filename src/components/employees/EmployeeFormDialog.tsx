import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/shared/ImageUpload';
import { User, Briefcase, Wallet, AlertCircle } from 'lucide-react';

const employeeSchema = z.object({
  employee_number: z.string().min(1, 'رقم الموظف مطلوب'),
  full_name: z.string().min(1, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  address: z.string().optional(),
  national_id: z.string().optional(),
  image_url: z.string().optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  hire_date: z.string().optional(),
  contract_type: z.string().optional(),
  employment_status: z.string().optional(),
  base_salary: z.coerce.number().optional(),
  bank_account: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: any;
}

export default function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!employee;

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_number: '',
      full_name: '',
      email: '',
      phone: '',
      phone2: '',
      address: '',
      national_id: '',
      image_url: '',
      job_title: '',
      department: '',
      hire_date: '',
      contract_type: 'full_time',
      employment_status: 'active',
      base_salary: 0,
      bank_account: '',
      birth_date: '',
      gender: '',
      marital_status: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        employee_number: employee.employee_number || '',
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        phone2: employee.phone2 || '',
        address: employee.address || '',
        national_id: employee.national_id || '',
        image_url: employee.image_url || '',
        job_title: employee.job_title || '',
        department: employee.department || '',
        hire_date: employee.hire_date || '',
        contract_type: employee.contract_type || 'full_time',
        employment_status: employee.employment_status || 'active',
        base_salary: employee.base_salary || 0,
        bank_account: employee.bank_account || '',
        birth_date: employee.birth_date || '',
        gender: employee.gender || '',
        marital_status: employee.marital_status || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        notes: employee.notes || '',
      });
    } else {
      // Generate new employee number
      const newNumber = `EMP-${Date.now().toString().slice(-6)}`;
      form.reset({
        employee_number: newNumber,
        full_name: '',
        email: '',
        phone: '',
        phone2: '',
        address: '',
        national_id: '',
        image_url: '',
        job_title: '',
        department: '',
        hire_date: new Date().toISOString().split('T')[0],
        contract_type: 'full_time',
        employment_status: 'active',
        base_salary: 0,
        bank_account: '',
        birth_date: '',
        gender: '',
        marital_status: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: '',
      });
    }
  }, [employee, form, open]);

  const mutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (isEditing) {
        const updateData = {
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          phone2: data.phone2 || null,
          address: data.address || null,
          national_id: data.national_id || null,
          image_url: data.image_url || null,
          job_title: data.job_title || null,
          department: data.department || null,
          hire_date: data.hire_date || null,
          contract_type: data.contract_type || null,
          employment_status: data.employment_status || null,
          base_salary: data.base_salary || null,
          bank_account: data.bank_account || null,
          birth_date: data.birth_date || null,
          gender: data.gender || null,
          marital_status: data.marital_status || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          notes: data.notes || null,
        };
        
        const { error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', employee.id);
        if (error) throw error;
      } else {
        const insertData = {
          employee_number: data.employee_number,
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          phone2: data.phone2 || null,
          address: data.address || null,
          national_id: data.national_id || null,
          image_url: data.image_url || null,
          job_title: data.job_title || null,
          department: data.department || null,
          hire_date: data.hire_date || null,
          contract_type: data.contract_type || null,
          employment_status: data.employment_status || null,
          base_salary: data.base_salary || null,
          bank_account: data.bank_account || null,
          birth_date: data.birth_date || null,
          gender: data.gender || null,
          marital_status: data.marital_status || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          notes: data.notes || null,
          created_by: user?.id || null,
        };
        
        const { error } = await supabase.from('employees').insert([insertData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employee?.id] });
      toast({
        title: isEditing ? 'تم تحديث الموظف' : 'تم إضافة الموظف',
      });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      logErrorSafely('EmployeeFormDialog', error);
      toast({
        title: 'حدث خطأ',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل موظف' : 'إضافة موظف جديد'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Image Upload */}
            <div className="flex justify-center">
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <ImageUpload
                    currentImageUrl={field.value}
                    onImageUploaded={(url) => field.onChange(url)}
                    onImageRemoved={() => field.onChange('')}
                    bucket="employee-images"
                    folder={employee?.id || 'new'}
                    size="xl"
                    fallback={form.watch('full_name') || '?'}
                  />
                )}
              />
            </div>

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="personal" className="flex-1 gap-2">
                  <User className="h-4 w-4" />
                  شخصية
                </TabsTrigger>
                <TabsTrigger value="job" className="flex-1 gap-2">
                  <Briefcase className="h-4 w-4" />
                  وظيفية
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex-1 gap-2">
                  <Wallet className="h-4 w-4" />
                  مالية
                </TabsTrigger>
                <TabsTrigger value="emergency" className="flex-1 gap-2">
                  <AlertCircle className="h-4 w-4" />
                  طوارئ
                </TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="أدخل الاسم الكامل" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="national_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرقم القومي</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="أدخل الرقم القومي" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الميلاد</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الجنس</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الجنس" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">ذكر</SelectItem>
                            <SelectItem value="female">أنثى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="marital_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحالة الاجتماعية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">أعزب</SelectItem>
                            <SelectItem value="married">متزوج</SelectItem>
                            <SelectItem value="divorced">مطلق</SelectItem>
                            <SelectItem value="widowed">أرمل</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="example@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الهاتف</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="01xxxxxxxxx" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>هاتف إضافي</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="01xxxxxxxxx" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="أدخل العنوان" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Job Tab */}
              <TabsContent value="job" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employee_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الموظف *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="EMP-XXXXXX" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="job_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المسمى الوظيفي</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: مدير مبيعات" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: المبيعات" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ التعيين</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contract_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع العقد</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر نوع العقد" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full_time">دوام كامل</SelectItem>
                            <SelectItem value="part_time">دوام جزئي</SelectItem>
                            <SelectItem value="contract">عقد مؤقت</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employment_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حالة التوظيف</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">نشط</SelectItem>
                            <SelectItem value="on_leave">في إجازة</SelectItem>
                            <SelectItem value="terminated">منتهي</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="base_salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الراتب الأساسي</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الحساب البنكي</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="أدخل رقم الحساب" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Emergency Tab */}
              <TabsContent value="emergency" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergency_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم جهة الاتصال</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="اسم الشخص للطوارئ" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergency_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>هاتف جهة الاتصال</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="01xxxxxxxxx" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="ملاحظات إضافية..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
