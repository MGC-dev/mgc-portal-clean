import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET /auth/logout
// Clears the server-side Supabase session (httpOnly cookies) and redirects to /login
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // Ignore errors; proceed with redirect
  }
  const redirectUrl = new URL("/login", request.url);
  return NextResponse.redirect(redirectUrl);
}