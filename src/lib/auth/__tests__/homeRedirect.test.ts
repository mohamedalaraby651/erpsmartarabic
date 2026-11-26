import { describe, expect, it } from 'vitest';
import { decideRedirect } from '../homeRedirect';

describe('decideRedirect', () => {
  it('sends signed-in users from / to /dashboard', () => {
    expect(decideRedirect({ loading: false, signedIn: true, path: '/' })).toEqual({ kind: 'redirect', to: '/dashboard' });
  });
  it('shows the landing page to signed-out users on /', () => {
    expect(decideRedirect({ loading: false, signedIn: false, path: '/' })).toEqual({ kind: 'landing' });
  });
  it('sends signed-out users from /dashboard to /auth with next', () => {
    expect(decideRedirect({ loading: false, signedIn: false, path: '/dashboard' })).toEqual({ kind: 'redirect', to: '/auth?next=%2Fdashboard' });
  });
  it('waits without redirecting while the session loads', () => {
    expect(decideRedirect({ loading: true, signedIn: false, path: '/dashboard' })).toEqual({ kind: 'wait' });
  });
  it('keeps signed-in users on /dashboard', () => {
    expect(decideRedirect({ loading: false, signedIn: true, path: '/dashboard' })).toEqual({ kind: 'stay' });
  });
});
