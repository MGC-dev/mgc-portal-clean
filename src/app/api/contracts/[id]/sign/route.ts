import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

// Relax context typing for Next.js route validation compatibility
export async function POST(req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const bucket = process.env.SUPABASE_CONTRACTS_BUCKET || "contracts";

  const { data: contract, error } = await admin
    .from("contracts")
    .select("id, client_user_id")
    .eq("id", params.id)
    .single();
  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (contract.client_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const dataUrl = String(body?.dataUrl || "");
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Expected PNG data URL" }, { status: 400 });
  }
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const signaturePath = `signatures/${params.id}.png`;

  const { error: upErr } = await admin.storage
    .from(bucket)
    .upload(signaturePath, buffer, { contentType: "image/png", upsert: true });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { error: updErr } = await admin
    .from("contracts")
    .update({ status: "signed", signed_at: new Date().toISOString(), signature_path: signaturePath })
    .eq("id", params.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}