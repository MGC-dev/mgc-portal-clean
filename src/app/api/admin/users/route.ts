import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    let admin;
    try {
      admin = createAdminSupabaseClient();
    } catch (envErr: any) {
      console.error("[admin/users] Service role client init error:", envErr);
      return NextResponse.json(
        { error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or URL missing" },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? 1);
    const perPage = Number(searchParams.get("perPage") ?? 50);

    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage,
    } as any);

    if (listError) {
      console.error("[admin/users] listUsers error:", listError);
      // Fallback: use profiles table only if listing auth users fails
      const { data: profsOnly, error: profOnlyErr } = await admin
        .from("profiles")
        .select(
          "id,email,full_name,company_name,phone,address,role,suspended,created_at,updated_at"
        );
      if (profOnlyErr) {
        console.error("[admin/users] profiles-only fallback error:", profOnlyErr);
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }
      const mergedFallback = (profsOnly || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        created_at: p.created_at,
        email_confirmed_at: null,
        phone: p.phone,
        app_metadata: null,
        user_metadata: null,
        banned_until: null,
        profile: p,
      }));
      return NextResponse.json({ users: mergedFallback, page, perPage });
    }

    const users = (usersData?.users ?? []) as any[];
    const ids = users.map((u) => u.id);
    let profiles: any[] = [];
    if (ids.length > 0) {
      const { data: profs, error: profErr } = await admin
        .from("profiles")
        .select("id,email,full_name,company_name,phone,address,role,suspended,created_at,updated_at")
        .in("id", ids);
      if (profErr) {
        console.error("[admin/users] profiles query error:", profErr);
      }
      if (!profErr && Array.isArray(profs)) profiles = profs;
    }

    const merged = users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at,
      phone: u.phone,
      app_metadata: u.app_metadata,
      user_metadata: u.user_metadata,
      banned_until: (u as any)?.banned_until ?? null,
      profile: profiles.find((p) => p.id === u.id) || null,
    }));

    return NextResponse.json({ users: merged, page, perPage });
  } catch (e: any) {
    console.error("[admin/users] unexpected error:", e);
    return NextResponse.json({ error: e?.message || "Failed to list users" }, { status: 500 });
  }
}