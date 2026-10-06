import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { emitTelemetry } from "@/lib/runtimeTelemetry";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/mutationFeedback";

/**
 * App-wide QueryClient factory (ported verbatim from the Classic App.tsx).
 *
 * Production SLO — React Query retry policy (DO NOT REGRESS)
 * • Queries: max 2 retries, exponential backoff (1s → 2s → 4s, cap 8s).
 * • Skip retry for permission/auth errors (401/403/42501/PGRST301).
 * • Mutations: never retried — non-idempotent by default.
 * Changing these caps requires a security review; see docs/engineering-standards.md.
 */
export function createAppQueryClient(): QueryClient {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      const msg = (error as Error)?.message || String(error);
      const status = (error as { status?: number })?.status;
      const code = (error as { code?: string })?.code;
      if (status === 401 || status === 403 || code === "42501" || code === "PGRST301") return;
      emitTelemetry("query_error", msg, {
        errorName: (error as Error)?.name,
        metadata: {
          queryKey: Array.isArray(query.queryKey) ? query.queryKey.slice(0, 3) : String(query.queryKey),
          status,
          code,
        },
      });
    },
  });

  const mutationCache = new MutationCache({
    // OPA-UX-001: every write action reports success or failure to the user.
    onSuccess: (_data, _vars, _ctx, mutation) => {
      notifyMutationSuccess(mutation);
    },
    onError: (error, _vars, _ctx, mutation) => {
      const msg = (error as Error)?.message || String(error);
      const status = (error as { status?: number })?.status;
      notifyMutationError(error, mutation);
      if (status === 401 || status === 403) return;
      emitTelemetry("mutation_error", msg, {
        errorName: (error as Error)?.name,
        metadata: {
          mutationKey: mutation.options.mutationKey ?? null,
          status,
        },
      });
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: unknown) => {
          const code = (error as { code?: string; status?: number })?.code;
          const status = (error as { status?: number })?.status;
          if (code === "42501" || code === "PGRST301" || status === 401 || status === 403) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}
