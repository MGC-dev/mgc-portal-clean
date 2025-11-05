import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin using profiles.role (matches middleware behavior)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = Boolean(profile?.role && ["admin", "super_admin"].includes(profile!.role!));
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  
  try {
    // Fetch contracts with client profile information
    const { data: contracts, error } = await admin
      .from("contracts")
      .select(`
        id,
        title,
        status,
        created_at,
        client_user_id,
        file_url,
        zoho_request_id,
        zoho_sign_url,
        zoho_document_id,
        signed_file_url,
        client_profile:profiles!client_user_id(email,full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to flatten client information
    const transformedContracts = (contracts || []).map((contract: any) => ({
      id: contract.id,
      title: contract.title,
      status: contract.status,
      created_at: contract.created_at,
      client_user_id: contract.client_user_id,
      file_url: contract.file_url,
      zoho_request_id: contract.zoho_request_id,
      zoho_sign_url: contract.zoho_sign_url,
      zoho_document_id: contract.zoho_document_id,
      signed_file_url: contract.signed_file_url,
      client_profile: contract.client_profile,
      client_email: contract.client_profile?.email || null,
    }));

    return NextResponse.json({ contracts: transformedContracts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch contracts" }, { status: 500 });
  }
}