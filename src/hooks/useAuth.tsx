import { useState, useEffect, useCallback, createContext, useContext, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { emitTelemetry } from '@/lib/runtimeTelemetry';

type AppRole = Database['public']['Enums']['app_role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  /** True only during the initial session bootstrap. Always becomes false. */
  loading: boolean;
  userRole: AppRole | null;
  /** Non-null when the initial getSession() failed or timed out. */
  initError: Error | null;
  /** Re-runs the initial session bootstrap. UI uses this for a Retry button. */
  retryInit: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hard cap on how long the initial getSession() can block the loading state.
 * Past this, we assume Supabase is unreachable, surface an error to the UI,
 * and allow the app to render its (signed-out) shell so the user isn't stuck.
 */
const SESSION_INIT_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [initError, setInitError] = useState<Error | null>(null);
  // Bumping this triggers a re-run of the bootstrap effect.
  const [initAttempt, setInitAttempt] = useState(0);
  // Whether we've already shown the offline/init toast in this session — prevents spam.
  const errorToastShownRef = useRef(false);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (import.meta.env.DEV) console.error('Error fetching user role:', error);
        return;
      }

      setUserRole(data?.role ?? null);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching user role:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // 1. Set up auth state listener FIRST (per Supabase guidance — avoids race
    //    where a sign-in event fires before our listener is attached).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (cancelled) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        // Defer role fetching to avoid a Supabase auth-callback deadlock.
        if (nextSession?.user) {
          setTimeout(() => fetchUserRole(nextSession.user.id), 0);
        } else {
          setUserRole(null);
        }

        // A live auth event always means the network is reachable — clear any
        // earlier init error so the UI can dismiss the recovery banner.
        if (initError) setInitError(null);
        // Any auth callback also means we're past the bootstrap blank-slate.
        setLoading(false);
      },
    );

    // 2. THEN check for an existing session — but with a hard timeout AND a
    //    .catch() so a failure (DNS, CORS, 5xx, offline) NEVER leaves us
    //    stranded on the global loading screen.
    const finish = (err: Error | null, nextSession: Session | null) => {
      if (cancelled) return;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

      if (err) {
        setInitError(err);
        emitTelemetry('unhandled_error', `auth_init: ${err.message}`, {
          errorName: err.name,
          errorStack: err.stack,
          metadata: { source: 'AuthProvider.getSession' },
        });
        // Show the toast once per app load — repeated retries shouldn't spam.
        if (!errorToastShownRef.current) {
          errorToastShownRef.current = true;
          toast({
            variant: 'destructive',
            title: 'تعذّر الاتصال بالخادم',
            description: 'لم نتمكن من التحقق من حالة الجلسة. تأكد من الاتصال بالإنترنت ثم أعد المحاولة.',
          });
        }
      } else {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user) fetchUserRole(nextSession.user.id);
      }
      setLoading(false);
    };

    timeoutId = setTimeout(() => {
      finish(new Error(`getSession timed out after ${SESSION_INIT_TIMEOUT_MS}ms`), null);
    }, SESSION_INIT_TIMEOUT_MS);

    supabase.auth.getSession()
      .then(({ data: { session: nextSession }, error }) => {
        if (error) {
          finish(error as Error, null);
          return;
        }
        finish(null, nextSession);
      })
      .catch((err: unknown) => {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        finish(wrapped, null);
      });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
    // We intentionally re-run when initAttempt changes (Retry button).
    // initError is read inside but should NOT trigger a re-run on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAttempt, fetchUserRole]);

  const retryInit = useCallback(() => {
    errorToastShownRef.current = false;
    setInitError(null);
    setLoading(true);
    setInitAttempt((n) => n + 1);
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, userRole, initError, retryInit, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
