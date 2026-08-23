import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DevSidebar from "@/components/dev/dev-sidebar";
import { getDeveloperContext } from "@/lib/dev/access";

export const dynamic = "force-dynamic";

/**
 * Developer-only shell. Middleware already redirects non-developers, but the
 * check is repeated here so the pages are safe even if middleware is bypassed
 * (direct RSC requests, matcher changes).
 */
export default async function DevLayout({ children }: { children: ReactNode }) {
  const { user, isDeveloper } = await getDeveloperContext();

  if (!user) redirect("/login");
  if (!isDeveloper) redirect("/mgdashboard");

  return (
    <div className="dev-console font-sans flex min-h-screen">
      <DevSidebar />
      <main className="flex-1 min-w-0 pt-14 md:pt-0 overflow-auto">{children}</main>
    </div>
  );
}
