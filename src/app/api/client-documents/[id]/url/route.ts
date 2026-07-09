import { NextResponse } from "next/server";
import { createAdminSupabaseClient, getUserAndProfile, isAdmin } from "@/lib/supabase-server";

export async function GET(req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  try {
    const { user } = await getUserAndProfile(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminSupabaseClient();
    const { data: doc, error } = await admin
      .from("client_documents")
      .select("id, client_user_id, file_path")
      .eq("id", params.id)
      .single();
    if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Allow owner or admin
    if (doc.client_user_id !== user.id) {
      if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bucket = process.env.SUPABASE_CLIENT_DOCS_BUCKET || "client-documents";
    const objectPath = String(doc.file_path || "").trim();
    if (!objectPath) return NextResponse.json({ error: "No file path" }, { status: 400 });

    const { data: signed, error: sErr } = await admin.storage
      .from(bucket)
      .createSignedUrl(objectPath, 300);
    if (sErr || !signed) return NextResponse.json({ error: sErr?.message || "Failed to sign" }, { status: 500 });

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to generate URL" }, { status: 500 });
  }
}
