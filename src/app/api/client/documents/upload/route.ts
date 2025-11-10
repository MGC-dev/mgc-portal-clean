import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const title = (form.get("title") as string) || "";
    const description = (form.get("description") as string) || null;
    const file = form.get("file") as File | null;

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!file || file.size === 0) return NextResponse.json({ error: "File is required" }, { status: 400 });

    const bucket = process.env.SUPABASE_CLIENT_DOCS_BUCKET || "client-documents";

    const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `${user.id}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const payload = {
      client_user_id: user.id,
      title,
      description,
      file_path: objectPath,
      status: "submitted" as const,
    };

    const { data, error } = await supabase
      .from("client_documents")
      .insert(payload)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ document: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}