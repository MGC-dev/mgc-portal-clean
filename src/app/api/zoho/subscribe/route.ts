import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

async function refreshZohoToken(): Promise<string> {
  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error("❌ Refresh token failed:", data);
    throw new Error("Refresh token failed");
  }

  accessToken = data.access_token;
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { customer, subscription } = await req.json();
    if (!subscription?.amount || !customer?.email) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    const token = accessToken || (await refreshZohoToken());

    const chargeReq = await fetch(
      "https://subscriptions.zoho.com/api/v1/hostedpages/charge",
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
          "X-com-zoho-subscriptions-organizationid":
            process.env.ZOHO_ORG_ID!,
        },
        body: JSON.stringify({
          customer,
          amount: subscription.amount,
          description: subscription.plan_name,
          currency_code: "USD",
        }),
      }
    );

    const data = await chargeReq.json();
    console.log("✅ Zoho response:", data);

    if (data.hostedpage?.url) {
      return NextResponse.json({ payment_url: data.hostedpage.url });
    }

    return NextResponse.json(
      { error: "Zoho returned no payment URL", details: data },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("❌ create-subscription error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
