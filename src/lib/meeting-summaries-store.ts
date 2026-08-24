/**
 * Persistence for the structured meeting summary that the portal renders.
 *
 * The .docx in WorkDrive stays the deliverable; this table is the readable copy
 * so a client can read the summary in the portal without downloading anything.
 * Writes use the service-role client (the webhook has no user session) and never
 * throw: failing to save the readable copy must not fail a delivery that already
 * succeeded.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import type { MeetingSummary } from "@/lib/meeting-summary";

export type StoredMeetingSummary = {
  transcript_id: string;
  client_email: string;
  meeting_title: string | null;
  headline: string | null;
  meeting_date: string | null;
  duration_label: string | null;
  attendees: string[];
  overview: string | null;
  key_points: string[];
  decisions: string[];
  action_items: { owner: string; task: string; due: string }[];
  next_steps: string[];
  file_name: string | null;
};

export async function saveMeetingSummary(input: {
  transcriptId: string;
  clientEmail: string;
  meetingTitle: string;
  meetingDateIso: string | null;
  durationLabel: string;
  attendees: string[];
  fileName: string;
  summary: MeetingSummary;
}): Promise<void> {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("meeting_summaries").upsert(
      {
        transcript_id: input.transcriptId,
        client_email: input.clientEmail.trim().toLowerCase(),
        meeting_title: input.meetingTitle,
        headline: input.summary.headline,
        meeting_date: input.meetingDateIso,
        duration_label: input.durationLabel,
        attendees: input.attendees,
        overview: input.summary.overview,
        key_points: input.summary.key_points,
        decisions: input.summary.decisions,
        action_items: input.summary.action_items,
        next_steps: input.summary.next_steps,
        file_name: input.fileName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "transcript_id,client_email" }
    );

    if (error) throw new Error(error.message);
  } catch (e: any) {
    // The document is already in the client's WorkDrive at this point; losing
    // the readable copy is a degradation, not a failed delivery.
    console.error("[meeting-summaries] Failed to save summary:", e?.message || e);
  }
}

/** Summaries for one client, newest meeting first. */
export async function listMeetingSummariesForClient(
  clientEmail: string
): Promise<StoredMeetingSummary[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("meeting_summaries")
    .select(
      "transcript_id,client_email,meeting_title,headline,meeting_date,duration_label,attendees,overview,key_points,decisions,action_items,next_steps,file_name"
    )
    .eq("client_email", clientEmail.trim().toLowerCase())
    .order("meeting_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StoredMeetingSummary[];
}
