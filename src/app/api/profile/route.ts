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
      .from("profiles")
      .select("full_name, company_name, phone, email")
      .eq("id", user.id)
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ profile: data || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch profile" }, { status: 500 });
  }
}