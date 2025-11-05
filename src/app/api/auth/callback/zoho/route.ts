import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    // You can log the code to the console to manually create a refresh token
    console.log("Received Zoho authorization code:", code);
    return NextResponse.json({
      message:
        "Zoho authorization code received. You can now use this code to generate a refresh token.",
      code,
    });
  }

  return NextResponse.json(
    { error: "No authorization code found" },
    { status: 400 }
  );
}