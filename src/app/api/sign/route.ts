import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createZohoRequest, getZohoSigningUrl } from "../../../lib/zoho";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const recipientName = user.user_metadata.full_name || "Valued Customer";
    const recipientEmail = user.email as string;

    if (!file || !title) {
      return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
    }

    // Step 1 & 2: Upload document and create signing request
    const { requestId } = await createZohoRequest({
      file,
      title,
      recipientName,
      recipientEmail,
      isEmbedded: true,
    });

    // Step 3 & 4: Generate and get the signing URL
    const signUrl = await getZohoSigningUrl(requestId, req.headers.get("origin") || undefined);

    if (!signUrl) {
      return NextResponse.json({ error: "Could not get signing URL" }, { status: 500 });
    }

    // Step 5: Pass URL to client
    return NextResponse.json({ signUrl });
  } catch (error) {
    console.error("Zoho signing error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to create Zoho signing request", details: errorMessage }, { status: 500 });
  }
}