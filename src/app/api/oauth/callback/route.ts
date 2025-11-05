import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: "Missing 'code' query param from Zoho" }, { status: 400 });
    }

    const region = process.env.ZOHO_REGION || "com"; // e.g., com, eu, in
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri =
      process.env.ZOHO_REDIRECT_URI || `http://localhost:${process.env.PORT || "3000"}/api/oauth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Missing ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET in environment" },
        { status: 500 }
      );
    }

    // Exchange authorization code for access + refresh tokens
    const tokenUrl = `https://accounts.zoho.${region}/oauth/v2/token`;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: json?.error || "Zoho token exchange failed", details: json },
        { status: 400 }
      );
    }

    // json should contain: access_token, refresh_token, expires_in, token_type
    const { access_token, refresh_token, expires_in, token_type } = json;

    return NextResponse.json({
      message: "Zoho token exchange successful",
      access_token,
      refresh_token,
      expires_in,
      token_type,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}