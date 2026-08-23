"use client";

import { useMemo, useState } from "react";
import { Empty, Panel, Pill, type Tone } from "@/components/dev/ui";
import { FilterInput } from "@/components/dev/filter-input";

type Page = { path: string; source: string };
type Api = { path: string; source: string; methods: string[] };

const METHOD_TONE: Record<string, Tone> = {
  GET: "info",
  POST: "ok",
  PUT: "warn",
  PATCH: "warn",
  DELETE: "fail",
};

export default function RouteList({ pages, apis }: { pages: Page[]; apis: Api[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredPages = useMemo(
    () => (q ? pages.filter((p) => p.path.toLowerCase().includes(q)) : pages),
    [pages, q]
  );
  const filteredApis = useMemo(
    () =>
      q
        ? apis.filter(
            (a) =>
              a.path.toLowerCase().includes(q) || a.methods.some((m) => m.toLowerCase() === q)
          )
        : apis,
    [apis, q]
  );

  return (
    <div className="space-y-4">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter by path or method…" />

      <Panel title="Pages" subtitle={`${filteredPages.length} of ${pages.length} routes`} flush>
        {filteredPages.length === 0 ? (
          <Empty label="No pages match that filter." />
        ) : (
          <div>
            {filteredPages.map((page) => (
              <div
                key={page.source}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-t border-[var(--dev-hairline)] first:border-t-0 hover:bg-[var(--dev-surface-sunken)] transition-colors duration-150"
              >
                <span className="text-[12.5px] font-mono text-[var(--dev-text)] tracking-[-0.01em]">
                  {page.path}
                </span>
                <span className="text-[11.5px] font-mono text-[var(--dev-text-tertiary)]">
                  {page.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="API routes"
        subtitle={`${filteredApis.length} of ${apis.length} endpoints`}
        flush
      >
        {filteredApis.length === 0 ? (
          <Empty label="No endpoints match that filter." />
        ) : (
          <div>
            {filteredApis.map((api) => (
              <div
                key={api.source}
                className="px-5 py-3 border-t border-[var(--dev-hairline)] first:border-t-0 hover:bg-[var(--dev-surface-sunken)] transition-colors duration-150"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {api.methods.length === 0 ? (
                    <Pill tone="muted">no handlers</Pill>
                  ) : (
                    api.methods.map((m) => (
                      <Pill key={m} tone={METHOD_TONE[m] ?? "muted"}>
                        {m}
                      </Pill>
                    ))
                  )}
                  <span className="text-[12.5px] font-mono text-[var(--dev-text)] tracking-[-0.01em]">
                    {api.path}
                  </span>
                </div>
                <p className="text-[11.5px] font-mono text-[var(--dev-text-tertiary)] mt-1.5">
                  {api.source}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
