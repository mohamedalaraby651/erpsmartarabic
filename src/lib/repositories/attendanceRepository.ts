/**
 * Attendance Repository — attendance_records + leave_requests + employee picker.
 * Centralizes HR-related table access so pages stay declarative.
 */

import { supabase } from "@/integrations/supabase/client";
import { getCurrentTenantId } from "@/lib/tenantContext";
import { mapRepoError } from "./_base";

export interface EmployeePickerRow {
  id: string;
  full_name: string;
  employee_number: string;
  department?: string | null;
  job_title?: string | null;
}

export interface AttendanceRecordRow {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  attendance_type: string;
  employees?: { full_name: string; employee_number: string; department?: string | null } | null;
}

export interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  employees?: { full_name: string; employee_number: string } | null;
}

export interface LeaveRequestInput {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export const attendanceRepository = {
  async listActiveEmployees(): Promise<EmployeePickerRow[]> {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, employee_number, department, job_title")
      .eq("employment_status", "active")
      .order("full_name");
    if (error) throw mapRepoError(error, "تعذّر تحميل الموظفين.");
    return (data ?? []) as EmployeePickerRow[];
  },

  async listRecords(
    monthStart: Date,
    monthEnd: Date,
    employeeId?: string,
  ): Promise<AttendanceRecordRow[]> {
    let query = supabase
      .from("attendance_records")
      .select("*, employees(full_name, employee_number, department)")
      .gte("check_in", monthStart.toISOString())
      .lte("check_in", monthEnd.toISOString())
      .order("check_in", { ascending: false });
    if (employeeId && employeeId !== "all") query = query.eq("employee_id", employeeId);
    const { data, error } = await query;
    if (error) throw mapRepoError(error, "تعذّر تحميل سجلات الحضور.");
    return (data ?? []) as unknown as AttendanceRecordRow[];
  },

  async listActiveSessions(): Promise<AttendanceRecordRow[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*, employees(full_name, employee_number)")
      .gte("check_in", today.toISOString())
      .is("check_out", null);
    if (error) throw mapRepoError(error, "تعذّر تحميل الجلسات النشطة.");
    return (data ?? []) as unknown as AttendanceRecordRow[];
  },

  async listLeaveRequests(monthStart: Date, monthEnd: Date): Promise<LeaveRequestRow[]> {
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*, employees(full_name, employee_number)")
      .gte("start_date", toDateStr(monthStart))
      .lte("start_date", toDateStr(monthEnd))
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل طلبات الإجازات.");
    return (data ?? []) as unknown as LeaveRequestRow[];
  },

  async checkIn(employeeId: string, createdBy?: string | null): Promise<void> {
    const tenant_id = await getCurrentTenantId();
    const { error } = await supabase.from("attendance_records").insert({
      employee_id: employeeId,
      check_in: new Date().toISOString(),
      tenant_id,
      created_by: createdBy ?? null,
    });
    if (error) throw mapRepoError(error, "تعذّر تسجيل الحضور.");
  },

  async checkOut(recordId: string): Promise<void> {
    const { error } = await supabase
      .from("attendance_records")
      .update({ check_out: new Date().toISOString() })
      .eq("id", recordId);
    if (error) throw mapRepoError(error, "تعذّر تسجيل الانصراف.");
  },

  async createLeaveRequest(input: LeaveRequestInput): Promise<void> {
    const tenant_id = await getCurrentTenantId();
    const { error } = await supabase.from("leave_requests").insert({
      employee_id: input.employee_id,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason ?? null,
      tenant_id,
    });
    if (error) throw mapRepoError(error, "تعذّر تقديم طلب الإجازة.");
  },
};
