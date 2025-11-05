import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET /api/diagnostics/supabase
// Checks connectivity to Supabase using anon client with a short timeout.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    // Race a lightweight auth call against a timeout
    const res = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);

    // If we got here without throwing, connectivity is OK
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = `${e?.message || e}`;
    const isTimeout = msg.includes("timeout");
    const status = isTimeout ? 504 : 502;
    return NextResponse.json(
      {
        ok: false,
        error: isTimeout ? "Supabase request timed out" : msg || "Supabase connectivity failed",
        supabaseUrl: url,
      },
      { status }
    );
  }
}