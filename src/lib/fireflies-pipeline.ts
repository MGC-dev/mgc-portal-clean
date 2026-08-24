import {
  getFirefliesTranscript,
  attendeeEmails,
  transcriptToPlainText,
  meetingDate,
} from "@/lib/fireflies";
import { summarizeMeeting } from "@/lib/meeting-summary";
import { buildMeetingSummaryDocx, meetingDocFileName } from "@/lib/meeting-doc";
import {
  getAllSignedBiginContacts,
  ensureClientRootFolder,
  ensureWorkDriveSubfolder,
  uploadFileToWorkDrive,
} from "@/lib/zoho-workdrive";
import { MEETINGS_FOLDER_NAME } from "@/lib/meetings-folder";

export type ProcessMeetingResult = {
  meetingId?: string;
  fileName?: string;
  delivered?: { email: string; folderId: string }[];
  failed?: { email: string; error: string }[];
  /** Set when the pipeline stopped early for a non-error reason. */
  skipped?: string;
};

/**
 * Fetch a Fireflies transcript, summarise it, and deliver the summary document
 * into each attending signed client's WorkDrive `Meetings` folder.
 *
 * Shared by the webhook route (real deliveries) and the developer console's
 * manual "reprocess" action, so both run byte-for-byte the same pipeline.
 */
export async function processMeeting(meetingId: string): Promise<ProcessMeetingResult> {
  const transcript = await getFirefliesTranscript(meetingId);

  const emails = attendeeEmails(transcript);
  if (emails.length === 0) {
    return { delivered: [], skipped: "Meeting had no attendee emails" };
  }

  // One Bigin read for all signed clients, then intersect with the attendee
  // list — cheaper and more predictable than a lookup per attendee.
  const signedContacts = await getAllSignedBiginContacts();
  const byEmail = new Map<string, any>();
  for (const contact of signedContacts) {
    const email = String(contact?.Email || "").trim().toLowerCase();
    if (email) byEmail.set(email, contact);
  }

  const matched = emails
    .map((email) => byEmail.get(email))
    .filter((contact): contact is any => !!contact);

  if (matched.length === 0) {
    console.log(`[fireflies] Meeting ${meetingId}: no signed clients among attendees, skipping.`);
    return { delivered: [], skipped: "No signed clients attended" };
  }

  const transcriptText = transcriptToPlainText(transcript);
  if (!transcriptText.trim()) {
    return { delivered: [], skipped: "Transcript had no sentences" };
  }

  const date = meetingDate(transcript);
  const dateIso = (date ?? new Date()).toISOString().slice(0, 10);
  const dateLabel = date
    ? date.toLocaleDateString("en-US", { dateStyle: "long" })
    : "Date not recorded";
  const durationLabel =
    typeof transcript.duration === "number" ? `${Math.round(transcript.duration)} min` : "—";
  const meetingTitle = transcript.title || "Meeting";

  const attendeeLabels = (transcript.meeting_attendees || [])
    .map((a) => a?.displayName || a?.name || a?.email)
    .filter((n): n is string => !!n);

  // Summarise and render once, then fan the same document out to each attending
  // client — the meeting is the same meeting for all of them.
  const summary = await summarizeMeeting({
    title: meetingTitle,
    dateLabel,
    attendees: attendeeLabels,
    transcriptText,
  });

  const docBuffer = await buildMeetingSummaryDocx({
    summary,
    meetingTitle,
    dateLabel,
    durationLabel,
    attendees: attendeeLabels,
  });

  const fileName = meetingDocFileName(dateIso, summary.headline || meetingTitle, transcript.id);

  const delivered: { email: string; folderId: string }[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const contact of matched) {
    const email = String(contact.Email);
    try {
      const rootFolderId = await ensureClientRootFolder(contact);
      if (!rootFolderId) {
        failed.push({ email, error: "No WorkDrive root folder could be provisioned" });
        continue;
      }

      const meetingsFolderId = await ensureWorkDriveSubfolder(rootFolderId, MEETINGS_FOLDER_NAME);
      if (!meetingsFolderId) {
        failed.push({ email, error: "Could not create Meetings folder" });
        continue;
      }

      await uploadFileToWorkDrive(meetingsFolderId, fileName, docBuffer);
      delivered.push({ email, folderId: meetingsFolderId });
      console.log(`[fireflies] Delivered "${fileName}" to ${email}`);
    } catch (error: any) {
      // One client's failure must not block the others on the same call.
      console.error(`[fireflies] Delivery to ${email} failed:`, error);
      failed.push({ email, error: error?.message || "Upload failed" });
    }
  }

  return { meetingId, fileName, delivered, failed };
}
