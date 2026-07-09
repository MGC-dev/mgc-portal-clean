import { NextResponse } from "next/server";
import { createAdminSupabaseClient, getUserAndProfile, isAdmin } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Require authenticated user; return only resources for that client unless admin.
  const { user, profile } = await getUserAndProfile(request);

  if (!user) {
    const { cookies: nextCookies } = await import("next/headers");
    const cookieStore = await nextCookies();
    console.error("[/api/resources] Unauthorized.");
    console.error("[/api/resources] Request URL:", request.url);
    console.error("[/api/resources] Request authorization present:", Boolean(request.headers.get("authorization")));
    console.error("[/api/resources] Request headers 'cookie':", request.headers.get("cookie"));
    console.error("[/api/resources] cookies().getAll():", cookieStore.getAll());
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine role
  const userIsAdmin = (await isAdmin(request)) || Boolean(profile?.role && ["admin", "super_admin"].includes(profile!.role!));

  try {
    const { searchParams } = new URL(request.url);
    const clientParam = searchParams.get("client_user_id");

    const admin = createAdminSupabaseClient();
    const base = admin
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });

    let data: any[] | null = null;
    let error: any = null;
    let res1: any;
    try {
      res1 = await (
        userIsAdmin
          ? clientParam
            ? base.eq("client_user_id", clientParam)
            : base
          : base.eq("client_user_id", user.id)
      );
      data = (res1.data as any[]) || [];
      error = res1.error || null;
    } catch (e: any) {
      const msg = String(e?.message || res1?.error?.message || "");
      const missingClientCol = /client_user_id.*does not exist/i.test(msg);
      if (missingClientCol) {
        if (userIsAdmin) {
          const resAll = await base;
          data = (resAll.data as any[]) || [];
          error = resAll.error || null;
        } else {
          data = [];
          error = null;
        }
      } else {
        error = e;
      }
    }

    // No fallback without client filter; rely on RLS to scope rows

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ resources: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list resources" }, { status: 500 });
  }
}
