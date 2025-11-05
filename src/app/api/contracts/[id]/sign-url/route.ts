import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { getZohoSigningUrl } from "@/lib/zoho";

// Relax context typing for Next.js route validation compatibility
export const runtime = 'nodejs';

export async function GET(req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: contract, error } = await admin
    .from("contracts")
    .select("id, client_user_id, zoho_request_id, zoho_sign_url")
    .eq("id", params.id)
    .single();
  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  // Allow client owner or admin (align with admin APIs using profiles.role)
  if (contract.client_user_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = Boolean(profile?.role && ["admin", "super_admin"].includes(profile!.role!));
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // If already stored, return
  if (contract.zoho_sign_url) {
    return NextResponse.json({ url: contract.zoho_sign_url });
  }

  if (!contract.zoho_request_id) {
    return NextResponse.json({ error: "No Zoho request linked to this contract" }, { status: 404 });
  }

  try {
    // Derive host for embedtoken call if needed
    const envHost = process.env.SIGN_EMBED_HOST || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    const requestOrigin = req.headers.get("origin");
    const requestHost = req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto");
    // Prefer explicit env origin to ensure it matches Zoho Allowed Domains, then request origin
    const proto = forwardedProto || (requestHost && /localhost|127\.0\.0\.1/i.test(requestHost) ? "http" : "https");
    const inferredHost = envHost || requestOrigin || (requestHost ? `${proto}://${requestHost}` : undefined);

    const url = await getZohoSigningUrl(contract.zoho_request_id, inferredHost);
    if (!url) {
      // Provide actionable diagnostics to help resolve common embed issues
      const details = {
        inferredHost: inferredHost || null,
        usedEnvHost:
          process.env.SIGN_EMBED_HOST || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || null,
        originHeader: requestOrigin || null,
        hostHeader: requestHost || null,
        forwardedProto: forwardedProto || null,
      };
      const hint = !details.inferredHost
        ? "Host could not be inferred; set SIGN_EMBED_HOST to your site origin and whitelist it in Zoho Sign."
        : `Ensure the origin ${details.inferredHost} is added to Zoho Sign's Allowed Domains for Embedded Signing and SIGN_EMBED_HOST is set accordingly.`;

      return NextResponse.json(
        { error: "Zoho signing URL not available yet", hint, details },
        { status: 404 }
      );
    }

    // Store the URL for future use
    const { error: updErr } = await admin
      .from("contracts")
      .update({ zoho_sign_url: url })
      .eq("id", contract.id);
    if (updErr) {
      // Return the URL anyway
      return NextResponse.json({ url });
    }
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch Zoho signing URL" }, { status: 500 });
  }
}