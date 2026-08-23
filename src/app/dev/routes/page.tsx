import { PageHeader, Stat } from "@/components/dev/ui";
import RouteList from "@/components/dev/route-list";
import manifest from "@/lib/dev/manifest.generated.json";

export const dynamic = "force-dynamic";

export default function DevRoutesPage() {
  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Routes & API"
        description="Every page and endpoint in the app, scanned from src/app at build time."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Pages" value={manifest.counts.pages} />
        <Stat label="API routes" value={manifest.counts.apis} />
        <Stat label="Handlers" value={manifest.counts.apiHandlers} hint="GET/POST/… exports" />
        <Stat
          label="Scanned"
          value={new Date(manifest.generatedAt).toLocaleDateString()}
          hint="Regenerate: npm run dev:manifest"
        />
      </div>

      <RouteList pages={manifest.routes.pages} apis={manifest.routes.apis} />
    </div>
  );
}
