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
    console.error("Refresh token failed:", data);
    throw new Error("Refresh token failed");
  }

  accessToken = data.access_token;
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { customer, subscription } = await req.json();

    if (!customer?.email || !customer?.display_name) {
      return NextResponse.json(
        { error: "Customer name and email required" },
        { status: 400 }
      );
    }

    const token = accessToken || (await refreshZohoToken());

    const planCode =
      subscription.billing_cycle === "yearly"
        ? "generic_yearly"
        : "generic_monthly";

    const zohoRes = await fetch(
      "https://subscriptions.zoho.com/api/v1/hostedpages/newsubscription",
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
          "X-com-zoho-subscriptions-organizationid": process.env.ZOHO_ORG_ID!,
        },
        body: JSON.stringify({
          customer: {
            display_name: customer.display_name,
            email: customer.email,
          },
          plan: {
            plan_code: "basic_test",
          },
        }),
      }
    );

    const data = await zohoRes.json();
    console.log("✅ Zoho Response:", data);

    if (data.hostedpage?.url) {
      return NextResponse.json({
        payment_url: data.hostedpage.url,
      });
    }

    return NextResponse.json(
      { error: "Zoho did not return a payment URL", details: data },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("create-subscription error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
