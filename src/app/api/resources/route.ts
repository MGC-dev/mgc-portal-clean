import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  // Require authenticated user to access resources
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client to avoid RLS inconsistencies in client
  const admin = createAdminSupabaseClient();
  try {
    const { data, error } = await admin
      .from("resources")
      .select("id,title,description,category,file_url,access_level,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ resources: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list resources" }, { status: 500 });
  }
}