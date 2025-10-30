// app/api/zoho/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Zoho webhook:", JSON.stringify(body));

    // You may want to validate a secret header if you set one in Zoho
    // e.g. const secret = req.headers.get("x-zoho-secret");
    // if (secret !== process.env.ZOHO_WEBHOOK_SECRET) return NextResponse.json({}, { status: 401 });

    const event = body.event || body.event_type || null;
    // Example: subscription created or payment succeeded
    if (event?.includes("payment_succeeded") || event === "payment_successful" || event === "invoice.payment_succeeded") {
      // Extract relevant details
      const subscriptionId = body.data?.subscription?.subscription_id || body.data?.invoice?.subscription_id;
      const amount = body.data?.payment?.amount || body.data?.invoice?.amount;
      // TODO: update your DB: mark order/subscription paid
      console.log("Payment succeeded:", { subscriptionId, amount });
    }

    // Reply 200 quickly
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
