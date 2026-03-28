import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Clock, LogIn, LogOut, Calendar, Users, Timer, Search, FileText } from 'lucide-react';
import LeaveRequestDialog from '@/components/attendance/LeaveRequestDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataCard } from '@/components/mobile/DataCard';

const AttendancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [searchTerm, setSearchTerm] = useState('');
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');

  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-attendance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name, employee_number, department, job_title')
        .eq('employment_status', 'active')
        .order('full_name');
      return data || [];
    },
  });

  // Fetch attendance records for the month
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ['attendance', selectedMonth, selectedEmployeeFilter],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*, employees(full_name, employee_number, department)')
        .gte('check_in', monthStart.toISOString())
        .lte('check_in', monthEnd.toISOString())
        .order('check_in', { ascending: false });

      if (selectedEmployeeFilter !== 'all') {
        query = query.eq('employee_id', selectedEmployeeFilter);
      }
      const { data } = await query;
      return data || [];
    },
  });

  // Fetch today's active sessions (no check_out)
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('attendance_records')
        .select('*, employees(full_name, employee_number)')
        .gte('check_in', today + 'T00:00:00')
        .is('check_out', null);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch leave requests
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests', selectedMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*, employees(full_name, employee_number)')
        .gte('start_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data: tenantData } = await supabase.rpc('get_current_tenant');
      const { error } = await supabase.from('attendance_records').insert({
        employee_id: employeeId,
        check_in: new Date().toISOString(),
        tenant_id: tenantData,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم تسجيل الحضور بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: () => toast({ title: 'خطأ في تسجيل الحضور', variant: 'destructive' }),
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from('attendance_records')
        .update({ check_out: new Date().toISOString() })
        .eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم تسجيل الانصراف بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: () => toast({ title: 'خطأ في تسجيل الانصراف', variant: 'destructive' }),
  });

  const formatDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'قيد العمل';
    const mins = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}س ${remainingMins}د`;
  };

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    const totalHours = attendanceRecords.reduce((sum, r) => {
      if (!r.check_out) return sum;
      return sum + differenceInMinutes(parseISO(r.check_out), parseISO(r.check_in)) / 60;
    }, 0);
    const uniqueEmployees = new Set(attendanceRecords.map(r => r.employee_id)).size;
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
    return { totalRecords: attendanceRecords.length, totalHours: Math.round(totalHours), uniqueEmployees, pendingLeaves };
  }, [attendanceRecords, leaveRequests]);

  const activeEmployeeIds = new Set(activeSessions.map(s => s.employee_id));

  const filteredRecords = attendanceRecords.filter(r => {
    if (!searchTerm) return true;
    const emp = r.employees as { full_name: string; employee_number: string } | null;
    return emp?.full_name?.includes(searchTerm) || emp?.employee_number?.includes(searchTerm);
  });

  const leaveTypeLabels: Record<string, string> = {
    annual: 'سنوية', sick: 'مرضية', unpaid: 'بدون راتب',
    emergency: 'طارئة', maternity: 'أمومة', other: 'أخرى',
  };

  const leaveStatusColors: Record<string, string> = {
    pending: 'warning', approved: 'default', rejected: 'destructive',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحضور والانصراف</h1>
          <p className="text-muted-foreground">إدارة حضور وانصراف الموظفين وطلبات الإجازات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLeaveDialogOpen(true)}>
            <Calendar className="h-4 w-4 ml-2" />
            طلب إجازة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">الحاضرون الآن</p>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><Users className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">سجلات الشهر</p>
                <p className="text-2xl font-bold">{monthlyStats.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Timer className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">ساعات العمل</p>
                <p className="text-2xl font-bold">{monthlyStats.totalHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><FileText className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">إجازات معلقة</p>
                <p className="text-2xl font-bold">{monthlyStats.pendingLeaves}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checkin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checkin">تسجيل الحضور</TabsTrigger>
          <TabsTrigger value="records">السجلات</TabsTrigger>
          <TabsTrigger value="leaves">الإجازات</TabsTrigger>
        </TabsList>

        {/* Quick Check-in/out */}
        <TabsContent value="checkin" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>تسجيل سريع</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map(emp => {
                  const isActive = activeEmployeeIds.has(emp.id);
                  const activeSession = activeSessions.find(s => s.employee_id === emp.id);
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.department || emp.job_title || emp.employee_number}</p>
                      </div>
                      {isActive ? (
                        <Button size="sm" variant="destructive" onClick={() => checkOutMutation.mutate(activeSession!.id)}
                          disabled={checkOutMutation.isPending}>
                          <LogOut className="h-3 w-3 ml-1" /> انصراف
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => checkInMutation.mutate(emp.id)}
                          disabled={checkInMutation.isPending}>
                          <LogIn className="h-3 w-3 ml-1" /> حضور
                        </Button>
                      )}
                    </div>
                  );
                })}
                {employees.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState icon={Users} title="لا يوجد موظفين" description="أضف موظفين أولاً من صفحة الموظفين" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Records */}
        <TabsContent value="records" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-auto" />
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-9" />
            </div>
            <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="كل الموظفين" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isMobile ? (
            <div className="space-y-3">
              {filteredRecords.map(record => {
                const emp = record.employees as { full_name: string; employee_number: string } | null;
                return (
                  <DataCard key={record.id} title={emp?.full_name || ''} subtitle={format(parseISO(record.check_in), 'yyyy/MM/dd')}
                    badge={{ text: record.check_out ? formatDuration(record.check_in, record.check_out) : 'قيد العمل', variant: record.check_out ? 'default' : 'secondary' }}
                    fields={[
                      { label: 'حضور', value: format(parseISO(record.check_in), 'hh:mm a', { locale: ar }) },
                      { label: 'انصراف', value: record.check_out ? format(parseISO(record.check_out), 'hh:mm a', { locale: ar }) : '—' },
                    ]} />
                );
              })}
              {filteredRecords.length === 0 && <EmptyState icon={Clock} title="لا توجد سجلات" description="لم يتم تسجيل حضور في هذا الشهر" />}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحضور</TableHead>
                      <TableHead>الانصراف</TableHead>
                      <TableHead>المدة</TableHead>
                      <TableHead>النوع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(record => {
                      const emp = record.employees as { full_name: string; employee_number: string; department?: string } | null;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{emp?.full_name}</TableCell>
                          <TableCell>{format(parseISO(record.check_in), 'yyyy/MM/dd')}</TableCell>
                          <TableCell>{format(parseISO(record.check_in), 'hh:mm a', { locale: ar })}</TableCell>
                          <TableCell>{record.check_out ? format(parseISO(record.check_out), 'hh:mm a', { locale: ar }) : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={record.check_out ? 'default' : 'secondary'}>
                              {formatDuration(record.check_in, record.check_out)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {{ regular: 'عادي', overtime: 'إضافي', remote: 'عن بعد', field: 'ميداني' }[record.attendance_type] || record.attendance_type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredRecords.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leave Requests */}
        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>من</TableHead>
                    <TableHead>إلى</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map(leave => {
                    const emp = leave.employees as { full_name: string } | null;
                    return (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{emp?.full_name}</TableCell>
                        <TableCell>{leaveTypeLabels[leave.leave_type] || leave.leave_type}</TableCell>
                        <TableCell>{leave.start_date}</TableCell>
                        <TableCell>{leave.end_date}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{leave.reason || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={leaveStatusColors[leave.status] as 'default' | 'destructive' | 'secondary'}>
                            {{ pending: 'معلق', approved: 'موافق', rejected: 'مرفوض' }[leave.status] || leave.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {leaveRequests.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد طلبات إجازة</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeaveRequestDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['leave-requests'] })} />
    </div>
  );
};

export default AttendancePage;
