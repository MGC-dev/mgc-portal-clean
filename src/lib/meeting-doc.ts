import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { MeetingSummary } from "./meeting-summary";

const BRAND = "264F5E"; // portal brand colour, docx wants bare hex

export type MeetingDocInput = {
  summary: MeetingSummary;
  meetingTitle: string;
  dateLabel: string;
  durationLabel: string;
  attendees: string[];
};

function heading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, color: BRAND, bold: true, size: 26 })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function body(text: string) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22 })],
  });
}

/**
 * A section is omitted entirely when it has no content — an empty "Decisions"
 * heading reads as though the summary failed, rather than as a meeting where
 * nothing was decided.
 */
function section(title: string, items: string[]): Paragraph[] {
  if (!items.length) return [];
  return [heading(title), ...items.map(bullet)];
}

export async function buildMeetingSummaryDocx(input: MeetingDocInput): Promise<Buffer> {
  const { summary, meetingTitle, dateLabel, durationLabel, attendees } = input;

  const actionItems = summary.action_items.map((item) => {
    const due = item.due?.trim() ? ` (due ${item.due.trim()})` : "";
    const owner = item.owner?.trim() || "Unassigned";
    return `${owner} — ${item.task}${due}`;
  });

  const doc = new Document({
    creator: "MG Consulting Firm",
    title: summary.headline || meetingTitle,
    description: "Meeting summary generated for the MG Consulting client portal",
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "MG CONSULTING FIRM",
                color: BRAND,
                bold: true,
                size: 18,
                characterSpacing: 30,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: summary.headline || meetingTitle, bold: true, size: 34 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "DDDDDD", space: 8 },
            },
            children: [],
          }),

          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({ text: "Meeting: ", bold: true, size: 20 }),
              new TextRun({ text: meetingTitle, size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Date: ", bold: true, size: 20 }),
              new TextRun({ text: dateLabel, size: 20 }),
              new TextRun({ text: "    Duration: ", bold: true, size: 20 }),
              new TextRun({ text: durationLabel, size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Attendees: ", bold: true, size: 20 }),
              new TextRun({ text: attendees.join(", ") || "Not recorded", size: 20 }),
            ],
          }),

          heading("Overview"),
          body(summary.overview),

          ...section("Key points", summary.key_points),
          ...section("Decisions", summary.decisions),
          ...section("Action items", actionItems),
          ...section("Next steps", summary.next_steps),

          new Paragraph({
            spacing: { before: 500 },
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text:
                  "This summary was generated automatically from the meeting recording and reviewed by no one before delivery. " +
                  "If anything looks wrong or incomplete, contact your MG Consulting contact and we'll correct it.",
                size: 16,
                color: "888888",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/**
 * Stable, filesystem-safe document name. Keyed on the Fireflies transcript id so
 * a webhook retry overwrites the same file instead of creating a duplicate.
 */
export function meetingDocFileName(dateIso: string, title: string, transcriptId: string): string {
  const safeTitle = (title || "Meeting")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return `${dateIso} ${safeTitle} (${transcriptId}).docx`;
}
