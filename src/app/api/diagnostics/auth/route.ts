import { NextResponse } from "next/server";

// GET /api/diagnostics/auth
// Posts an invalid password grant to the Supabase auth token endpoint with a short timeout
// to confirm responsiveness. Returns ok=false with details if unreachable or timed out.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
      { status: 500 }
    );
  }

  const endpoint = `${url.replace(/\/$/, "")}/auth/v1/token`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "password", email: "diagnostic@example.com", password: "x" }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    // Expect a 400/401 on invalid credentials; any response means endpoint is reachable
    if (resp.ok || [400, 401].includes(resp.status)) {
      return NextResponse.json({ ok: true, status: resp.status });
    }
    return NextResponse.json({ ok: false, status: resp.status }, { status: 502 });
  } catch (e: any) {
    const msg = `${e?.message || e}`;
    const isAbort = (e?.name || "") === "AbortError" || msg.includes("The operation was aborted");
    return NextResponse.json(
      { ok: false, error: isAbort ? "Timed out" : msg, endpoint },
      { status: isAbort ? 504 : 502 }
    );
  }
}