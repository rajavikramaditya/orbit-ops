'use client';

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Health } from '@/lib/store';
import { healthLabel } from '@/lib/store';

export function PageHeader({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('rounded-2xl border bg-card shadow-card', onClick && 'cursor-pointer hover:border-foreground/20 transition-colors', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">{children}</h2>
      {right}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-xs',
        variant === 'primary' && 'bg-foreground text-background hover:opacity-90',
        variant === 'secondary' && 'border bg-card hover:bg-muted',
        variant === 'ghost' && 'hover:bg-muted text-muted-foreground hover:text-foreground',
        variant === 'danger' && 'border border-red/40 text-red hover:bg-red-soft',
        className,
      )}
    />
  );
}

const fieldBase = 'w-full rounded-xl border px-3 py-2 text-sm h-10 focus:border-foreground/40 transition-colors';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(fieldBase, 'appearance-none pr-9', className)} />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, 'min-h-20', className)} />;
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'solid';

export function Badge({ tone = 'neutral', className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        tone === 'neutral' && 'border text-muted-foreground bg-card',
        tone === 'green' && 'bg-green-soft text-green',
        tone === 'amber' && 'bg-amber-soft text-amber',
        tone === 'red' && 'bg-red-soft text-red',
        tone === 'solid' && 'bg-foreground text-background',
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'green' && 'bg-green', tone === 'amber' && 'bg-amber', tone === 'red' && 'bg-red', tone === 'neutral' && 'bg-muted-foreground', tone === 'solid' && 'bg-background')} />}
      {children}
    </span>
  );
}

export function HealthBadge({ health }: { health: Health }) {
  return <Badge tone={health} dot>{healthLabel(health)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: 'P1' | 'P2' | 'P3' }) {
  return <Badge tone={priority === 'P1' ? 'red' : priority === 'P2' ? 'neutral' : 'neutral'}>{priority}</Badge>;
}

export function Avatar({ name, className, size = 'md' }: { name: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');
  return (
    <div className={cn('rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 font-semibold', size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-xs', className)}>
      {initials || '?'}
    </div>
  );
}

export function Stat({ label, value, hint, tone, onClick }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'green' | 'amber' | 'red'; onClick?: () => void }) {
  return (
    <Card onClick={onClick} className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-semibold tabular-nums mt-1 tracking-tight', tone === 'green' && 'text-green', tone === 'amber' && 'text-amber', tone === 'red' && 'text-red')}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}

export function ProgressBar({ value, max, tone, className }: { value: number; max: number; tone?: Health; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', tone === 'red' ? 'bg-red' : tone === 'amber' ? 'bg-amber' : tone === 'green' ? 'bg-green' : 'bg-foreground/70')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="radiogroup" className={cn('flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1', className)}>
      {options.map(o => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o.value}
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn('inline-flex items-center justify-center gap-1.5 rounded-full px-3 h-8 text-xs font-medium whitespace-nowrap transition-colors border', value === o.value ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground hover:text-foreground')}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('tabular-nums text-[10px] rounded-full px-1.5', value === o.value ? 'bg-background/20' : 'bg-muted')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} />
      <div role="dialog" aria-modal className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-card shadow-float animate-rise">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3">{children}</div>
        {footer && <div className="px-5 py-3 border-t flex justify-end gap-2 safe-area-inset-bottom">{footer}</div>}
      </div>
    </div>
  );
}

export function Row({ children, className, href }: { children: ReactNode; className?: string; href?: string }) {
  const cls = cn('flex items-center gap-3 px-4 py-3 border-b last:border-b-0', href && 'hover:bg-muted/50 transition-colors', className);
  return <div className={cls}>{children}</div>;
}
