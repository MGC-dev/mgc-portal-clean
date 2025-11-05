import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// GET /api/support/recent
// Returns last 10 tickets for the authenticated user
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: [], error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e?.message || "Server error" }, { status: 500 });
  }
}