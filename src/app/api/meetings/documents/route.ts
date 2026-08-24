import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromBigin, listWorkDriveFolder, clientSafeZohoMessage, ZohoAuthError } from "@/lib/zoho-workdrive";
import { MEETINGS_FOLDER_NAME } from "@/lib/meetings-folder";
import { listMeetingSummariesForClient, type StoredMeetingSummary } from "@/lib/meeting-summaries-store";

export const dynamic = "force-dynamic";

/** Documents are named "YYYY-MM-DD Title (transcriptId).docx". */
function transcriptIdFromFileName(name: string): string | null {
  return name.match(/\(([^()]+)\)\.docx$/i)?.[1] ?? null;
}

function toClientSummary(row: StoredMeetingSummary) {
  return {
    headline: row.headline,
    overview: row.overview,
    keyPoints: row.key_points ?? [],
    decisions: row.decisions ?? [],
    actionItems: row.action_items ?? [],
    nextSteps: row.next_steps ?? [],
    attendees: row.attendees ?? [],
    durationLabel: row.duration_label,
    meetingDate: row.meeting_date,
  };
}

/** Meeting summary documents for the signed-in client, with readable content. */
export async function GET() {
  let email: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    email = user.email;

    // The stored summaries are what the portal renders; WorkDrive supplies the
    // downloadable file. Read summaries first so they can still be shown if
    // WorkDrive is unreachable.
    const summaries = await listMeetingSummariesForClient(email).catch((e) => {
      console.error("Meeting summaries read failed:", e);
      return [] as StoredMeetingSummary[];
    });
    const summaryByTranscript = new Map(summaries.map((s) => [s.transcript_id, s]));

    const rootFolderId = await getClientFolderIdFromBigin(email);
    if (!rootFolderId) {
      return NextResponse.json({ documents: [] });
    }

    const rootItems = await listWorkDriveFolder(rootFolderId);
    const meetingsFolder = rootItems.find(
      (item: any) =>
        item.is_folder && String(item.name).toLowerCase() === MEETINGS_FOLDER_NAME.toLowerCase()
    );

    // No folder yet just means no meeting has been summarised for this client.
    if (!meetingsFolder) {
      return NextResponse.json({ documents: [] });
    }

    const files = await listWorkDriveFolder(meetingsFolder.id);
    const documents = files
      .filter((f: any) => !f.is_folder)
      .map((f: any) => {
        const transcriptId = transcriptIdFromFileName(String(f.name));
        const summary = transcriptId ? summaryByTranscript.get(transcriptId) : undefined;
        return {
          id: f.id,
          name: f.name,
          size: f.size,
          modifiedTime: f.modified_time,
          // Absent for documents delivered before summaries were stored — those
          // stay download-only rather than disappearing.
          summary: summary ? toClientSummary(summary) : null,
        };
      })
      .sort((a: any, b: any) => (b.modifiedTime || 0) - (a.modifiedTime || 0));

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error("Meeting documents error:", error);

    // WorkDrive is down but the summaries are ours — show them read-only rather
    // than an error, so the client can still read what was sent to them.
    if (email) {
      try {
        const summaries = await listMeetingSummariesForClient(email);
        if (summaries.length > 0) {
          return NextResponse.json({
            documents: summaries.map((s) => ({
              id: null,
              name: s.file_name ?? `${s.headline ?? "Meeting"}.docx`,
              size: 0,
              modifiedTime: s.meeting_date ? new Date(s.meeting_date).getTime() : null,
              summary: toClientSummary(s),
            })),
            downloadsUnavailable: true,
          });
        }
      } catch {
        // fall through to the original error
      }
    }

    return NextResponse.json(
      { error: clientSafeZohoMessage(error) },
      { status: error instanceof ZohoAuthError && error.rateLimited ? 503 : 500 }
    );
  }
}
