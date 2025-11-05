import { NextResponse } from "next/server";
import { createAdminSupabaseClient, requireAdmin } from "@/lib/supabase-server";
import { createZohoRequest } from "@/lib/zoho";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const bucket = process.env.SUPABASE_CONTRACTS_BUCKET || "contracts";

  // Verify bucket exists
  const { data: bucketInfo, error: bucketErr } = await admin.storage.getBucket(bucket);
  if (bucketErr || !bucketInfo) {
    return NextResponse.json({ error: `Bucket not found: ${bucket}` }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  const clientUserId = String(form.get("client_user_id") || "").trim();
  const clientEmail = String(form.get("client_email") || "").trim();
  const file = form.get("file") as File | null;

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  // Resolve client id by email if not directly provided
  let resolvedClientId = clientUserId;
  let recipientEmail = clientEmail;
  let recipientName: string | undefined = undefined;
  if (!resolvedClientId) {
    if (!clientEmail) {
      return NextResponse.json({ error: "Provide client_user_id or client_email" }, { status: 400 });
    }
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id,email,full_name")
      .eq("email", clientEmail)
      .single();
    if (profErr || !profile) {
      return NextResponse.json({ error: `Client not found for email ${clientEmail}` }, { status: 404 });
    }
    resolvedClientId = profile.id as string;
    recipientEmail = profile.email as string;
    recipientName = (profile.full_name as string) || undefined;
  } else {
    // If client id provided, hydrate recipient info from profiles
    const { data: profile } = await admin
      .from("profiles")
      .select("email,full_name")
      .eq("id", resolvedClientId)
      .maybeSingle();
    recipientEmail = recipientEmail || (profile?.email as string);
    recipientName = profile?.full_name || undefined;
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = file.name || "contract.pdf";
  const objectPath = `${resolvedClientId}/${crypto.randomUUID()}-${filename}`;

  const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Create Zoho Sign request for the client
  let zohoRequestId: string | undefined;
  let zohoSignUrl: string | undefined;
  try {
    const { requestId, signUrl } = await createZohoRequest({
      file,
      title,
      recipientName: recipientName || recipientEmail || "Client",
      recipientEmail: recipientEmail,
      isEmbedded: true,
    });
    zohoRequestId = requestId;
    zohoSignUrl = signUrl;
  } catch (e: any) {
    console.error("[admin/contracts/upload] Zoho request creation failed:", e?.message || e);
    // We still create the contract with status 'sent', admin can retry Zoho later
  }

  const { data: inserted, error: insErr } = await admin
    .from("contracts")
    .insert({
      client_user_id: resolvedClientId,
      title,
      file_url: objectPath, // store storage path; URLs are generated on demand
      status: "sent",
      zoho_request_id: zohoRequestId || null,
      zoho_sign_url: zohoSignUrl || null,
    })
    .select("*")
    .single();
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ contract: inserted }, { status: 201 });
}