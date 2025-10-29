import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📦 Zoho Webhook Received:", body);

    const eventType = body.event_type || "unknown";
    console.log("🔔 Event:", eventType);

    // Example: handle successful payments
    if (eventType === "payment_successful") {
      // Do something: update DB, send email, etc.
      console.log("✅ Payment successful for subscription:", body.data?.subscription?.subscription_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error processing Zoho webhook:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
