import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(_req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: doc, error } = await supabase
      .from("client_documents")
      .select("id, client_user_id, file_path")
      .eq("id", params.id)
      .single();
    if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Allow owner or admin
    if (doc.client_user_id !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const isAdmin = Boolean(profile?.role && ["admin", "super_admin"].includes(profile!.role!));
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
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