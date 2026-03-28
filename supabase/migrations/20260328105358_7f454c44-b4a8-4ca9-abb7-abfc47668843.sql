
-- Attendance Records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  attendance_type TEXT NOT NULL DEFAULT 'regular' CHECK (attendance_type IN ('regular', 'overtime', 'remote', 'field')),
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave Requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual' CHECK (leave_type IN ('annual', 'sick', 'unpaid', 'emergency', 'maternity', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for attendance" ON public.attendance_records
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT get_current_tenant()));

CREATE POLICY "Tenant isolation for leave_requests" ON public.leave_requests
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT get_current_tenant()));

-- Indexes
CREATE INDEX idx_attendance_employee ON public.attendance_records(employee_id);
CREATE INDEX idx_attendance_checkin ON public.attendance_records(check_in);
CREATE INDEX idx_attendance_tenant ON public.attendance_records(tenant_id);
CREATE INDEX idx_leave_employee ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_tenant ON public.leave_requests(tenant_id);
