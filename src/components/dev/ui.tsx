"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

/**
 * Dev Console chrome — light, Apple-flavoured, high-tech.
 * Colours come from the .dev-console token block in globals.css.
 */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  flush = false,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes body padding for edge-to-edge lists. */
  flush?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl bg-[var(--dev-surface)] border border-[var(--dev-hairline)] shadow-[var(--dev-shadow-sm)] overflow-hidden ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-5 py-4 dev-hairline-b">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold text-[var(--dev-text)] tracking-[-0.015em]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[12.5px] text-[var(--dev-text-secondary)] mt-1 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export type Tone = "ok" | "warn" | "fail" | "muted" | "info";

const PILL_STYLES: Record<Tone, string> = {
  ok: "bg-[var(--dev-ok-soft)] text-[var(--dev-ok)]",
  warn: "bg-[var(--dev-warn-soft)] text-[var(--dev-warn)]",
  fail: "bg-[var(--dev-fail-soft)] text-[var(--dev-fail)]",
  info: "bg-[var(--dev-accent-soft)] text-[var(--dev-accent)]",
  muted: "bg-[var(--dev-muted-soft)] text-[var(--dev-text-secondary)]",
};

export function Pill({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[-0.005em] whitespace-nowrap ${PILL_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

const DOT_COLORS: Record<Tone, string> = {
  ok: "#34c759",
  warn: "#ff9f0a",
  fail: "#ff3b30",
  info: "#0071e3",
  muted: "#c7c7cc",
};

export function Dot({ tone = "muted", pulse = false }: { tone?: Tone; pulse?: boolean }) {
  const color = DOT_COLORS[tone];
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}22` }}
      />
    </span>
  );
}

const STAT_TONE: Record<Tone, string> = {
  ok: "text-[var(--dev-ok)]",
  warn: "text-[var(--dev-warn)]",
  fail: "text-[var(--dev-fail)]",
  info: "text-[var(--dev-accent)]",
  muted: "text-[var(--dev-text)]",
};

export function Stat({
  label,
  value,
  tone = "muted",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--dev-surface)] border border-[var(--dev-hairline)] shadow-[var(--dev-shadow-sm)] px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--dev-text-tertiary)]">
        {label}
      </p>
      <p
        className={`mt-1.5 text-[26px] leading-none font-semibold tabular-nums tracking-[-0.03em] ${STAT_TONE[tone]}`}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[11.5px] text-[var(--dev-text-secondary)] mt-2 leading-snug">{hint}</p>
      )}
    </div>
  );
}

/** Definition row: label left, value right (monospace by default). */
export function Row({
  label,
  children,
  mono = true,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-[var(--dev-hairline)] last:border-0">
      <span className="text-[12.5px] text-[var(--dev-text-secondary)] shrink-0">{label}</span>
      <span
        className={`text-[12.5px] text-[var(--dev-text)] text-right break-all ${
          mono ? "font-mono tracking-[-0.01em]" : ""
        }`}
      >
        {children}
      </span>
    </div>
  );
}

export function RefreshButton({
  onClick,
  busy,
  label = "Refresh",
}: {
  onClick: () => void;
  busy?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--dev-surface)] border border-[var(--dev-hairline-strong)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--dev-text)] shadow-[var(--dev-shadow-sm)] hover:bg-[var(--dev-surface-sunken)] active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-200"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
      {busy ? "Running…" : label}
    </button>
  );
}

/** Primary action, iOS-style filled capsule. */
export function ActionButton({
  onClick,
  children,
  busy,
  tone = "accent",
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  busy?: boolean;
  tone?: "accent" | "danger" | "neutral";
  disabled?: boolean;
}) {
  const styles = {
    accent:
      "bg-[var(--dev-accent)] text-white hover:bg-[var(--dev-accent-hover)] shadow-[0_1px_2px_rgba(0,113,227,0.25)]",
    danger: "bg-[#ff3b30] text-white hover:bg-[#ff453a] shadow-[0_1px_2px_rgba(255,59,48,0.25)]",
    neutral:
      "bg-[var(--dev-surface)] text-[var(--dev-text)] border border-[var(--dev-hairline-strong)] hover:bg-[var(--dev-surface-sunken)]",
  }[tone];

  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium tracking-[-0.01em] active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-200 ${styles}`}
    >
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-[rgba(0,0,0,0.05)] p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium tracking-[-0.01em] transition-all duration-200 ${
              active
                ? "bg-white text-[var(--dev-text)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                : "text-[var(--dev-text-secondary)] hover:text-[var(--dev-text)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-[var(--dev-fail-soft)] px-3.5 py-3">
      <AlertTriangle size={14} className="text-[var(--dev-fail)] mt-0.5 shrink-0" />
      <p className="text-[12.5px] text-[var(--dev-fail)] break-words leading-relaxed">{message}</p>
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-[var(--dev-text-secondary)]">
      <Loader2 size={14} className="animate-spin" />
      {label}
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <p className="py-10 text-center text-[12.5px] text-[var(--dev-text-tertiary)]">{label}</p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--dev-accent)] mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[32px] leading-[1.1] font-semibold text-[var(--dev-text)] tracking-[-0.035em]">
          {title}
        </h1>
        {description && (
          <p className="text-[14px] text-[var(--dev-text-secondary)] mt-2.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
