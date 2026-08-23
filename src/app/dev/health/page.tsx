import { PageHeader, Panel, Pill } from "@/components/dev/ui";
import HealthChecks from "@/components/dev/health-checks";

export const dynamic = "force-dynamic";

export default function DevHealthPage() {
  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Health Checks"
        description="Real round-trips against every external dependency. Read-only — nothing is written, no email is sent, no model tokens are billed."
      />

      <HealthChecks />

      <Panel title="Automated test suites" subtitle="Status of test tooling in this repository">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Pill tone="warn">none configured</Pill>
            <p className="text-[13px] text-[var(--dev-text-secondary)] leading-relaxed">
              This project has no unit or end-to-end test runner installed — no Jest, Vitest,
              Playwright or Cypress in <span className="font-mono">package.json</span>, and no{" "}
              <span className="font-mono">test</span> script. The checks above are the only
              automated verification the app currently has.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline)] p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--dev-text-tertiary)] mb-3">
              Verification you can run today
            </p>
            <ul className="space-y-2">
              {[
                { cmd: "npm run lint", desc: "ESLint (next/core-web-vitals)" },
                { cmd: "npx tsc --noEmit", desc: "TypeScript type check" },
                { cmd: "npm run build", desc: "Production build — catches route and type errors" },
              ].map((item) => (
                <li key={item.cmd} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="rounded-lg bg-white border border-[var(--dev-hairline)] px-2 py-1 text-[12px] font-mono text-[var(--dev-text)] shadow-[var(--dev-shadow-sm)]">
                    {item.cmd}
                  </code>
                  <span className="text-[12.5px] text-[var(--dev-text-secondary)]">
                    {item.desc}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-[var(--dev-text-tertiary)] mt-3.5 leading-relaxed">
              These are deliberately not runnable from this dashboard: they compile the app and
              would block or restart the server rendering this page.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
