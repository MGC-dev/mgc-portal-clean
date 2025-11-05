import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { getZohoRequest } from "@/lib/zoho";

// Relax context typing for Next.js route validation compatibility
export async function GET(req: Request, context: any) {
  const { params } = (context || {}) as { params: { id: string } };
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: contract, error } = await admin
    .from("contracts")
    .select("id, client_user_id, status, zoho_request_id, title")
    .eq("id", params.id)
    .single();
    
  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  // Allow client owner or admin
  if (contract.client_user_id !== user.id) {
    const { data: roles } = await supabase
      .from("role_assignments")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"]);
    const isAdmin = Array.isArray(roles) && roles.length > 0;
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    let zohoStatus = null;
    let lastUpdated = null;

    // If we have a Zoho request ID, check the status
    if (contract.zoho_request_id) {
      try {
        const zohoResponse = await getZohoRequest(contract.zoho_request_id);
        const requestData = zohoResponse?.requests || zohoResponse;
        zohoStatus = requestData?.request_status?.toLowerCase();
        lastUpdated = requestData?.modified_time || requestData?.updated_time;

        // Update local status if Zoho shows completion
        if (zohoStatus === 'completed' && contract.status !== 'signed') {
          await admin
            .from("contracts")
            .update({ status: 'signed' })
            .eq("id", contract.id);
          contract.status = 'signed';
        }
      } catch (zohoError) {
        console.error(`Failed to fetch Zoho status for contract ${contract.id}:`, zohoError);
        // Continue with local status if Zoho check fails
      }
    }

    return NextResponse.json({
      contractId: contract.id,
      title: contract.title,
      status: contract.status,
      signed: contract.status === 'signed',
      zohoStatus,
      lastUpdated,
      hasZohoRequest: !!contract.zoho_request_id
    });
  } catch (error: any) {
    console.error(`Error checking contract status:`, error);
    return NextResponse.json(
      { error: "Failed to check contract status" }, 
      { status: 500 }
    );
  }
}