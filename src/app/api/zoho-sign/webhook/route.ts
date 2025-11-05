import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getZohoDocuments, downloadZohoDocument } from "@/lib/zoho";
import crypto from "crypto";

export const runtime = "nodejs";

// Verify Zoho webhook signature if secret is configured
function verifyZohoWebhook(req: Request, body: string): boolean {
  const webhookSecret = process.env.ZOHO_SIGN_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("[zoho-sign/webhook] No webhook secret configured, skipping verification");
    return true;
  }

  const signature = req.headers.get("x-zoho-sign-signature") || req.headers.get("x-signature");
  if (!signature) {
    console.error("[zoho-sign/webhook] Missing signature header");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");
    
    const providedSignature = signature.replace("sha256=", "");
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex")
    );

    if (!isValid) {
      console.error("[zoho-sign/webhook] Invalid signature");
    }
    
    return isValid;
  } catch (error) {
    console.error("[zoho-sign/webhook] Signature verification error:", error);
    return false;
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const admin = createAdminSupabaseClient();
    const bodyText = await req.text();
    
    // Verify webhook signature
    if (!verifyZohoWebhook(req, bodyText)) {
      console.error("[zoho-sign/webhook] Webhook verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(bodyText || "{}");
    } catch (parseError) {
      console.error("[zoho-sign/webhook] Failed to parse JSON body:", parseError);
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Log the webhook event for debugging
    console.log("[zoho-sign/webhook] Received webhook:", {
      event: body?.event || body?.event_type || body?.type,
      requestId: body?.request_id || body?.payload?.request_id,
      timestamp: new Date().toISOString()
    });

    // Try to detect completion status and request/document IDs
    const event: string | undefined = body?.event || body?.event_type || body?.type;
    const data: any = body?.payload || body?.data || body;
    const requestId: string | undefined =
      data?.request_id || body?.request_id || body?.requests?.request_id || data?.requests?.request_id;
    const documentId: string | undefined = data?.document_id || body?.document_id;
    
    // Check if this is a completion event
    const isCompletionEvent = event && (
      event.toLowerCase().includes("completed") ||
      event.toLowerCase().includes("signed") ||
      event === "REQUEST_COMPLETED" ||
      event === "DOCUMENT_SIGNED"
    );

    if (!requestId) {
      console.error("[zoho-sign/webhook] Missing request_id in webhook payload");
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    // Only process completion events to avoid unnecessary processing
    if (!isCompletionEvent) {
      console.log(`[zoho-sign/webhook] Ignoring non-completion event: ${event}`);
      return NextResponse.json({ ok: true, message: "Event ignored" });
    }

    // Find the contract by zoho_request_id
    const { data: contract, error: findErr } = await admin
      .from("contracts")
      .select("id, zoho_request_id, title, status")
      .eq("zoho_request_id", requestId)
      .single();
      
    if (findErr || !contract) {
      console.error(`[zoho-sign/webhook] Contract not found for request_id: ${requestId}`, findErr);
      return NextResponse.json({ error: "Contract not found for request_id" }, { status: 404 });
    }

    // Skip if already signed
    if (contract.status === "signed") {
      console.log(`[zoho-sign/webhook] Contract ${contract.id} already marked as signed`);
      return NextResponse.json({ ok: true, message: "Contract already signed" });
    }

    console.log(`[zoho-sign/webhook] Processing completion for contract: ${contract.id} (${contract.title})`);

    let resolvedDocumentId = documentId;
    // If no document ID, try to list documents and pick the first
    if (!resolvedDocumentId) {
      try {
        console.log(`[zoho-sign/webhook] No document ID provided, fetching document list for request: ${requestId}`);
        const docsPayload = await getZohoDocuments(requestId);
        const firstDoc = docsPayload?.documents?.[0] || docsPayload?.requests?.documents?.[0];
        resolvedDocumentId = firstDoc?.document_id || firstDoc?.id;
        
        if (resolvedDocumentId) {
          console.log(`[zoho-sign/webhook] Found document ID: ${resolvedDocumentId}`);
        } else {
          console.warn(`[zoho-sign/webhook] No documents found for request: ${requestId}`);
        }
      } catch (e) {
        console.error(`[zoho-sign/webhook] Failed to fetch documents for request ${requestId}:`, e);
      }
    }

    let signedFilePath: string | null = null;
    if (resolvedDocumentId) {
      try {
        console.log(`[zoho-sign/webhook] Downloading signed document: ${resolvedDocumentId}`);
        const blob = await downloadZohoDocument(requestId, resolvedDocumentId);
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const bucket = process.env.SUPABASE_SIGNED_CONTRACTS_BUCKET || "contracts-signed";
        const objectPath = `signed/${contract.id}.pdf`;
        
        console.log(`[zoho-sign/webhook] Uploading signed document to storage: ${bucket}/${objectPath}`);
        const { error: upErr } = await admin.storage
          .from(bucket)
          .upload(objectPath, buffer, { contentType: "application/pdf", upsert: true });
          
        if (upErr) {
          console.error(`[zoho-sign/webhook] Failed to upload signed document:`, upErr);
        } else {
          signedFilePath = objectPath;
          console.log(`[zoho-sign/webhook] Successfully stored signed document: ${objectPath}`);
        }
      } catch (e) {
        console.error("[zoho-sign/webhook] Failed to download/store signed PDF:", e);
      }
    } else {
      console.warn(`[zoho-sign/webhook] No document ID available, skipping document download`);
    }

    const updatePayload: any = {
      status: "signed",
      signed_at: new Date().toISOString(),
    };
    if (resolvedDocumentId) updatePayload.zoho_document_id = resolvedDocumentId;
    if (signedFilePath) updatePayload.signed_file_url = signedFilePath;

    console.log(`[zoho-sign/webhook] Updating contract ${contract.id} status to signed`);
    const { error: updErr } = await admin.from("contracts").update(updatePayload).eq("id", contract.id);
    
    if (updErr) {
      console.error(`[zoho-sign/webhook] Failed to update contract ${contract.id}:`, updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[zoho-sign/webhook] Successfully processed webhook for contract ${contract.id} in ${processingTime}ms`);
    
    return NextResponse.json({ 
      ok: true, 
      contractId: contract.id,
      documentId: resolvedDocumentId,
      signedFileStored: !!signedFilePath,
      processingTimeMs: processingTime
    });
  } catch (e: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[zoho-sign/webhook] Webhook handling failed after ${processingTime}ms:`, e);
    return NextResponse.json({ 
      error: e?.message || "Webhook handling failed",
      processingTimeMs: processingTime
    }, { status: 500 });
  }
}