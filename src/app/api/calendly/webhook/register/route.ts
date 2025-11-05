import { NextResponse } from "next/server";

export async function POST() {
  try {
    const token = process.env.CALENDLY_API_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!token) {
      return NextResponse.json(
        { error: "CALENDLY_API_TOKEN not set" },
        { status: 500 }
      );
    }
    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL not set (use public https URL)" },
        { status: 500 }
      );
    }

    // Get current user
    const whoRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!whoRes.ok) {
      return NextResponse.json(
        { error: `Calendly users/me failed: ${whoRes.status}` },
        { status: whoRes.status }
      );
    }
    const who = await whoRes.json();
    const userUri = who?.resource?.uri;
    if (!userUri) {
      return NextResponse.json(
        { error: "No user URI returned by Calendly" },
        { status: 500 }
      );
    }

    const callbackUrl = `${siteUrl.replace(/\/$/, "")}/api/calendly/webhook`;
    const subRes = await fetch("https://api.calendly.com/webhook_subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: callbackUrl,
        events: ["invitee.created", "invitee.canceled"],
        scope: "user",
        user: userUri,
      }),
    });
    const result = await subRes.json();
    if (!subRes.ok) {
      return NextResponse.json(
        { error: result?.error || `Webhook subscribe failed: ${subRes.status}` },
        { status: subRes.status }
      );
    }

    return NextResponse.json({ ok: true, subscription: result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}