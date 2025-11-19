import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  // Require authenticated user; return only resources for that client unless admin.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = Boolean(profile?.role && ["admin", "super_admin"].includes(profile!.role!));

  try {
    const { searchParams } = new URL(request.url);
    const clientParam = searchParams.get("client_user_id");

    const base = supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });

    let data: any[] | null = null;
    let error: any = null;
    let res1: any;
    try {
      res1 = await (
        isAdmin
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
        if (isAdmin) {
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