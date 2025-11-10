import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

export async function DELETE(_req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure the document exists and is owned by the current user
    const { data: doc, error: dErr } = await supabase
      .from("client_documents")
      .select("id, client_user_id, file_path")
      .eq("id", params.id)
      .single();
    if (dErr || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (doc.client_user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = createAdminSupabaseClient();
    const bucket = process.env.SUPABASE_CLIENT_DOCS_BUCKET || "client-documents";

    // Remove file from storage (best-effort)
    const objectPath = String(doc.file_path || "");
    if (objectPath) {
      await admin.storage.from(bucket).remove([objectPath]);
    }

    // Remove DB record
    const { error: delErr } = await admin.from("client_documents").delete().eq("id", params.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}