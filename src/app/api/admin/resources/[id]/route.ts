import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

function parseStorageUrl(url: string): { bucket: string; objectPath: string } | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const objIdx = parts.findIndex((p) => p === "object");
    if (objIdx === -1 || parts.length < objIdx + 3) return null;
    // formats: /storage/v1/object/public/<bucket>/<path...>
    //          /storage/v1/object/sign/<bucket>/<path...>
    const mode = parts[objIdx + 1]; // public | sign
    const bucket = parts[objIdx + 2];
    const objectPath = parts.slice(objIdx + 3).join("/");
    if (!bucket || !objectPath) return null;
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

// Relax context typing to avoid Next.js route type validation issues across versions
export async function DELETE(_req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  try {
    const adminOk = await isAdmin();
    if (!adminOk) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing resource id" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    const { data: resource, error: fetchErr } = await admin
      .from("resources")
      .select("id, file_url")
      .eq("id", id)
      .single();
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 404 });
    }

    let storageDeleted = false;
    if (resource?.file_url) {
      const parsed = parseStorageUrl(resource.file_url);
      if (parsed) {
        const { error: delErr } = await admin.storage
          .from(parsed.bucket)
          .remove([parsed.objectPath]);
        if (!delErr) storageDeleted = true;
      }
    }

    const { error: delRowErr } = await admin.from("resources").delete().eq("id", id);
    if (delRowErr) {
      return NextResponse.json({ error: delRowErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, storageDeleted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}