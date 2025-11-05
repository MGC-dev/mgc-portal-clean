import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

// Relax context typing for Next.js route validation compatibility
export async function GET(_req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const bucket = process.env.SUPABASE_SIGNED_CONTRACTS_BUCKET || "contracts-signed";

  const { data: contract, error } = await admin
    .from("contracts")
    .select("id, client_user_id, signed_file_url")
    .eq("id", params.id)
    .single();
  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  // Allow client owner or admin
  if (contract.client_user_id !== user.id) {
    const { data: roles } = await supabase
      .from("role_assignments")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"]);
    const isAdmin = Array.isArray(roles) && roles.length > 0;
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const objectPath = String(contract.signed_file_url || "").trim();
  if (!objectPath) {
    return NextResponse.json({ error: "No signed file available" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 30);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}