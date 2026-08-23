"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
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
import { FilterInput } from "@/components/dev/filter-input";
import { useDevResource } from "@/components/dev/use-dev-resource";

type EnvVar = {
  name: string;
  group: string;
  required: boolean;
  description: string;
  set: boolean;
  isPublic: boolean;
  length: number | null;
  fingerprint: string | null;
  value: string | null;
};

type EnvPayload = {
  summary: { total: number; set: number; missingRequired: number; missingRequiredNames: string[] };
  variables: EnvVar[];
};

export default function DevEnvPage() {
  const { data, error, loading, refreshing, refresh } =
    useDevResource<EnvPayload>("/api/dev/env");
  const [query, setQuery] = useState("");

  const variables = data?.variables ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? variables.filter(
          (v) => v.name.toLowerCase().includes(q) || v.group.toLowerCase().includes(q)
        )
      : variables;
  }, [variables, query]);

  const groups = Array.from(new Set(filtered.map((v) => v.group)));

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Environment"
        description="Which variables this instance actually has. Secret values are never sent to the browser."
        action={<RefreshButton onClick={refresh} busy={loading || refreshing} />}
      />

      <div className="flex items-start gap-3 rounded-2xl bg-[var(--dev-surface)] border border-[var(--dev-hairline)] shadow-[var(--dev-shadow-sm)] px-4 py-3.5">
        <ShieldCheck size={15} className="text-[var(--dev-ok)] mt-0.5 shrink-0" />
        <p className="text-[12.5px] text-[var(--dev-text-secondary)] leading-relaxed">
          For secrets you see only <span className="text-[var(--dev-text)] font-medium">set/unset</span>, the value
          length, and an 8-character SHA-256 fingerprint — enough to confirm which key is deployed
          by comparing fingerprints between environments, without exposing the key.{" "}
          <span className="font-mono">NEXT_PUBLIC_*</span> values are shown in full because they
          already ship to every browser.
        </p>
      </div>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat label="Set" value={`${data.summary.set}/${data.summary.total}`} tone="ok" />
          <Stat
            label="Required missing"
            value={data.summary.missingRequired}
            tone={data.summary.missingRequired ? "fail" : "ok"}
            hint={data.summary.missingRequiredNames.join(", ") || "None"}
          />
          <Stat label="Tracked" value={data.summary.total} hint="Known to the registry" />
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {loading && <Loading label="Reading environment…" />}

      {!loading && !error && (
        <div className="space-y-4">
          <FilterInput value={query} onChange={setQuery} placeholder="Filter variables…" />
          {filtered.length === 0 && <Empty label="No variables match that filter." />}
          {groups.map((group) => (
            <Panel key={group} title={group} flush>
              <div>
                {filtered
                  .filter((v) => v.group === group)
                  .map((v) => (
                    <div key={v.name} className="px-5 py-3 border-t border-[var(--dev-hairline)] first:border-t-0 hover:bg-[var(--dev-surface-sunken)] transition-colors duration-150">
                      <div className="flex flex-wrap items-center gap-2">
                        {v.set ? (
                          <CheckCircle2 size={15} className="text-[var(--dev-ok)] shrink-0" />
                        ) : (
                          <Circle
                            size={15}
                            className={
                              v.required
                                ? "text-[var(--dev-fail)] shrink-0"
                                : "text-[var(--dev-text-tertiary)] shrink-0"
                            }
                          />
                        )}
                        <span className="text-[12.5px] font-mono text-[var(--dev-text)] tracking-[-0.01em]">{v.name}</span>
                        {v.required && !v.set && <Pill tone="fail">required, missing</Pill>}
                        {v.required && v.set && <Pill tone="ok">required</Pill>}
                        {!v.required && !v.set && <Pill tone="muted">optional, unset</Pill>}
                      </div>
                      <p className="text-[12px] text-[var(--dev-text-secondary)] mt-1 ml-6">{v.description}</p>
                      {v.set && (
                        <p className="text-[11.5px] font-mono text-[var(--dev-text-tertiary)] mt-1 ml-6 break-all">
                          {v.value !== null
                            ? v.value
                            : `${v.length} chars · fingerprint ${v.fingerprint}`}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
