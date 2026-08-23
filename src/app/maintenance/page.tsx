import Image from "next/image";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEFAULT_MAINTENANCE_MESSAGE, normaliseMaintenanceRow, MAINTENANCE_KEY } from "@/lib/dev/maintenance-edge";

export const dynamic = "force-dynamic";

/**
 * Public maintenance page. Reads the message with the anon key (app_settings is
 * world-readable by design) so it works for signed-out visitors too.
 */
async function readMessage(): Promise<{ message: string; since: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { message: DEFAULT_MAINTENANCE_MESSAGE, since: null };

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
    return { message: state.message, since: state.updatedAt };
  } catch {
    return { message: DEFAULT_MAINTENANCE_MESSAGE, since: null };
  }
}

export default async function MaintenancePage() {
  const { message, since } = await readMessage();

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f9fb] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl overflow-hidden bg-white border border-[#e8eef1] flex items-center justify-center shadow-sm">
          <Image src="/logo.png" alt="MG Consulting" width={48} height={48} style={{ objectFit: "contain" }} />
        </div>

        <p className="mt-6 text-xs font-semibold tracking-widest text-[#264f5e]/60 uppercase">
          MG Consulting Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1a3340] tracking-tight">
          We&rsquo;ll be back shortly
        </h1>
        <p className="mt-3 text-sm text-[#4a6672] leading-relaxed">{message}</p>

        {since && (
          <p className="mt-4 text-xs text-[#6b8a96]">
            Maintenance started {new Date(since).toLocaleString()}
          </p>
        )}

        <div className="mt-8 rounded-2xl border border-[#e8eef1] bg-white p-4">
          <p className="text-xs text-[#6b8a96]">
            Need help in the meantime? Email{" "}
            <a
              href="mailto:mgcentral@mgconsultingfirm.com"
              className="text-[#264f5e] font-medium hover:underline"
            >
              mgcentral@mgconsultingfirm.com
            </a>
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 inline-block text-xs text-[#6b8a96] hover:text-[#264f5e] transition-colors"
        >
          Staff sign-in
        </Link>
      </div>
    </main>
  );
}
