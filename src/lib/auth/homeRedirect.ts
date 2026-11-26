export const DASHBOARD_PATH = '/dashboard';

export type RedirectDecision =
  | { kind: 'wait' }
  | { kind: 'landing' }
  | { kind: 'stay' }
  | { kind: 'redirect'; to: string };

/** Decides where "/" and protected app pages send a visitor. Pure for testing. */
export function decideRedirect(input: { loading: boolean; signedIn: boolean; path: string }): RedirectDecision {
  const { loading, signedIn, path } = input;
  if (loading) return { kind: 'wait' };
  if (path === '/') return signedIn ? { kind: 'redirect', to: DASHBOARD_PATH } : { kind: 'landing' };
  if (signedIn) return { kind: 'stay' };
  return { kind: 'redirect', to: `/auth?next=${encodeURIComponent(path)}` };
}
