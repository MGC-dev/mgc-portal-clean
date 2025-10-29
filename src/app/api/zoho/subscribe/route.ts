import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

// --- Helper: Refresh Token ---
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
  if (data.access_token) {
    accessToken = data.access_token;
    return data.access_token;
  }
  throw new Error("Failed to refresh Zoho access token");
}

// --- Main API handler ---
export async function POST(req: NextRequest) {
  try {
    const { planCode, customer } = await req.json();
    if (!planCode) {
      return NextResponse.json({ error: "Missing planCode" }, { status: 400 });
    }

    const token = accessToken || (await refreshZohoToken());

    // Create hosted page for subscription
    const res = await fetch(
      "https://subscriptions.zoho.com/api/v1/hostedpages/newsubscription",
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
          "X-com-zoho-subscriptions-organizationid": process.env.ZOHO_ORG_ID!,
        },
        body: JSON.stringify({
          plan: { plan_code: planCode },
          customer: {
            display_name: customer?.name || "Guest User",
            email: customer?.email || "guest@example.com",
          },
        }),
      }
    );

    const data = await res.json();
    if (data.hostedpage?.url) {
      return NextResponse.json({ url: data.hostedpage.url });
    }

    console.error("❌ Zoho API Error:", data);
    return NextResponse.json({ error: "Failed to create Zoho hosted page" }, { status: 500 });
  } catch (err) {
    console.error("❌ Subscription Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
