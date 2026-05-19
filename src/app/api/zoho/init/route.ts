import { NextResponse } from "next/server";

export async function GET() {
  const clientId = "1000.KZM5RA2X1PPMJCVIX6SV5P383LK9CW";
  const redirectUri = "http://localhost:3000/api/auth/callback";
  const scope = "ZohoBigin.modules.ALL,WorkDrive.files.ALL,AaaServer.profile.READ";

  const authUrl =
    `https://accounts.zoho.com/oauth/v2/auth` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return NextResponse.redirect(authUrl);
}
