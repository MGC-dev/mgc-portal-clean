import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

// Relax context typing to avoid Next.js route type validation issues across versions
export async function DELETE(_req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  // Require admin
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = Boolean(profile?.role && ["admin", "super_admin"].includes(profile!.role!));
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const bucket = process.env.SUPABASE_CONTRACTS_BUCKET || "contracts";

  try {
    // Fetch the contract to know the storage path
    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("id,file_url")
      .eq("id", params.id)
      .single();
    if (cErr || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Attempt to remove file from storage if present
    let storageRemoved = true;
    const objectPath = contract.file_url ? String(contract.file_url) : null;
    if (objectPath) {
      const { error: rmErr } = await admin.storage.from(bucket).remove([objectPath]);
      if (rmErr) {
        // Log and proceed with DB deletion; file may already be gone
        console.warn("[admin/contracts] storage remove failed:", rmErr.message || rmErr);
        storageRemoved = false;
      }
    }

    // Delete the contract row
    const { error: delErr } = await admin
      .from("contracts")
      .delete()
      .eq("id", params.id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message || "Failed to delete contract" }, { status: 500 });
    }

    return NextResponse.json({ message: "Deleted", storageRemoved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}