// lib/zoho.ts
export async function refreshZohoToken() {
  const accountsBase = process.env.ZOHO_ACCOUNTS_BASE || "https://accounts.zoho.com";
  const res = await fetch(`${accountsBase}/oauth/v2/token`, {
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
    console.error("Failed to refresh Zoho token:", data);
    throw new Error("Failed to refresh Zoho token");
  }
  return data.access_token as string;
}
