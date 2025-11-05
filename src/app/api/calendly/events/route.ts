import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    const token = process.env.CALENDLY_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { data: [], error: "Calendly API token not configured" },
        { status: 501 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { data: [], error: "Missing 'email' query parameter" },
        { status: 400 }
      );
    }

    // Primary query: filter directly by invitee_email (best when supported).
    const primaryUrl = `https://api.calendly.com/scheduled_events?invitee_email=${encodeURIComponent(
      email
    )}&status=active`;

    const res = await fetch(primaryUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    let events: any[] = [];
    if (res.ok) {
      const json = await res.json();
      events = Array.isArray(json?.collection) ? json.collection : [];
    } else {
      // Fallback path: fetch events for the token user and filter by invitee email.
      // This helps when invitee_email filter is unavailable or if Calendly scopes differ.
      const whoRes = await fetch("https://api.calendly.com/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (whoRes.ok) {
        const who = await whoRes.json();
        const userUri = who?.resource?.uri;
        if (userUri) {
          const userEventsUrl = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(
            userUri
          )}&status=active`;
          const evRes = await fetch(userEventsUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (evRes.ok) {
            const evJson = await evRes.json();
            const all = Array.isArray(evJson?.collection) ? evJson.collection : [];
            // Filter by invitee email
            events = all.filter((ev: any) => {
              const invitees = ev?.invitees || ev?.tracking || [];
              const candidateEmails: string[] = [];
              if (Array.isArray(invitees)) {
                invitees.forEach((i: any) => {
                  if (i?.email) candidateEmails.push(String(i.email).toLowerCase());
                });
              }
              const payloadEmail = String(email).toLowerCase();
              return candidateEmails.includes(payloadEmail);
            });
          }
        }
      }
    }

    // Normalize to our Appointment-like shape
    const normalized = events.map((ev: any) => {
      const start = ev?.start_time || ev?.start_time_utc || ev?.startTime;
      const end = ev?.end_time || ev?.end_time_utc || ev?.endTime;
      const title = ev?.name || ev?.event_type?.name || "Calendly Event";
      const id = ev?.uri || ev?.uuid || `${start}-${title}`;
      const status = (ev?.status || "active").toLowerCase();
      const mappedStatus =
        status === "canceled" ? "cancelled" : status === "completed" ? "completed" : "scheduled";

      return {
        id: `cal-${id}`,
        attendee_user_id: "calendly",
        provider_user_id: undefined,
        company_id: undefined,
        start_time: start,
        end_time: end,
        status: mappedStatus,
        notes: ev?.location || ev?.description || undefined,
        title,
        created_at: ev?.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({ data: normalized, error: null }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { data: [], error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}