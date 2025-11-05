import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

// Optional: verify signature using CALENDLY_WEBHOOK_SIGNING_KEY if set
function verifySignature(_req: Request): boolean {
  // Implement if you add CALENDLY_WEBHOOK_SIGNING_KEY; skipping in dev
  return true;
}

export async function POST(req: Request) {
  try {
    if (!verifySignature(req)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();
    const body = await req.json();
    const eventType: string | undefined = body?.event;
    const payload: any = body?.payload ?? {};

    // Try to pull scheduled event details
    const scheduled = payload?.scheduled_event || payload?.event || payload;
    const start = scheduled?.start_time || scheduled?.start_time_utc || scheduled?.startTime;
    const end = scheduled?.end_time || scheduled?.end_time_utc || scheduled?.endTime;
    const title = scheduled?.name || scheduled?.event_type?.name || "Calendly Event";
    const inviteeEmail = payload?.invitee?.email || payload?.email || scheduled?.invitees?.[0]?.email;
    const notes = scheduled?.location || scheduled?.description || undefined;

    if (!start || !end || !inviteeEmail) {
      return NextResponse.json(
        { error: "Missing required fields in webhook payload" },
        { status: 400 }
      );
    }

    const status: "scheduled" | "completed" | "cancelled" | "rescheduled" =
      eventType?.includes("canceled") ? "cancelled" : "scheduled";

    // Ensure a profile exists for the invitee email, creating if needed
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", inviteeEmail)
      .maybeSingle();

    let attendeeId = profile?.id as string | undefined;
    if (!attendeeId) {
      const { data: inserted, error: profileErr } = await admin
        .from("profiles")
        .insert({ email: inviteeEmail, role: "client" })
        .select("id")
        .single();
      if (profileErr) {
        return NextResponse.json(
          { error: `Failed to ensure profile: ${profileErr.message}` },
          { status: 500 }
        );
      }
      attendeeId = inserted?.id;
    }

    // Deduplicate: skip if an appointment with same attendee, start_time and title exists
    const { data: existing } = await admin
      .from("appointments")
      .select("id")
      .eq("attendee_user_id", attendeeId)
      .eq("start_time", start)
      .eq("title", title)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await admin.from("appointments").insert({
        attendee_user_id: attendeeId,
        title,
        start_time: start,
        end_time: end,
        notes,
        status,
      });
      if (insertErr) {
        return NextResponse.json(
          { error: `Failed to insert appointment: ${insertErr.message}` },
          { status: 500 }
        );
      }
    } else if (status === "cancelled") {
      await admin
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", existing.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}