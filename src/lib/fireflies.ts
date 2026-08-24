import crypto from "node:crypto";

const FIREFLIES_GRAPHQL = "https://api.fireflies.ai/graphql";

export type FirefliesAttendee = {
  name?: string | null;
  email?: string | null;
  displayName?: string | null;
};

export type FirefliesTranscript = {
  id: string;
  title: string | null;
  /** Unix milliseconds. Fireflies types this as a Float. */
  date: number | string | null;
  /** Minutes. */
  duration: number | null;
  meeting_attendees: FirefliesAttendee[] | null;
  /** Emails of everyone on the invite, including guests with no Fireflies account. */
  participants: string[] | null;
  organizer_email: string | null;
  summary: {
    overview?: string | null;
    action_items?: string | null;
    topics_discussed?: string[] | null;
    keywords?: string[] | null;
  } | null;
  sentences: { speaker_name?: string | null; text?: string | null }[] | null;
};

const TRANSCRIPT_QUERY = `
  query Transcript($transcriptId: String!) {
    transcript(id: $transcriptId) {
      id
      title
      date
      duration
      meeting_attendees {
        name
        email
        displayName
      }
      participants
      organizer_email
      summary {
        overview
        action_items
        topics_discussed
        keywords
      }
      sentences {
        speaker_name
        text
      }
    }
  }
`;

export async function getFirefliesTranscript(transcriptId: string): Promise<FirefliesTranscript> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) throw new Error("FIREFLIES_API_KEY is not set");

  const res = await fetch(FIREFLIES_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: TRANSCRIPT_QUERY, variables: { transcriptId } }),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Fireflies request failed: ${res.status} - ${text}`);
  }

  const json = JSON.parse(text);
  // GraphQL reports failures in a 200 body, so status alone is not enough.
  if (json.errors?.length) {
    throw new Error(`Fireflies returned errors: ${JSON.stringify(json.errors)}`);
  }
  const transcript = json?.data?.transcript;
  if (!transcript) {
    throw new Error(`Fireflies returned no transcript for id ${transcriptId}`);
  }
  return transcript as FirefliesTranscript;
}

/**
 * Verify the `x-hub-signature` header on a Fireflies webhook.
 *
 * Fireflies documents the header as an HMAC-SHA256 of the raw body but does not
 * state the encoding or whether it carries a `sha256=` prefix, so both hex and
 * base64 are accepted, with or without the prefix. Comparison is constant-time.
 */
export function verifyFirefliesSignature(
  rawBody: string,
  headerValue: string | null,
  secret: string
): boolean {
  if (!headerValue || !secret) return false;

  const provided = headerValue.startsWith("sha256=") ? headerValue.slice(7) : headerValue;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody, "utf8");
  const digest = hmac.digest();

  // Node's hex digest is lowercase; some senders emit uppercase hex, so the hex
  // comparison is case-normalised. Base64 is left untouched (case is meaningful).
  return (
    constantTimeEquals(provided.toLowerCase(), digest.toString("hex")) ||
    constantTimeEquals(provided, digest.toString("base64"))
  );
}

/**
 * Non-secret diagnostic for a rejected signature: reports WHICH comparison
 * failed without logging any digest bytes, so a "secret mismatch" can be told
 * apart from an encoding quirk. Never used to authorise — logging only.
 */
export function diagnoseFirefliesSignature(
  rawBody: string,
  headerValue: string | null,
  secret: string
): {
  hasHeader: boolean;
  hasSecret: boolean;
  hexMatch: boolean;
  base64Match: boolean;
  providedLen: number;
} {
  const hasHeader = !!headerValue;
  const hasSecret = !!secret;
  if (!headerValue || !secret) {
    return { hasHeader, hasSecret, hexMatch: false, base64Match: false, providedLen: 0 };
  }
  const provided = headerValue.startsWith("sha256=") ? headerValue.slice(7) : headerValue;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest();
  return {
    hasHeader,
    hasSecret,
    hexMatch: constantTimeEquals(provided.toLowerCase(), digest.toString("hex")),
    base64Match: constantTimeEquals(provided, digest.toString("base64")),
    providedLen: provided.length,
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which itself leaks length — but
  // length alone is not secret here, and bailing early is correct.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Every email associated with the meeting, lowercased and de-duplicated.
 *
 * Drawn from three sources because they are populated inconsistently:
 * `meeting_attendees` is often empty for meetings recorded outside a calendar
 * invite, while `participants` still lists the invitee emails (including guests
 * with no Fireflies account). The organiser is included too — a signed client
 * who booked the meeting attended it.
 */
export function attendeeEmails(transcript: FirefliesTranscript): string[] {
  const fromAttendees = (transcript.meeting_attendees || []).map((a) => a?.email);
  const fromParticipants = transcript.participants || [];
  const organiser = transcript.organizer_email ? [transcript.organizer_email] : [];

  const emails = [...fromAttendees, ...fromParticipants, ...organiser]
    .map((e) => e?.trim().toLowerCase())
    .filter((e): e is string => !!e && e.includes("@"));

  return [...new Set(emails)];
}

/**
 * Non-identifying counts describing what the transcript actually contained.
 * Surfaced when the pipeline skips, so "nothing was delivered" can be explained
 * without re-querying Fireflies by hand.
 */
export function transcriptDiagnostics(transcript: FirefliesTranscript) {
  return {
    title: transcript.title,
    attendeeCount: (transcript.meeting_attendees || []).length,
    participantCount: (transcript.participants || []).length,
    hasOrganizer: !!transcript.organizer_email,
    sentenceCount: (transcript.sentences || []).length,
    emails: attendeeEmails(transcript),
  };
}

/** Flatten the sentence list into speaker-labelled plain text for the model. */
export function transcriptToPlainText(transcript: FirefliesTranscript): string {
  const lines = (transcript.sentences || [])
    .map((s) => {
      const speaker = s?.speaker_name?.trim() || "Speaker";
      const text = s?.text?.trim();
      return text ? `${speaker}: ${text}` : null;
    })
    .filter(Boolean);
  return lines.join("\n");
}

export function meetingDate(transcript: FirefliesTranscript): Date | null {
  const raw = transcript.date;
  if (raw === null || raw === undefined) return null;
  const d = typeof raw === "number" ? new Date(raw) : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
