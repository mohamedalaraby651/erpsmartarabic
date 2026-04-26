import { useState } from 'react';
import { X, AlertTriangle, FlaskConical } from 'lucide-react';
import { detectEnvironment, getEnvironmentLabel } from '@/lib/buildInfo';
import { cn } from '@/lib/utils';

/**
 * EnvironmentBadge — a thin, dismissible banner that warns the user when they
 * are NOT on the published production URL.
 *
 * Why this exists:
 *   The same project is served from THREE different URLs:
 *     1. The in-editor preview          (development)
 *     2. `id-preview--*.lovable.app`   (preview — Lovable Cloud Dev backend)
 *     3. `erpsmartarabic.lovable.app`   (production — what end users see)
 *
 *   Each one talks to a DIFFERENT backend with DIFFERENT data, so when a
 *   developer/tester switches between them they often think the app is broken
 *   ("this customer existed yesterday!") when they've actually swapped DBs.
 *
 *   This badge eliminates that confusion at a glance.
 *
 * Behaviour:
 *   - Hidden entirely on production (zero visual cost for end users)
 *   - Soft yellow/blue strip on preview/dev
 *   - Dismissible per-session (sessionStorage) — never spammy
 */

const DISMISS_KEY = 'lvbl:env-badge:dismissed';

export function EnvironmentBadge() {
  const env = detectEnvironment();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  // Production: render nothing — no DOM, no styles, no a11y noise.
  if (env === 'production' || dismissed) return null;

  const label = getEnvironmentLabel(env);
  const isPreview = env === 'preview';

  const handleDismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className={cn(
        'sticky top-0 z-[60] flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] font-medium border-b',
        isPreview
          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30'
          : 'bg-blue-500/15 text-blue-900 dark:text-blue-200 border-blue-500/30',
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {isPreview ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate">
          {label} — البيانات هنا تجريبية وقد تختلف عن النسخة الرسمية.
        </span>
        {isPreview && (
          <a
            href="https://erpsmartarabic.lovable.app"
            className="hidden sm:inline underline underline-offset-2 hover:opacity-80 shrink-0"
          >
            افتح النسخة الرسمية
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="إخفاء"
        className="shrink-0 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export default EnvironmentBadge;
