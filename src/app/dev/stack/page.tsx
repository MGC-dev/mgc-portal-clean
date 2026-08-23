import { PageHeader, Panel, Row, Stat } from "@/components/dev/ui";
import DependencyList from "@/components/dev/dependency-list";
import manifest from "@/lib/dev/manifest.generated.json";
import { getSystemInfo } from "@/lib/dev/system";

export const dynamic = "force-dynamic";

/** Hand-curated map of what each layer of the stack is actually used for. */
const STACK = [
  { layer: "Framework", value: "Next.js 15 (App Router) · React 19 · TypeScript 5" },
  { layer: "Styling", value: "Tailwind CSS v4, tw-animate-css, Geist fonts" },
  { layer: "UI", value: "Radix UI primitives, lucide-react / react-feather, selected MUI" },
  { layer: "Motion & 3D", value: "Framer Motion, React Three Fiber + drei, Swiper" },
  { layer: "Data & charts", value: "Recharts, date-fns, react-big-calendar, react-day-picker" },
  { layer: "Forms", value: "react-hook-form" },
  { layer: "Auth & data", value: "Supabase (@supabase/ssr, supabase-js) — Postgres, Auth, Storage, RLS" },
  { layer: "Documents", value: "docx, puppeteer (Markdown → PDF script)" },
  { layer: "Email", value: "Resend" },
  { layer: "HTTP", value: "axios, node-fetch, form-data" },
];

const INTEGRATIONS = [
  { name: "Supabase", purpose: "Auth, Postgres, Storage buckets, Row Level Security" },
  { name: "Zoho Sign", purpose: "Embedded contract e-signature workflow" },
  { name: "Zoho WorkDrive", purpose: "Per-client document folders, provisioned when a client is marked Signed" },
  { name: "Zoho Bigin / CRM", purpose: "Client records; leads created from voice calls" },
  { name: "Retell", purpose: "Voice-AI webhook that creates/updates CRM leads" },
  { name: "Fireflies", purpose: "Meeting transcripts via webhook + GraphQL" },
  { name: "Anthropic (Claude)", purpose: "Meeting summary generation" },
  { name: "Resend", purpose: "Transactional email — verification codes, welcome, support" },
];

export default function DevStackPage() {
  const system = getSystemInfo();

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Tech Stack"
        description="What this application is built from, generated from package.json at build time."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Next.js" value={system.versions.next} />
        <Stat label="React" value={system.versions.react} />
        <Stat label="Node" value={system.versions.node} />
        <Stat
          label="Packages"
          value={manifest.counts.dependencies + manifest.counts.devDependencies}
          hint={`${manifest.counts.dependencies} runtime · ${manifest.counts.devDependencies} dev`}
        />
      </div>

      <Panel title="Stack by layer">
        {STACK.map((s) => (
          <Row key={s.layer} label={s.layer} mono={false}>
            {s.value}
          </Row>
        ))}
      </Panel>

      <Panel title="Third-party integrations" subtitle="External services this app depends on">
        {INTEGRATIONS.map((i) => (
          <Row key={i.name} label={i.name} mono={false}>
            {i.purpose}
          </Row>
        ))}
      </Panel>

      <Panel title="npm scripts">
        {Object.entries(manifest.scripts).map(([name, cmd]) => (
          <Row key={name} label={name}>
            {String(cmd)}
          </Row>
        ))}
      </Panel>

      <DependencyList
        dependencies={manifest.dependencies}
        devDependencies={manifest.devDependencies}
      />
    </div>
  );
}
