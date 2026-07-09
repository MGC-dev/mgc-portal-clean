import { NextResponse } from "next/server";
import { createAdminSupabaseClient, requireAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("client_documents")
    .select(`
      id,
      title,
      description,
      status,
      created_at,
      client_user_id,
      file_path,
      client_profile:profiles!client_user_id(email,full_name)
    `)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ documents: data || [] });
}
