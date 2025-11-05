import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { createZohoRequest, submitZohoRequest, getZohoSigningUrl } from "@/lib/zoho";

// Relax context typing for Next.js route validation compatibility
export const runtime = 'nodejs';

export async function POST(req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();
    const bucket = process.env.SUPABASE_CONTRACTS_BUCKET || "contracts";

    // Load contract
    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("id, client_user_id, title, file_url, status, zoho_request_id, zoho_sign_url")
      .eq("id", params.id)
      .single();
    if (cErr || !contract) {
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

    // If already linked and we have a URL, return it
    if (contract.zoho_request_id && contract.zoho_sign_url) {
      return NextResponse.json({ url: contract.zoho_sign_url, request_id: contract.zoho_request_id });
    }

    const objectPath = String(contract.file_url || "").trim();
    if (!objectPath) {
      return NextResponse.json({ error: "No contract file to sign" }, { status: 400 });
    }

    // Get recipient details
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("full_name,email")
      .eq("id", contract.client_user_id)
      .single();
    if (pErr || !profile?.email) {
      return NextResponse.json({ error: "Client email missing" }, { status: 400 });
    }

    // Download original file
    const { data: fileRes, error: dlErr } = await admin.storage.from(bucket).download(objectPath);
    if (dlErr || !fileRes) {
      return NextResponse.json({ error: dlErr?.message || "Failed to read contract file" }, { status: 500 });
    }

    // Validate PDF and construct a File with proper MIME type
    const sourceBlob = fileRes as Blob;
    const rawName = objectPath.split("/").pop() || "contract.pdf";
    const filename = rawName.toLowerCase().endsWith(".pdf") ? rawName : `${rawName}.pdf`;

    // Check PDF magic bytes
    const headBuf = await sourceBlob.slice(0, 5).arrayBuffer();
    const headStr = Buffer.from(headBuf).toString("ascii");
    if (!headStr.startsWith("%PDF")) {
      return NextResponse.json({
        error: "Contract file is not a valid PDF (missing %PDF header)",
        hint: "Please re-upload as a standard, unencrypted PDF and retry.",
        details: { objectPath, filename },
      }, { status: 400 });
    }

    // Reject encrypted or oversized PDFs
    const probeSize = Math.min(sourceBlob.size, 200 * 1024);
    const probeBuf = await sourceBlob.slice(0, probeSize).arrayBuffer();
    const probeStr = Buffer.from(probeBuf).toString("ascii");
    if (probeStr.includes("/Encrypt")) {
      return NextResponse.json({
        error: "Encrypted or password-protected PDF detected",
        hint: "Zoho Sign cannot process encrypted PDFs. Export an unencrypted copy and retry.",
        details: { filename },
      }, { status: 400 });
    }
    if (sourceBlob.size > 50 * 1024 * 1024) {
      return NextResponse.json({
        error: "PDF exceeds 50MB size limit",
        hint: "Reduce file size below 40–50MB and retry.",
        details: { sizeMB: Math.round(sourceBlob.size / (1024 * 1024)) },
      }, { status: 400 });
    }

    // Build a File with explicit application/pdf type to help Zoho
    const fileBuffer = await sourceBlob.arrayBuffer();
    const fileForZoho = new File([fileBuffer], filename, { type: "application/pdf" });

    // Create Zoho Sign request (embedded)
    const { requestId } = await createZohoRequest({
      file: fileForZoho,
      filename,
      title: contract.title,
      recipientName: profile.full_name || profile.email || "Client",
      recipientEmail: profile.email,
      isEmbedded: true,
    });

    // Submit to generate signing URL if needed
    try {
      await submitZohoRequest(requestId);
    } catch (e) {
      // Proceed; we can still attempt embed token
    }

    // Derive host for embed token
    const envHost = process.env.SIGN_EMBED_HOST || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    const requestOrigin = req.headers.get("origin");
    const requestHost = req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto");
    // Prefer explicit env origin to ensure it matches Zoho Allowed Domains, then request origin
    const proto = forwardedProto || (requestHost && /localhost|127\.0\.0\.1/i.test(requestHost) ? "http" : "https");
    const inferredHost = envHost || requestOrigin || (requestHost ? `${proto}://${requestHost}` : undefined);

    const url = await getZohoSigningUrl(requestId, inferredHost);

    // Persist
    const { error: updErr } = await admin
      .from("contracts")
      .update({ status: "sent", zoho_request_id: requestId, zoho_sign_url: url || null })
      .eq("id", contract.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (!url) {
      const details = {
        inferredHost: inferredHost || null,
        usedEnvHost: envHost || null,
        forwardedProto: forwardedProto || null,
        requestHost: requestHost || null,
        requestOrigin: requestOrigin || null,
      };
      const hint = !details.inferredHost
        ? "Host could not be inferred; set SIGN_EMBED_HOST to your site origin and whitelist it in Zoho Sign."
        : `Ensure the origin ${details.inferredHost} is added to Zoho Sign's Allowed Domains for Embedded Signing and SIGN_EMBED_HOST is set accordingly.`;

      return NextResponse.json(
        { error: "Signing URL not available yet", hint, request_id: requestId, details },
        { status: 202 }
      );
    }

    return NextResponse.json({ url, request_id: requestId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to start signing" }, { status: 500 });
  }
}