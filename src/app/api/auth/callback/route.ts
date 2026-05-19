import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#1a1a2e;color:#e94560">
        <h2>❌ Zoho Auth Error</h2><pre>${error}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#1a1a2e;color:#e94560">
        <h2>❌ No code received</h2>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Exchange code for tokens immediately
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "1000.KZM5RA2X1PPMJCVIX6SV5P383LK9CW",
    client_secret: "d89a68b03aa2fc71cdb32e48c253a55cc43b996c82",
    redirect_uri: "http://localhost:3000/api/auth/callback",
    code,
  });

  const tokenRes = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await tokenRes.json();

  if (data.error || !data.refresh_token) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#1a1a2e;color:#e94560">
        <h2>❌ Token Exchange Failed</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
        <p>Code used: <code>${code}</code></p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
    <head><title>Zoho Token Captured ✅</title></head>
    <body style="font-family:monospace;padding:2rem;background:#0f172a;color:#94a3b8;max-width:700px;margin:auto">
      <h2 style="color:#22c55e">✅ Refresh Token Captured!</h2>
      <p style="color:#f1f5f9">Copy the value below and add it to your <code>.env.local</code>:</p>

      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:1.5rem;margin:1rem 0">
        <p style="color:#64748b;margin:0 0 0.5rem">ZOHO_WORKDRIVE_REFRESH_TOKEN=</p>
        <p id="rt" style="color:#4ade80;word-break:break-all;font-size:1.1rem;margin:0;cursor:pointer" 
           onclick="navigator.clipboard.writeText(this.innerText);this.style.color='#22c55e';this.after(' ✓')">
          ${data.refresh_token}
        </p>
      </div>

      <p style="color:#64748b;font-size:0.85rem">Click the token above to copy it to your clipboard.</p>

      <h3 style="color:#94a3b8;margin-top:2rem">Full response:</h3>
      <pre style="background:#1e293b;padding:1rem;border-radius:8px;overflow:auto;color:#7dd3fc">${JSON.stringify(
        { access_token: data.access_token?.slice(0, 20) + "...", refresh_token: data.refresh_token, expires_in: data.expires_in, token_type: data.token_type },
        null,
        2
      )}</pre>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
