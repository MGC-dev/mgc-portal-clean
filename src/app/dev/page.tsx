import Link from "next/link";
import {
  Activity,
  Boxes,
  ChevronRight,
  Database,
  GitCommitHorizontal,
  KeyRound,
  Route as RouteIcon,
  ScrollText,
  Server,
  UserCog,
} from "lucide-react";
import { Panel, Pill, Row, Stat } from "@/components/dev/ui";
import MaintenanceToggle from "@/components/dev/maintenance-toggle";
import HealthChecks from "@/components/dev/health-checks";
import { getSystemInfo } from "@/lib/dev/system";
import { readMaintenanceState } from "@/lib/dev/maintenance";
import { summariseEnv, inspectEnv } from "@/lib/dev/env-registry";

export const dynamic = "force-dynamic";

const links = [
  { href: "/dev/health", label: "Health Checks", desc: "Probe every dependency", icon: Activity },
  { href: "/dev/stack", label: "Tech Stack", desc: "Frameworks & libraries", icon: Boxes },
  { href: "/dev/routes", label: "Routes & API", desc: "Every page and endpoint", icon: RouteIcon },
  { href: "/dev/env", label: "Environment", desc: "Which secrets are set", icon: KeyRound },
  { href: "/dev/database", label: "Database", desc: "Tables, rows, buckets", icon: Database },
  { href: "/dev/session", label: "Session", desc: "Auth & cookie inspector", icon: UserCog },
  { href: "/dev/logs", label: "Event Log", desc: "Audit trail & errors", icon: ScrollText },
];

