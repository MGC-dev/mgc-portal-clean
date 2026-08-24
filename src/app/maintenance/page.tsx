import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_MAINTENANCE_MESSAGE, normaliseMaintenanceRow, MAINTENANCE_KEY } from "@/lib/dev/maintenance-edge";

export const dynamic = "force-dynamic";

/**
 * Public maintenance page. Reads state with the anon key (app_settings is
 * world-readable by design) so it works for signed-out visitors too.
 *
 * `enabled` fails open to false (same convention as the middleware's edge
 * read) so a lookup error never strands a visitor on this page.
 */
async function readState(): Promise<{ enabled: boolean; message: string; since: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE, since: null };

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });
    const { data } = await supabase
      .from("app_settings")
      .select("value,updated_at,updated_by")
      .eq("key", MAINTENANCE_KEY)
      .maybeSingle();

    const state = normaliseMaintenanceRow(data);
    return { enabled: state.enabled, message: state.message, since: state.updatedAt };
  } catch {
    return { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE, since: null };
  }
}

export default async function MaintenancePage() {
  const { enabled, message, since } = await readState();

  // Maintenance mode is off — this page has nothing to show. Bounce
  // straight back to the home page instead of leaving it visitable.
  if (!enabled) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#2a4457] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto h-16 w-16 flex items-center justify-center">
          <Image src="/logo.png" alt="MG Consulting" width={48} height={48} style={{ objectFit: "contain" }} />
        </div>

        <p className="mt-6 text-xs font-semibold tracking-widest text-white/50 uppercase">
          MG Consulting Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white tracking-tight">
          We&rsquo;ll be back shortly
        </h1>
        <p className="mt-3 text-sm text-white/70 leading-relaxed">{message}</p>

        {since && (
          <p className="mt-4 text-xs text-white/50">
            Maintenance started {new Date(since).toLocaleString()}
          </p>
        )}
      </div>
    </main>
  );
}
