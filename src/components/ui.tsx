"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { HealthStatus, TaskPriority } from "@/lib/types";
import { formatDateDDMMYYYY } from "@/lib/business-rules";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="muted text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, action, padded = true }: { children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode; padded?: boolean }) {
  return (
    <section className={cn("card", padded && "p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className={cn("flex items-center justify-between gap-3 mb-3", !padded && "px-4 pt-4")}>
          {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({ variant = "primary", size, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost"; size?: "sm" }) {
  return <button className={cn("btn", variant === "primary" ? "btn-primary" : "btn-ghost", size === "sm" && "btn-sm", className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input", props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("input", props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("input", props.className)} />;
}
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="muted text-xs mt-1 block">{hint}</span>}
    </label>
  );
}

export function Pill({ children, tone, className }: { children: React.ReactNode; tone?: HealthStatus | "neutral"; className?: string }) {
  const toneClass = tone === "green" ? "pill-green" : tone === "amber" ? "pill-amber" : tone === "red" ? "pill-red" : "";
  return <span className={cn("pill", toneClass, className)}>{children}</span>;
}

export function HealthDot({ status, label }: { status: HealthStatus; label?: string }) {
  const color = status === "green" ? "bg-[#16a34a]" : status === "amber" ? "bg-[#d97706]" : "bg-[#dc2626]";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} aria-label={status} />
      {label && <span className="capitalize">{label}</span>}
    </span>
  );
}

export function PriorityTag({ p }: { p: TaskPriority }) {
  const tone = p === "P1" ? "red" : p === "P2" ? "neutral" : "neutral";
  return (
    <Pill tone={tone} className="font-semibold">
      {p}
      <span className="font-normal muted">{p === "P1" ? "urgent" : p === "P2" ? "normal" : "low"}</span>
    </Pill>
  );
}

export function ProgressBar({ value, max, label, tone }: { value: number; max: number; label?: string; tone?: HealthStatus }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = tone === "red" ? "bg-[#dc2626]" : tone === "amber" ? "bg-[#d97706]" : "bg-[var(--fg)]";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="muted">{label ?? "Progress"}</span>
        <span className="font-medium tabular-nums">
          {value} of {max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full soft overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full font-semibold select-none", size === "sm" ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-sm")} style={{ background: "var(--fg)", color: "var(--bg)" }} title={name}>
      {initials}
    </span>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="font-medium">{title}</p>
      {hint && <p className="muted text-sm mt-1">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("relative card w-full max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl fade-in", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ background: "var(--bg-elev)" }}>
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:soft" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="scroll-x -mx-1 px-1 mb-4">
      <div className="flex gap-1 border-b min-w-max">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)} className={cn("px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition min-h-[44px]", value === t.id ? "border-[var(--fg)] font-semibold" : "border-transparent muted hover:text-[var(--fg)]")}>
            {t.label}
            {typeof t.count === "number" && <span className="ml-1.5 text-xs muted tabular-nums">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: HealthStatus }) {
  return (
    <div className="card p-4">
      <p className="text-xs muted uppercase tracking-wide">{label}</p>
      <p className={cn("text-2xl font-semibold mt-1 tabular-nums", tone === "red" && "text-[#dc2626]", tone === "amber" && "text-[#d97706]", tone === "green" && "text-[#16a34a]")}>{value}</p>
      {hint && <p className="muted text-xs mt-1">{hint}</p>}
    </div>
  );
}

export function DateText({ value }: { value?: string | null }) {
  return <span className="tabular-nums">{formatDateDDMMYYYY(value)}</span>;
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl soft p-1 gap-1">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cn("px-3 py-1.5 rounded-lg text-sm min-h-[36px] transition", value === o.id ? "font-semibold shadow-sm" : "muted")} style={value === o.id ? { background: "var(--bg-elev)" } : undefined}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