export default async function DevOverviewPage() {
  const system = getSystemInfo();
  const env = summariseEnv(inspectEnv());

  // The settings table may not exist yet if the migration has not been run.
  let maintenance = null;
  let maintenanceError: string | null = null;
  try {
    maintenance = await readMaintenanceState();
  } catch (e: any) {
    maintenanceError = `${e?.message || e}`;
  }

  const commit = system.git.runtimeCommit ?? system.git.commit;
  const isProd = system.nodeEnv === "production";

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-6 max-w-6xl mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--dev-surface)] border border-[var(--dev-hairline)] shadow-[var(--dev-shadow)]">
        <div className="absolute inset-0 dev-grid-bg pointer-events-none" />
        <div className="relative px-7 py-9 lg:px-10 lg:py-11">
          <div className="flex items-center gap-2 mb-4">
            <Pill tone={isProd ? "warn" : "info"}>
              <Server size={11} />
              {system.hosting.provider}
            </Pill>
            <Pill tone={isProd ? "fail" : "ok"}>
              {system.hosting.environment ?? system.nodeEnv}
            </Pill>
          </div>
          <h1 className="text-[40px] lg:text-[48px] leading-[1.05] font-semibold tracking-[-0.04em] text-[var(--dev-text)]">
            Dev Console
          </h1>
          <p className="mt-3 text-[15px] lg:text-[16px] text-[var(--dev-text-secondary)] max-w-xl leading-relaxed">
            Everything about how this deployment is running — dependencies, environment, data and
            the switch that takes the site offline.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[12.5px] text-[var(--dev-text-tertiary)]">
            <span>
              <span className="text-[var(--dev-text-secondary)]">next</span> {system.versions.next}
            </span>
            <span>
              <span className="text-[var(--dev-text-secondary)]">node</span> {system.versions.node}
            </span>
            <span>
              <span className="text-[var(--dev-text-secondary)]">commit</span>{" "}
              {commit ? commit.slice(0, 7) : "—"}
            </span>
            <span>
              <span className="text-[var(--dev-text-secondary)]">branch</span>{" "}
              {system.git.runtimeBranch ?? system.git.branch ?? "—"}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Environment"
          value={system.hosting.environment ?? system.nodeEnv}
          tone={isProd ? "warn" : "info"}
          hint={system.hosting.provider}
        />
        <Stat label="Next.js" value={system.versions.next} hint={`Node ${system.versions.node}`} />
        <Stat
          label="Env vars"
          value={`${env.set}/${env.total}`}
          tone={env.missingRequired ? "fail" : "ok"}
          hint={
            env.missingRequired ? `${env.missingRequired} required missing` : "All required present"
          }
        />
        <Stat
          label="Surface"
          value={`${system.counts.pages}/${system.counts.apis}`}
          hint="pages / API routes"
        />
      </div>

      {maintenanceError ? (
        <Panel title="Maintenance Mode">
          <div className="rounded-xl bg-[var(--dev-warn-soft)] px-4 py-3.5">
            <p className="text-[12.5px] text-[var(--dev-warn)] leading-relaxed">
              Could not read the settings table: {maintenanceError}
            </p>
            <p className="text-[12.5px] text-[var(--dev-warn)] mt-2 leading-relaxed">
              Run <span className="font-mono">supabase-dev-dashboard.sql</span> in the Supabase SQL
              editor to create <span className="font-mono">app_settings</span> and{" "}
              <span className="font-mono">dev_events</span>.
            </p>
          </div>
        </Panel>
      ) : (
        <MaintenanceToggle initial={maintenance} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Runtime" subtitle="This serverless instance">
          <Row label="Hosting">{system.hosting.provider}</Row>
          <Row label="Deploy env">{system.hosting.environment ?? system.nodeEnv}</Row>
          <Row label="Region">{system.hosting.region ?? "—"}</Row>
          <Row label="Public URL">{system.hosting.url ?? "—"}</Row>
          <Row label="Runtime">{system.nextRuntime}</Row>
          <Row label="Platform">{system.platform}</Row>
          <Row label="Timezone">{system.timezone}</Row>
          <Row label="Process uptime">{`${system.processUptimeSeconds}s`}</Row>
          {system.memory && (
            <Row label="Memory">{`${system.memory.heapUsedMb} / ${system.memory.heapTotalMb} MB heap · ${system.memory.rssMb} MB RSS`}</Row>
          )}
        </Panel>

        <Panel
          title="Build"
          subtitle="What this deployment was built from"
          action={
            system.git.dirty ? (
              <Pill tone="warn">uncommitted at build</Pill>
            ) : (
              <Pill tone="ok">
                <GitCommitHorizontal size={11} /> clean
              </Pill>
            )
          }
        >
          <Row label="Commit">{commit ? commit.slice(0, 12) : "—"}</Row>
          <Row label="Branch">{system.git.runtimeBranch ?? system.git.branch ?? "—"}</Row>
          <Row label="Message" mono={false}>
            {system.git.runtimeMessage ?? system.git.subject ?? "—"}
          </Row>
          <Row label="Committed">
            {system.git.committedAt ? new Date(system.git.committedAt).toLocaleString() : "—"}
          </Row>
          <Row label="Manifest built">
            {new Date(system.build.generatedAt).toLocaleString()}
          </Row>
          <Row label="App version">{`${system.app.name} v${system.app.version}`}</Row>
        </Panel>
      </div>

      <HealthChecks compact />

      <section>
        <h2 className="text-[15px] font-semibold text-[var(--dev-text)] mb-3.5 tracking-[-0.015em]">
          Jump to
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3.5 rounded-2xl bg-[var(--dev-surface)] border border-[var(--dev-hairline)] shadow-[var(--dev-shadow-sm)] p-4 hover:shadow-[var(--dev-shadow)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="shrink-0 h-10 w-10 rounded-xl bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline)] text-[var(--dev-text-secondary)] flex items-center justify-center group-hover:bg-[var(--dev-accent-soft)] group-hover:text-[var(--dev-accent)] group-hover:border-transparent transition-colors duration-200">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-[var(--dev-text)] tracking-[-0.015em]">
                    {link.label}
                  </p>
                  <p className="text-[12px] text-[var(--dev-text-secondary)] mt-0.5">{link.desc}</p>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-[var(--dev-text-tertiary)] group-hover:text-[var(--dev-accent)] group-hover:translate-x-0.5 transition-all duration-200"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
