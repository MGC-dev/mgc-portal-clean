import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { createZohoRequest, submitZohoRequest } from "@/lib/zoho";

export const runtime = "nodejs";

// Relax context typing to avoid Next.js route type validation issues across versions
export async function POST(_req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  // Require admin
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Align with middleware: check profiles.role for admin/super_admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = Boolean(profile?.role && ["admin", "super_admin"].includes(profile!.role!));
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const bucket = process.env.SUPABASE_CONTRACTS_BUCKET || "contracts";

  // Load contract
  const { data: contract, error: cErr } = await admin
    .from("contracts")
    .select("id,title,file_url,client_user_id,zoho_request_id,zoho_sign_url")
    .eq("id", params.id)
    .single();
  if (cErr || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (contract.zoho_request_id && contract.zoho_sign_url) {
    return NextResponse.json({ message: "Already linked", url: contract.zoho_sign_url });
  }
  if (!contract.file_url || !contract.client_user_id) {
    return NextResponse.json({ error: "Missing file or client for contract" }, { status: 400 });
  }

  // Fetch client profile for name/email
  const { data: clientProfile, error: pErr } = await admin
    .from("profiles")
    .select("id,full_name,email")
    .eq("id", contract.client_user_id)
    .single();
  if (pErr || !clientProfile) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }
  const recipientName = clientProfile.full_name || clientProfile.email || "Client";
  const recipientEmail = clientProfile.email;
  if (!recipientEmail) {
    return NextResponse.json({ error: "Client email missing" }, { status: 400 });
  }

  // Download original PDF from storage
  const objectPath = String(contract.file_url);
  const { data: fileRes, error: dlErr } = await admin.storage.from(bucket).download(objectPath);
  if (dlErr || !fileRes) {
    return NextResponse.json({ error: dlErr?.message || "Failed to read contract file" }, { status: 500 });
  }

  try {
    // Ensure the file we send to Zoho is a proper PDF with a filename
    const blob = fileRes as Blob;
    const filenameRaw = objectPath.split("/").pop() || "contract.pdf";
    const filename = filenameRaw.toLowerCase().endsWith(".pdf") ? filenameRaw : `${filenameRaw}.pdf`;

    // Validate PDF magic bytes to avoid Zoho file parsing errors (code 9039)
    const head = await blob.slice(0, 5).arrayBuffer();
    const headStr = Buffer.from(head).toString("ascii");
    if (!headStr.startsWith("%PDF")) {
      return NextResponse.json({
        error: "Contract file is not a valid PDF (missing %PDF header)",
        hint: "Please re-upload as a standard PDF (not password-protected) and retry linking.",
        details: { objectPath, filename },
      }, { status: 400 });
    }

    // Basic checks: encrypted PDFs or oversized files may be rejected
    const probeSize = Math.min(blob.size, 200 * 1024);
    const probe = await blob.slice(0, probeSize).arrayBuffer();
    const probeStr = Buffer.from(probe).toString("ascii");
    if (probeStr.includes("/Encrypt")) {
      return NextResponse.json({
        error: "Encrypted or password-protected PDF detected",
        hint: "Zoho Sign cannot process encrypted PDFs. Export an unencrypted copy and retry.",
        details: { filename },
      }, { status: 400 });
    }
    if (blob.size > 50 * 1024 * 1024) {
      return NextResponse.json({
        error: "PDF exceeds 50MB size limit",
        hint: "Reduce file size below 40–50MB range and retry.",
        details: { sizeMB: Math.round(blob.size / (1024 * 1024)) },
      }, { status: 400 });
    }

    // Construct a File with explicit type to help Zoho recognize PDF
    const buffer = await blob.arrayBuffer();
    const fileForZoho = new File([buffer], filename, { type: "application/pdf" });

    const { requestId, signUrl } = await createZohoRequest({
      file: fileForZoho,
      filename,
      title: contract.title,
      recipientName,
      recipientEmail,
      isEmbedded: true,
    });
    // Submit the request so signing can begin
    try {
      await submitZohoRequest(requestId);
    } catch (e) {
      // Ignore submit errors here; sign-url endpoint will attempt again and use embed token fallback
      console.warn("[admin/contracts/link-zoho] submit failed:", (e as any)?.message || e);
    }
    // Persist
    const { error: updErr } = await admin
      .from("contracts")
      .update({ zoho_request_id: requestId, zoho_sign_url: signUrl, status: "sent" })
      .eq("id", contract.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message || "Failed to update contract" }, { status: 500 });
    }
    return NextResponse.json({ message: "Linked", zoho_request_id: requestId, url: signUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Zoho link failed" }, { status: 500 });
  }
}