import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Percent, Receipt, RotateCcw, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const RoleLimitsPage = () => {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [limits, setLimits] = useState({
    max_discount_percentage: 100,
    max_credit_limit: 999999999,
    max_invoice_amount: 999999999,
    max_daily_transactions: 999999999,
    max_refund_amount: 999999999,
  });

  // Fetch roles
  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['custom-roles-for-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all role limits for summary
  const { data: allLimits = [], isLoading: loadingAllLimits } = useQuery({
    queryKey: ['all-role-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_limits')
        .select('*, custom_roles(name, color)');
      if (error) throw error;
      return data;
    },
  });

  // Fetch specific role limits
  const { data: roleLimits, isLoading: loadingLimits } = useQuery({
    queryKey: ['role-limits', selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return null;
      const { data, error } = await supabase
        .from('role_limits')
        .select('*')
        .eq('role_id', selectedRoleId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedRoleId,
  });

  // Update limits when role changes
  useEffect(() => {
    if (roleLimits) {
      setLimits({
        max_discount_percentage: Number(roleLimits.max_discount_percentage) || 100,
        max_credit_limit: Number(roleLimits.max_credit_limit) || 999999999,
        max_invoice_amount: Number(roleLimits.max_invoice_amount) || 999999999,
        max_daily_transactions: Number(roleLimits.max_daily_transactions) || 999999999,
        max_refund_amount: Number(roleLimits.max_refund_amount) || 999999999,
      });
    } else {
      setLimits({
        max_discount_percentage: 100,
        max_credit_limit: 999999999,
        max_invoice_amount: 999999999,
        max_daily_transactions: 999999999,
        max_refund_amount: 999999999,
      });
    }
  }, [roleLimits]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) throw new Error('يرجى اختيار دور');

      const { data: existing } = await supabase
        .from('role_limits')
        .select('id')
        .eq('role_id', selectedRoleId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('role_limits')
          .update(limits)
          .eq('role_id', selectedRoleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_limits')
          .insert({ role_id: selectedRoleId, ...limits });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('تم حفظ الحدود بنجاح');
      queryClient.invalidateQueries({ queryKey: ['role-limits'] });
      queryClient.invalidateQueries({ queryKey: ['all-role-limits'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    },
  });

  const formatNumber = (num: number) => {
    if (num >= 999999999) return 'غير محدود';
    return num.toLocaleString('ar-EG');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          الحدود المالية للأدوار
        </h1>
        <p className="text-muted-foreground">تحديد الحدود المالية لكل دور في النظام</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>تعديل الحدود</CardTitle>
            <CardDescription>اختر دوراً وعدّل حدوده المالية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>اختر الدور</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر دوراً..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoleId && (
              <>
                {loadingLimits ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Max Discount */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-purple-500" />
                          أقصى نسبة خصم
                        </Label>
                        <Badge variant="secondary">{limits.max_discount_percentage}%</Badge>
                      </div>
                      <Slider
                        value={[limits.max_discount_percentage]}
                        onValueChange={(value) =>
                          setLimits({ ...limits, max_discount_percentage: value[0] })
                        }
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Max Credit Limit */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        أقصى حد ائتماني للعميل
                      </Label>
                      <Input
                        type="number"
                        value={limits.max_credit_limit}
                        onChange={(e) =>
                          setLimits({ ...limits, max_credit_limit: Number(e.target.value) })
                        }
                        placeholder="999999999 = غير محدود"
                      />
                    </div>

                    {/* Max Invoice Amount */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-blue-500" />
                        أقصى قيمة فاتورة
                      </Label>
                      <Input
                        type="number"
                        value={limits.max_invoice_amount}
                        onChange={(e) =>
                          setLimits({ ...limits, max_invoice_amount: Number(e.target.value) })
                        }
                        placeholder="999999999 = غير محدود"
                      />
                    </div>

                    {/* Max Daily Transactions */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-orange-500" />
                        أقصى عدد عمليات يومية
                      </Label>
                      <Input
                        type="number"
                        value={limits.max_daily_transactions}
                        onChange={(e) =>
                          setLimits({ ...limits, max_daily_transactions: Number(e.target.value) })
                        }
                        placeholder="999999999 = غير محدود"
                      />
                    </div>

                    {/* Max Refund Amount */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-red-500" />
                        أقصى قيمة مرتجعات
                      </Label>
                      <Input
                        type="number"
                        value={limits.max_refund_amount}
                        onChange={(e) =>
                          setLimits({ ...limits, max_refund_amount: Number(e.target.value) })
                        }
                        placeholder="999999999 = غير محدود"
                      />
                    </div>

                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="w-full"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 ml-2" />
                          حفظ التغييرات
                        </>
                      )}
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>ملخص الحدود</CardTitle>
            <CardDescription>جميع الأدوار وحدودها المالية</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAllLimits ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : allLimits.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                لم يتم تحديد حدود لأي دور بعد
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الدور</TableHead>
                      <TableHead>الخصم</TableHead>
                      <TableHead>الائتمان</TableHead>
                      <TableHead>الفاتورة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allLimits.map((limit: any) => (
                      <TableRow key={limit.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: limit.custom_roles?.color }}
                            />
                            {limit.custom_roles?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {limit.max_discount_percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatNumber(Number(limit.max_credit_limit))}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatNumber(Number(limit.max_invoice_amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleLimitsPage;
