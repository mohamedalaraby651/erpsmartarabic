import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useServerPagination } from '@/hooks/useServerPagination';
import { useDebounce } from '@/hooks/useDebounce';
import { verifyPermissionOnServer } from '@/lib/api/secureOperations';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
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

export const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  on_leave: { label: 'في إجازة', variant: 'secondary' },
  terminated: { label: 'منتهي', variant: 'destructive' },
};

const PAGE_SIZE = 25;
const VIRTUALIZATION_THRESHOLD = 50;

export function useEmployeesList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParamsState, setSearchParamsState] = useSearchParams();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  // Handle action parameter from URL
  useEffect(() => {
    const action = searchParamsState.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParamsState({}, { replace: true });
    }
  }, [searchParamsState, setSearchParamsState]);

  // Count query
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['employees-count', debouncedSearch, departmentFilter, statusFilter],
    queryFn: async () => {
      let query = supabase.from('employees').select('*', { count: 'exact', head: true });
      if (debouncedSearch) query = query.or(`full_name.ilike.%${debouncedSearch}%,employee_number.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      if (departmentFilter !== 'all') query = query.eq('department', departmentFilter);
      if (statusFilter !== 'all') query = query.eq('employment_status', statusFilter);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ['employees', debouncedSearch, departmentFilter, statusFilter, pagination.currentPage],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pagination.range.from, pagination.range.to);
      if (debouncedSearch) query = query.or(`full_name.ilike.%${debouncedSearch}%,employee_number.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      if (departmentFilter !== 'all') query = query.eq('department', departmentFilter);
      if (statusFilter !== 'all') query = query.eq('employment_status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as Employee[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const hasPermission = await verifyPermissionOnServer('employees', 'delete');
      if (!hasPermission) throw new Error('UNAUTHORIZED');
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'تم حذف الموظف بنجاح' });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') {
        toast({ title: 'غير مصرح', description: 'ليس لديك صلاحية حذف الموظفين', variant: 'destructive' });
      } else {
        toast({ title: 'خطأ في حذف الموظف', variant: 'destructive' });
      }
    },
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

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

  const shouldVirtualize = filteredEmployees.length > VIRTUALIZATION_THRESHOLD;

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

  return {
    // Data
    employees, filteredEmployees, totalCount, isLoading,
    // Stats
    totalEmployees, activeEmployees, onLeaveEmployees, thisMonthHires,
    // Filters
    search, setSearch, departmentFilter, setDepartmentFilter,
    statusFilter, setStatusFilter, departments,
    // Pagination
    pagination, PAGE_SIZE,
    // Dialog state
    dialogOpen, setDialogOpen, selectedEmployee,
    deleteDialogOpen, setDeleteDialogOpen,
    // Actions
    handleEdit, handleDelete, confirmDelete, handleAdd, handleRefresh,
    // Misc
    shouldVirtualize, exportColumns,
  };
}
