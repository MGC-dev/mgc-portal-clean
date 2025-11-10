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

    let query = supabase
      .from("resources")
      .select("id,title,description,category,file_url,access_level,created_at,client_user_id")
      .order("created_at", { ascending: false });

    if (isAdmin) {
      if (clientParam) {
        query = query.eq("client_user_id", clientParam);
      }
    } else {
      query = query.eq("client_user_id", user.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ resources: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list resources" }, { status: 500 });
  }
}