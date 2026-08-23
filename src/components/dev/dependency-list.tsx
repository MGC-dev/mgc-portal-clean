"use client";

import { useMemo, useState } from "react";
import { Empty, Panel, Segmented } from "@/components/dev/ui";
import { FilterInput } from "@/components/dev/filter-input";

type Dep = { name: string; range: string };

const TABS = [
  { value: "runtime", label: "Runtime" },
  { value: "dev", label: "Dev" },
] as const;

export default function DependencyList({
  dependencies,
  devDependencies,
}: {
  dependencies: Dep[];
  devDependencies: Dep[];
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"runtime" | "dev">("runtime");

  const list = tab === "runtime" ? dependencies : devDependencies;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? list.filter((d) => d.name.toLowerCase().includes(q)) : list;
  }, [list, query]);

  return (
    <Panel
      title="Installed packages"
      subtitle={`${dependencies.length} runtime · ${devDependencies.length} dev — versions as declared in package.json`}
      action={<Segmented options={TABS} value={tab} onChange={setTab} />}
    >
      <div className="space-y-4">
        <FilterInput value={query} onChange={setQuery} placeholder="Filter packages…" />
        {filtered.length === 0 ? (
          <Empty label="No packages match that filter." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {filtered.map((dep) => (
              <div
                key={dep.name}
                className="flex items-center justify-between gap-3 py-2 border-b border-[var(--dev-hairline)]"
              >
                <span className="text-[12.5px] font-mono text-[var(--dev-text)] truncate tracking-[-0.01em]">
                  {dep.name}
                </span>
                <span className="text-[12px] font-mono text-[var(--dev-text-tertiary)] shrink-0 tabular-nums">
                  {dep.range}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
