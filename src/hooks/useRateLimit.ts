import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface UseRateLimitReturn {
  /**
   * Check if the current user can make a request to the specified endpoint
   * Returns true if allowed, false if rate limited
   */
  checkRateLimit: (endpoint: string) => Promise<boolean>;
  
  /**
   * Whether the last check was rate limited
   */
  isRateLimited: boolean;
  
  /**
   * The endpoint that was rate limited (if any)
   */
  rateLimitedEndpoint: string | null;
  
  /**
   * Clear the rate limit status
   */
  clearRateLimitStatus: () => void;
}

export function useRateLimit(): UseRateLimitReturn {
  const { user } = useAuth();
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitedEndpoint, setRateLimitedEndpoint] = useState<string | null>(null);

  const checkRateLimit = useCallback(async (endpoint: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        _user_id: user.id,
        _endpoint: endpoint,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Rate limit check error:', error);
        }
        // If there's an error checking, allow the request
        return true;
      }

      const allowed = data as boolean;

      if (!allowed) {
        setIsRateLimited(true);
        setRateLimitedEndpoint(endpoint);
        toast.error('تم تجاوز حد الطلبات المسموح. يرجى الانتظار قليلاً.');
      } else {
        // Clear status if allowed
        if (rateLimitedEndpoint === endpoint) {
          setIsRateLimited(false);
          setRateLimitedEndpoint(null);
        }
      }

      return allowed;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Rate limit check failed:', err);
      }
      // If there's an exception, allow the request
      return true;
    }
  }, [user, rateLimitedEndpoint]);

  const clearRateLimitStatus = useCallback(() => {
    setIsRateLimited(false);
    setRateLimitedEndpoint(null);
  }, []);

  return {
    checkRateLimit,
    isRateLimited,
    rateLimitedEndpoint,
    clearRateLimitStatus,
  };
}

/**
 * Higher-order function to wrap an async function with rate limiting
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  endpoint: string,
  checkFn: (endpoint: string) => Promise<boolean>
): T {
  return (async (...args: Parameters<T>) => {
    const allowed = await checkFn(endpoint);
    if (!allowed) {
      throw new Error('RATE_LIMITED');
    }
    return fn(...args);
  }) as T;
}

export default useRateLimit;
