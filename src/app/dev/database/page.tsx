"use client";

import {
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  RefreshButton,
  Stat,
} from "@/components/dev/ui";
import { useDevResource } from "@/components/dev/use-dev-resource";

type Table = { name: string; rows: number | null; error: string | null };
type Bucket = { name: string; public: boolean; createdAt: string | null };

type DbPayload = {
  ranAt: string;
  tables: Table[];
  buckets: Bucket[];
  bucketError: string | null;
  summary: { tables: number; missing: number; totalRows: number };
};

export default function DevDatabasePage() {
  const { data, error, loading, refreshing, refresh } =
    useDevResource<DbPayload>("/api/dev/database");

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Database"
        description="Row counts per table and the storage buckets behind them. Counts only — no row data is read."
        action={<RefreshButton onClick={refresh} busy={loading || refreshing} />}
      />

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Tables" value={data.summary.tables} />
          <Stat
            label="Unreachable"
            value={data.summary.missing}
            tone={data.summary.missing ? "fail" : "ok"}
            hint={data.summary.missing ? "Missing or blocked" : "All present"}
          />
          <Stat label="Total rows" value={data.summary.totalRows.toLocaleString()} />
          <Stat label="Buckets" value={data.buckets.length} />
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {loading && <Loading label="Counting rows…" />}

      {data && (
        <>
          <Panel
            title="Tables"
            subtitle={`Counted at ${new Date(data.ranAt).toLocaleTimeString()}`}
            flush
          >
            <div>
              {data.tables.map((t) => (
                <div key={t.name} className="flex items-start justify-between gap-4 px-5 py-2.5 border-t border-[var(--dev-hairline)] first:border-t-0 hover:bg-[var(--dev-surface-sunken)] transition-colors duration-150">
                  <div className="min-w-0">
                    <span className="text-[12.5px] font-mono text-[var(--dev-text)] tracking-[-0.01em]">{t.name}</span>
                    {t.error && (
                      <p className="text-[11.5px] text-[var(--dev-fail)] mt-1 break-words">{t.error}</p>
                    )}
                  </div>
                  {t.error ? (
                    <Pill tone="fail">unreachable</Pill>
                  ) : (
                    <span className="text-[12.5px] font-mono text-[var(--dev-text-secondary)] tabular-nums shrink-0">
                      {t.rows?.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Storage buckets">
            {data.bucketError && <ErrorNote message={data.bucketError} />}
            {!data.bucketError && data.buckets.length === 0 && <Empty label="No buckets found." />}
            <div className="divide-y divide-[var(--dev-hairline)]">
              {data.buckets.map((b) => (
                <div key={b.name} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-[12.5px] font-mono text-[var(--dev-text)] tracking-[-0.01em]">{b.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill tone={b.public ? "warn" : "ok"}>
                      {b.public ? "public" : "private"}
                    </Pill>
                    <span className="text-[11.5px] text-[var(--dev-text-tertiary)]">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
