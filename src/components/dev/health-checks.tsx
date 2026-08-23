"use client";

import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import {
  Empty,
  ErrorNote,
  Loading,
  Panel,
  Pill,
  RefreshButton,
  Stat,
  type Tone,
} from "@/components/dev/ui";
import { useDevResource } from "@/components/dev/use-dev-resource";

type Check = {
  id: string;
  label: string;
  group: string;
  status: "ok" | "fail" | "skipped";
  ms: number;
  detail: string;
};

type HealthPayload = {
  ranAt: string;
  totalMs: number;
  summary: { total: number; ok: number; failed: number; skipped: number; slowestMs: number };
  checks: Check[];
};

const STATUS_META: Record<
  Check["status"],
  { tone: Tone; icon: typeof CheckCircle2; label: string; color: string }
> = {
  ok: { tone: "ok", icon: CheckCircle2, label: "Pass", color: "var(--dev-ok)" },
  fail: { tone: "fail", icon: XCircle, label: "Fail", color: "var(--dev-fail)" },
  skipped: {
    tone: "muted",
    icon: MinusCircle,
    label: "Skipped",
    color: "var(--dev-text-tertiary)",
  },
};

/** Latency bar — width is relative to the slowest check in the run. */
function Latency({ ms, max }: { ms: number; max: number }) {
  const pct = max > 0 ? Math.max(3, Math.round((ms / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="hidden sm:block h-1 w-16 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--dev-accent)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11.5px] tabular-nums text-[var(--dev-text-tertiary)] w-14 text-right font-mono">
        {ms} ms
      </span>
    </div>
  );
}

export default function HealthChecks({ compact = false }: { compact?: boolean }) {
  const { data, error, loading, refreshing, refresh } =
    useDevResource<HealthPayload>("/api/dev/health");

  const checks = data?.checks ?? [];
  const groups = Array.from(new Set(checks.map((c) => c.group)));
  const slowest = data?.summary.slowestMs ?? 0;

  return (
    <div className="space-y-4">
      {!compact && data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Passing" value={data.summary.ok} tone="ok" />
          <Stat
            label="Failing"
            value={data.summary.failed}
            tone={data.summary.failed ? "fail" : "muted"}
          />
          <Stat label="Skipped" value={data.summary.skipped} hint="Credentials not set" />
          <Stat label="Slowest" value={`${data.summary.slowestMs}`} hint="milliseconds" />
        </div>
      )}

      <Panel
        title="Dependency Health"
        subtitle={
          data
            ? `Last run ${new Date(data.ranAt).toLocaleTimeString()} · ${data.totalMs} ms total`
            : "Live round-trips against every external dependency"
        }
        action={<RefreshButton onClick={refresh} busy={loading || refreshing} label="Run checks" />}
        flush
      >
        {error && (
          <div className="p-5">
            <ErrorNote message={error} />
          </div>
        )}
        {loading && <Loading label="Probing dependencies…" />}
        {!loading && !error && checks.length === 0 && <Empty label="No checks returned." />}

        {checks.length > 0 && (
          <div>
            {data && (
              <div className="flex flex-wrap gap-2 px-5 py-3.5 dev-hairline-b">
                <Pill tone={data.summary.failed ? "fail" : "ok"}>
                  {data.summary.failed
                    ? `${data.summary.failed} failing`
                    : "All configured checks passing"}
                </Pill>
                {data.summary.skipped > 0 && (
                  <Pill tone="muted">{data.summary.skipped} not configured</Pill>
                )}
              </div>
            )}

            {groups.map((group) => (
              <div key={group}>
                <p className="px-5 pt-4 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--dev-text-tertiary)]">
                  {group}
                </p>
                <div>
                  {checks
                    .filter((c) => c.group === group)
                    .map((check) => {
                      const meta = STATUS_META[check.status];
                      const Icon = meta.icon;
                      return (
                        <div
                          key={check.id}
                          className="flex items-start gap-3 px-5 py-3 border-t border-[var(--dev-hairline)] hover:bg-[var(--dev-surface-sunken)] transition-colors duration-150"
                        >
                          <Icon
                            size={16}
                            className="mt-0.5 shrink-0"
                            style={{ color: meta.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <p className="text-[13.5px] font-medium text-[var(--dev-text)] tracking-[-0.01em]">
                                  {check.label}
                                </p>
                                <Pill tone={meta.tone}>{meta.label}</Pill>
                              </div>
                              <Latency ms={check.ms} max={slowest} />
                            </div>
                            <p className="text-[12px] text-[var(--dev-text-secondary)] mt-1 break-words font-mono tracking-[-0.01em]">
                              {check.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
            <div className="h-2" />
          </div>
        )}
      </Panel>
    </div>
  );
}
