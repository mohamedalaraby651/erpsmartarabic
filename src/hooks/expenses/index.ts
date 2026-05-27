/**
 * Expense hooks — wrap `expenseRepository` with cache invalidation.
 * Approve/reject still go through the `approve-expense` Edge Function in
 * `lib/api/secureOperations` — only repo-level CRUD is mediated here.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  expenseRepository,
  type ExpenseFilters,
  type ExpenseInput,
} from "@/lib/repositories/expenseRepository";
import { queryPresets } from "@/lib/queryConfig";

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => expenseRepository.list(filters),
    ...queryPresets.operational,
  });
}

export function useExpenseStats() {
  return useQuery({
    queryKey: ["expenses-stats"],
    queryFn: () => expenseRepository.stats(),
    ...queryPresets.operational,
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseRepository.listCategories(),
    ...queryPresets.reference,
  });
}

export function useActiveCashRegisters() {
  return useQuery({
    queryKey: ["cash-registers", "active-select"],
    queryFn: () => expenseRepository.listActiveCashRegisters(),
    ...queryPresets.reference,
  });
}

function invalidateExpenseCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["expenses-stats"] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => expenseRepository.create(input),
    onSuccess: () => invalidateExpenseCaches(qc),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) =>
      expenseRepository.update(id, input),
    onSuccess: () => invalidateExpenseCaches(qc),
  });
}
