import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  try {
    const { data, error } = await admin
      .from("contracts")
      .select("id,title,status,created_at,file_url,zoho_sign_url")
      .eq("client_user_id", user.id)
      .in("status", ["sent", "signed"]) // show active client contracts
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contracts: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list contracts" }, { status: 500 });
  }
}