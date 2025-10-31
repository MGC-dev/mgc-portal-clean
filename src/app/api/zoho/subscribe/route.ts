import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

async function refreshZohoToken() {
  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!
    })
  });

  const data = await res.json();
  accessToken = data.access_token;
  return accessToken;
}

export async function POST(req: NextRequest) {
  try {
    const { customer, subscription } = await req.json();

    if (!customer?.email || !customer?.display_name) {
      return NextResponse.json(
        { error: "Missing customer name or email" },
        { status: 400 }
      );
    }

    const token = accessToken || (await refreshZohoToken());

    const planCode =
      subscription?.billing_cycle === "yearly"
        ? "generic_yearly"
        : "generic_monthly";

    const resZoho = await fetch(
      "https://subscriptions.zoho.com/api/v1/hostedpages/newsubscription",
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
          "X-com-zoho-subscriptions-organizationid":
            process.env.ZOHO_ORG_ID!
        },
        body: JSON.stringify({
          plan: { plan_code: planCode },
          customer,
          subscription: {
            setup_fee: subscription.amount,
          }
        })
      }
    );

    const data = await resZoho.json();

    if (data?.hostedpage?.url) {
      return NextResponse.json({ payment_url: data.hostedpage.url });
    }

    console.log("Zoho Error:", data);
    return NextResponse.json(
      { error: "Zoho returned an error", details: data },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
