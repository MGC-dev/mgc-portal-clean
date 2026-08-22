import Anthropic from "@anthropic-ai/sdk";

export type ActionItem = { owner: string; task: string; due: string };

export type MeetingSummary = {
  headline: string;
  overview: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  next_steps: string[];
};

// Structured outputs guarantee the response parses and matches this shape, so
// the document builder never has to defend against missing fields.
const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description: "A short title for the meeting, under 10 words.",
    },
    overview: {
      type: "string",
      description: "Two to four sentences describing what the meeting covered and why it mattered.",
    },
    key_points: {
      type: "array",
      items: { type: "string" },
      description: "The substantive points discussed. Empty array if there were none.",
    },
    decisions: {
      type: "array",
      items: { type: "string" },
      description: "Decisions actually agreed in the meeting. Empty array if nothing was decided.",
    },
    action_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Who owns it, or 'Unassigned'." },
          task: { type: "string" },
          due: { type: "string", description: "Due date as discussed, or an empty string." },
        },
        required: ["owner", "task", "due"],
        additionalProperties: false,
      },
    },
    next_steps: {
      type: "array",
      items: { type: "string" },
      description: "What happens next. Empty array if nothing was stated.",
    },
  },
  required: ["headline", "overview", "key_points", "decisions", "action_items", "next_steps"],
  additionalProperties: false,
} as const;

// This document is delivered straight to the client, so the prompt is explicit
// that it is client-facing: no internal commentary, and no inferring commitments
// that were never made.
const SYSTEM_PROMPT = `You write meeting summaries for MG Consulting Firm that are sent directly to the client who attended the meeting.

Rules:
- Write for the client, in plain professional English. Address them as "you" where natural.
- Only state what the transcript supports. Never invent decisions, dates, owners, or commitments.
- If something was ambiguous or left open, say so plainly rather than resolving it.
- Leave a section's array empty rather than padding it with filler.
- Do not include internal sales notes, pricing strategy, or candid remarks about the client. Summarise the work, not the chatter.
- Transcripts come from automatic speech recognition and contain errors. Do not quote wording that looks garbled; describe the substance instead.`;

export async function summarizeMeeting(input: {
  title: string;
  dateLabel: string;
  attendees: string[];
  transcriptText: string;
}): Promise<MeetingSummary> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!input.transcriptText.trim()) {
    throw new Error("Transcript is empty; nothing to summarise");
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: SUMMARY_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [
      {
        role: "user",
        content: [
          `Summarise this meeting.`,
          ``,
          `Title: ${input.title}`,
          `Date: ${input.dateLabel}`,
          `Attendees: ${input.attendees.join(", ") || "Not recorded"}`,
          ``,
          `Transcript:`,
          input.transcriptText,
        ].join("\n"),
      },
    ],
  });

  // A safety decline returns HTTP 200 with stop_reason "refusal", so this has to
  // be checked before reading content or the failure looks like a parse error.
  if (response.stop_reason === "refusal") {
    throw new Error(
      `Claude declined to summarise this meeting (${response.stop_details?.category ?? "unspecified"})`
    );
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock) {
    throw new Error("Claude returned no text block for the meeting summary");
  }

  return JSON.parse(textBlock.text) as MeetingSummary;
}
