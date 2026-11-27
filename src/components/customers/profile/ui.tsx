import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = 'primary' | 'success' | 'warning' | 'destructive' | 'violet' | 'muted';
const TONE: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  violet: 'bg-violet/10 text-violet',
  muted: 'bg-muted text-muted-foreground',
};
const PILL: Record<Tone, string> = {
  primary: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
  violet: 'border-violet/20 bg-violet/10 text-violet',
  muted: 'border-border bg-muted text-muted-foreground',
};

/** Signature v19 tinted rounded square around an icon. */
export function TintedIcon({ icon: Icon, tone = 'primary', size = 'md', className }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const box = size === 'sm' ? 'h-5 w-5 rounded-md' : size === 'lg' ? 'h-9 w-9 rounded-lg' : 'h-7 w-7 rounded-lg';
  const ic = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return <span className={cn('inline-flex shrink-0 items-center justify-center', box, TONE[tone], className)} aria-hidden><Icon className={ic} /></span>;
}

export function Pill({ tone = 'muted', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4', PILL[tone], className)}>{children}</span>;
}

export const cardCls = 'rounded-xl border border-border bg-card shadow-xs print-card';
