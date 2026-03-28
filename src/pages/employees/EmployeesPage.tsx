import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Users, UserCheck, UserX, Calendar, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { verifyPermissionOnServer } from '@/lib/api/secureOperations';
import EmployeeFormDialog from '@/components/employees/EmployeeFormDialog';
import { ExportWithTemplateButton } from '@/components/export/ExportWithTemplateButton';
import { DataCard } from '@/components/mobile/DataCard';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { EmptyState } from '@/components/shared/EmptyState';
import { MobileListSkeleton, MobileStatSkeleton } from '@/components/mobile/MobileListSkeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { VirtualizedTable, VirtualColumn } from '@/components/table/VirtualizedTable';
import { VirtualizedMobileList } from '@/components/table/VirtualizedMobileList';

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  job_title: string | null;
  department: string | null;
  employment_status: string | null;
  hire_date: string | null;
  base_salary: number | null;
  created_at: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  on_leave: { label: 'في إجازة', variant: 'secondary' },
  terminated: { label: 'منتهي', variant: 'destructive' },
};

const VIRTUALIZATION_THRESHOLD = 50;

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParamsState, setSearchParamsState] = useSearchParams();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  // Handle action parameter from URL (FAB/QuickActions)
  useEffect(() => {
    const action = searchParamsState.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParamsState({}, { replace: true });
    }
  }, [searchParamsState, setSearchParamsState]);

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Employee[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'تم حذف الموظف بنجاح' });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'خطأ في حذف الموظف', variant: 'destructive' });
    },
  });

  // Get unique departments
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !search || 
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_number.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || emp.employment_status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.employment_status === 'active').length;
  const onLeaveEmployees = employees.filter(e => e.employment_status === 'on_leave').length;
  const thisMonthHires = employees.filter(e => {
    if (!e.hire_date) return false;
    const hireDate = new Date(e.hire_date);
    const now = new Date();
    return hireDate.getMonth() === now.getMonth() && hireDate.getFullYear() === now.getFullYear();
  }).length;

  const handleEdit = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setEmployeeToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (employeeToDelete) {
      deleteMutation.mutate(employeeToDelete);
    }
  }, [employeeToDelete, deleteMutation]);

  const handleAdd = useCallback(() => {
    setSelectedEmployee(null);
    setDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const statItems = useMemo(() => [
    { label: 'الإجمالي', value: totalEmployees, icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'النشطين', value: activeEmployees, icon: UserCheck, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'في إجازة', value: onLeaveEmployees, icon: UserX, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'هذا الشهر', value: thisMonthHires, icon: Calendar, color: 'text-info', bgColor: 'bg-info/10' },
  ], [totalEmployees, activeEmployees, onLeaveEmployees, thisMonthHires]);

  const exportColumns = useMemo(() => [
    { key: 'employee_number', label: 'رقم الموظف' },
    { key: 'full_name', label: 'الاسم الكامل' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'job_title', label: 'المسمى الوظيفي' },
    { key: 'department', label: 'القسم' },
    { key: 'employment_status', label: 'الحالة' },
    { key: 'hire_date', label: 'تاريخ التعيين' },
    { key: 'base_salary', label: 'الراتب الأساسي' },
  ], []);

  const shouldVirtualize = filteredEmployees.length > VIRTUALIZATION_THRESHOLD;

  // Memoized mobile item renderer
  const renderMobileEmployeeItem = useCallback((employee: Employee) => (
    <DataCard
      title={employee.full_name}
      subtitle={employee.job_title || employee.department || 'بدون منصب'}
      badge={{
        text: statusLabels[employee.employment_status || 'active']?.label || employee.employment_status || 'نشط',
        variant: statusLabels[employee.employment_status || 'active']?.variant || 'secondary',
      }}
      avatar={employee.image_url || undefined}
      avatarFallback={employee.full_name.charAt(0)}
      fields={[
        { label: 'رقم الموظف', value: employee.employee_number },
        { label: 'القسم', value: employee.department || '-', icon: <Briefcase className="h-4 w-4" /> },
      ]}
      onClick={() => navigate(`/employees/${employee.id}`)}
      onView={() => navigate(`/employees/${employee.id}`)}
      onEdit={() => handleEdit(employee)}
      onDelete={() => handleDelete(employee.id)}
    />
  ), [navigate, handleEdit, handleDelete]);

  // Mobile View
  const renderMobileView = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <MobileStatSkeleton count={4} />
          <MobileListSkeleton count={5} variant="employee" />
        </div>
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          {/* Mobile Stats */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Card key={i} className="min-w-[140px] shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الرقم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Employees List */}
          {filteredEmployees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="لا يوجد موظفين"
              description="ابدأ بإضافة موظف جديد"
              action={{
                label: "إضافة موظف",
                onClick: handleAdd,
                icon: Plus,
              }}
            />
          ) : shouldVirtualize ? (
            <VirtualizedMobileList
              data={filteredEmployees}
              renderItem={renderMobileEmployeeItem}
              getItemKey={(emp) => emp.id}
              itemHeight={140}
            />
          ) : (
            <div className="space-y-3">
              {filteredEmployees.map((employee) => (
                <div key={employee.id}>{renderMobileEmployeeItem(employee)}</div>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>
    );
  };

  // Desktop View
  const renderTableView = () => {
    if (isLoading) {
      return <TableSkeleton rows={5} columns={6} />;
    }

    if (filteredEmployees.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="لا يوجد موظفين"
          description="ابدأ بإضافة موظف جديد"
          action={{
            label: "إضافة موظف",
            onClick: handleAdd,
            icon: Plus,
          }}
        />
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الموظف</TableHead>
            <TableHead>رقم الموظف</TableHead>
            <TableHead className="hidden md:table-cell">القسم</TableHead>
            <TableHead className="hidden md:table-cell">المسمى الوظيفي</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmployees.map((employee) => (
            <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell onClick={() => navigate(`/employees/${employee.id}`)}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.image_url || undefined} />
                    <AvatarFallback>{employee.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{employee.full_name}</p>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{employee.employee_number}</TableCell>
              <TableCell className="hidden md:table-cell">{employee.department || '-'}</TableCell>
              <TableCell className="hidden md:table-cell">{employee.job_title || '-'}</TableCell>
              <TableCell>
                <Badge variant={statusLabels[employee.employment_status || 'active']?.variant || 'secondary'}>
                  {statusLabels[employee.employment_status || 'active']?.label || employee.employment_status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/employees/${employee.id}`)}>
                      <Eye className="h-4 w-4 ml-2" />
                      عرض التفاصيل
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(employee)}>
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(employee.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الموظفين</h1>
          <p className="text-muted-foreground">إدارة بيانات الموظفين</p>
        </div>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton
              section="employees"
              sectionLabel="الموظفين"
              data={filteredEmployees}
              columns={exportColumns}
            />
          )}
          <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 ml-2" />
            {isMobile ? "جديد" : "إضافة موظف"}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isMobile ? renderMobileView() : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statItems.map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الرقم أو البريد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="on_leave">في إجازة</SelectItem>
                <SelectItem value="terminated">منتهي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {renderTableView()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialogs */}
      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEmployee}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الموظف نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
