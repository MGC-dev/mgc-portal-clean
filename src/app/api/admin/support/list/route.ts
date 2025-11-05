import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient, requireAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const { data: tickets, error } = await admin
      .from("support_tickets")
      .select("id, user_id, subject, description, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
    }

    // Hydrate basic user info
    const userIds = Array.from(new Set((tickets || []).map((t: any) => t.user_id).filter(Boolean)));
    let usersById: Record<string, { email?: string; full_name?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,email,full_name")
        .in("id", userIds);
      (profiles || []).forEach((p: any) => {
        usersById[p.id] = { email: p.email, full_name: p.full_name };
      });
    }

    const rows = (tickets || []).map((t: any) => ({
      id: t.id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      user: {
        id: t.user_id,
        email: usersById[t.user_id]?.email || undefined,
        full_name: usersById[t.user_id]?.full_name || undefined,
      },
    }));

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error", data: [] }, { status: 500 });
  }
}