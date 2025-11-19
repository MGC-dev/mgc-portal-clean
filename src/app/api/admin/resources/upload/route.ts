import { NextResponse } from "next/server";
import { createAdminSupabaseClient, getUserAndProfile, isAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Ensure requester is an admin
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { user } = await getUserAndProfile();
  const form = await req.formData();

  const title = (form.get("title") as string) || "";
  const description = (form.get("description") as string) || null;
  const category = (form.get("category") as string) || "document";
  const externalUrl = (form.get("external_url") as string) || null;
  const file = form.get("file") as File | null;
  const clientUserId = (form.get("client_user_id") as string) || "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!clientUserId) {
    return NextResponse.json({ error: "client_user_id is required" }, { status: 400 });
  }

    const adminClient = createAdminSupabaseClient();
    const bucket = process.env.SUPABASE_RESOURCES_BUCKET || "resources";

    // Verify bucket exists via Storage API
    const { data: bucketInfo, error: bucketErr } = await adminClient.storage.getBucket(bucket);
    if (bucketErr || !bucketInfo) {
      return NextResponse.json({ error: `Bucket not found: ${bucket}` }, { status: 404 });
    }
    let fileUrl: string | null = null;

    if (file && file.size > 0) {
      const originalName = file.name || "upload";
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${user?.id || "admin"}/${Date.now()}_${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(objectPath, buffer, {
          contentType: file.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }

      if (bucketInfo.public) {
        const { data: pub } = adminClient.storage.from(bucket).getPublicUrl(objectPath);
        fileUrl = pub.publicUrl;
      } else {
        const { data: signed, error: signErr } = await adminClient.storage
          .from(bucket)
          .createSignedUrl(objectPath, 60 * 60 * 24 * 7); // 7 days
        if (signErr) {
          return NextResponse.json({ error: signErr.message }, { status: 400 });
        }
        fileUrl = signed?.signedUrl || null;
      }
    } else if (externalUrl) {
      fileUrl = externalUrl;
    }

    const payload = {
      title,
      description,
      category,
      file_url: fileUrl,
      created_by: user?.id || null,
      client_user_id: clientUserId,
    };

    let { data, error } = await adminClient
      .from("resources")
      .insert(payload)
      .select("*")
      .single();

    // Do not fallback to inserting without client_user_id; require assignment

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}