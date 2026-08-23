"use client";

import { useState } from "react";
import {
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  RefreshButton,
  Segmented,
  type Tone,
} from "@/components/dev/ui";
import { useDevResource } from "@/components/dev/use-dev-resource";

type DevEvent = {
  id: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  meta: Record<string, unknown>;
  actor_email: string | null;
  created_at: string;
};

const LEVEL_TONE: Record<DevEvent["level"], Tone> = {
  info: "info",
  warn: "warn",
  error: "fail",
};

const FILTERS = ["all", "info", "warn", "error"] as const;

export default function DevLogsPage() {
  const [level, setLevel] = useState<(typeof FILTERS)[number]>("all");
  const { data, error, loading, refreshing, refresh } = useDevResource<{ events: DevEvent[] }>(
    `/api/dev/events?limit=200${level === "all" ? "" : `&level=${level}`}`
  );

  const events = data?.events ?? [];

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Event Log"
        description="Audit trail and error log from dev_events — every maintenance toggle lands here, plus anything the app records with logDevEvent()."
        action={<RefreshButton onClick={refresh} busy={loading || refreshing} />}
      />

      <Segmented
        options={FILTERS.map((f) => ({
          value: f,
          label: f[0].toUpperCase() + f.slice(1),
        }))}
        value={level}
        onChange={setLevel}
      />

      {error && <ErrorNote message={error} />}
      {loading && <Loading label="Loading events…" />}

      {!loading && !error && (
        <Panel title="Events" subtitle={`${events.length} most recent`} flush>
          {events.length === 0 ? (
            <Empty label="No events recorded yet." />
          ) : (
            <div>
              {events.map((e) => (
                <div
                  key={e.id}
                  className="px-5 py-3.5 border-t border-[var(--dev-hairline)] first:border-t-0 hover:bg-[var(--dev-surface-sunken)] transition-colors duration-150"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={LEVEL_TONE[e.level]}>{e.level}</Pill>
                    <span className="text-[11.5px] font-mono text-[var(--dev-text-secondary)]">{e.source}</span>
                    <span className="text-[11.5px] text-[var(--dev-text-tertiary)] tabular-nums">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                    {e.actor_email && (
                      <span className="text-[11.5px] text-[var(--dev-text-tertiary)]">· {e.actor_email}</span>
                    )}
                  </div>
                  <p className="text-[13px] text-[var(--dev-text)] mt-1.5 leading-relaxed">{e.message}</p>
                  {e.meta && Object.keys(e.meta).length > 0 && (
                    <pre className="mt-2 rounded-xl bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline)] p-3 text-[11.5px] font-mono text-[var(--dev-text-secondary)] overflow-x-auto leading-relaxed">
                      {JSON.stringify(e.meta, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
