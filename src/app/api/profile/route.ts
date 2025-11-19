import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,company_name,phone,created_at,updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Provide a minimal fallback if no profile row exists yet
    if (!profile) {
      return NextResponse.json({
        profile: {
          full_name: "",
          company_name: "",
          phone: "",
          email: user.email,
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch (_) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const full_name = String(payload?.full_name ?? "");
    const company_name = String(payload?.company_name ?? "");
    const phone = String(payload?.phone ?? "");

    const { error } = await supabase
      .from("profiles")
      .update({ full_name, company_name, phone })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}