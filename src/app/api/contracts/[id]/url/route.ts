import { NextResponse } from "next/server";
import { createAdminSupabaseClient, getUserAndProfile, isAdmin } from "@/lib/supabase-server";

// Relax context typing for Next.js route validation compatibility
export async function GET(req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  const { user } = await getUserAndProfile(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const bucket = process.env.SUPABASE_CONTRACTS_BUCKET || "contracts";

  const { data: contract, error } = await admin
    .from("contracts")
    .select("id, client_user_id, file_url")
    .eq("id", params.id)
    .single();
  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  // Allow client owner or admin (match admin check with other admin APIs using profiles.role)
  if (contract.client_user_id !== user.id) {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const objectPath = String(contract.file_url || "").trim();
  if (!objectPath) {
    return NextResponse.json({ error: "No file path" }, { status: 400 });
  }

  // Generate a short-lived signed URL (15 minutes)
  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 15);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
