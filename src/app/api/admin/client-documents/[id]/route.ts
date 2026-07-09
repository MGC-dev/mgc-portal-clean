import { NextResponse } from "next/server";
import { createAdminSupabaseClient, requireAdmin } from "@/lib/supabase-server";

export async function DELETE(req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const bucket = process.env.SUPABASE_CLIENT_DOCS_BUCKET || "client-documents";

  try {
    const { data: doc, error: dErr } = await admin
      .from("client_documents")
      .select("id,file_path")
      .eq("id", params.id)
      .single();
    if (dErr || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const objectPath = String(doc.file_path || "");
    if (objectPath) {
      await admin.storage.from(bucket).remove([objectPath]);
    }

    const { error: delErr } = await admin.from("client_documents").delete().eq("id", params.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
