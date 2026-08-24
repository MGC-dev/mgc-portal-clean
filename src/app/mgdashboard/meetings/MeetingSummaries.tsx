"use client";

import { useEffect, useState } from "react";
import { FileText, Download, ChevronDown } from "lucide-react";

type ActionItem = { owner: string; task: string; due: string };

type Summary = {
  headline: string | null;
  overview: string | null;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
  attendees: string[];
  durationLabel: string | null;
  meetingDate: string | null;
};

type MeetingDoc = {
  id: string | null;
  name: string;
  size: number;
  modifiedTime: number | null;
  summary: Summary | null;
};

function formatDate(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Files are stored as "YYYY-MM-DD Title (transcriptId).docx". Both the id suffix
 * and the date prefix are stripped for display — the id is plumbing, and the
 * date is shown in its own column so it isn't repeated in the title.
 */
function displayName(name: string): string {
  return name
    .replace(/\s*\([^()]*\)\.docx$/i, "")
    .replace(/\.docx$/i, "")
    .replace(/^\d{4}-\d{2}-\d{2}\s+/, "");
}

/**
 * Prefer the meeting date encoded in the filename over WorkDrive's modified
 * time — the client cares when the meeting happened, not when the file landed,
 * and a re-delivered summary would otherwise show a misleading recent date.
 */
function meetingDateLabel(name: string, fallbackMs: number | null): string {
  const match = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return formatDate(fallbackMs);
}

/** A titled list of bullets, omitted entirely when the section is empty. */
function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <h4 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#264f5e] mb-1.5">
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-[14px] text-[#3a3a3c] leading-relaxed flex gap-2">
            <span className="text-gray-300 select-none">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryBody({ summary }: { summary: Summary }) {
  const hasContent =
    summary.overview ||
    summary.keyPoints?.length ||
    summary.decisions?.length ||
    summary.actionItems?.length ||
    summary.nextSteps?.length;

  if (!hasContent) {
    return (
      <p className="text-[13px] text-gray-500 mt-3">
        This summary has no written content. Download the document to view it.
      </p>
    );
  }

  return (
    <div className="pt-1 pb-1">
      {summary.overview && (
        <p className="text-[14px] text-[#3a3a3c] leading-relaxed">{summary.overview}</p>
      )}

      <Section title="Key points" items={summary.keyPoints} />
      <Section title="Decisions" items={summary.decisions} />

      {summary.actionItems?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#264f5e] mb-1.5">
            Action items
          </h4>
          <ul className="space-y-1.5">
            {summary.actionItems.map((item, i) => (
              <li key={i} className="text-[14px] text-[#3a3a3c] leading-relaxed flex gap-2">
                <span className="text-gray-300 select-none">•</span>
                <span>
                  <span className="font-medium text-[#1d1d1f]">
                    {item.owner?.trim() || "Unassigned"}
                  </span>
                  {" — "}
                  {item.task}
                  {item.due?.trim() && (
                    <span className="text-gray-500"> (due {item.due.trim()})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Next steps" items={summary.nextSteps} />

      {summary.attendees?.length > 0 && (
        <p className="text-[12px] text-gray-400 mt-5 pt-3 border-t border-black/[0.05]">
          Attendees: {summary.attendees.join(", ")}
          {summary.durationLabel ? ` · ${summary.durationLabel}` : ""}
        </p>
      )}
    </div>
  );
}

export default function MeetingSummaries() {
  const [documents, setDocuments] = useState<MeetingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/meetings/documents", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error || "Failed to load");
        const docs: MeetingDoc[] = json.documents || [];
        setDocuments(docs);
        // The newest meeting is the one they most likely came to read.
        if (docs.length > 0 && docs[0].summary) setExpanded(new Set([docs[0].name]));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white rounded-[18px] border border-black/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-7 mb-6">
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h2 className="font-semibold text-[17px] text-[#1d1d1f] tracking-[-0.01em]">
          Meeting Summaries
        </h2>
        {!loading && !error && documents.length > 0 && (
          <span className="text-[13px] text-gray-500 tabular-nums">{documents.length}</span>
        )}
      </div>
      <p className="text-[13px] text-gray-500 mb-4">
        A written summary is added here after each of your meetings with our team.
      </p>

      {loading ? (
        <div className="animate-pulse border-t border-black/[0.06]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3.5 border-b border-black/[0.06]">
              <div className="w-[18px] h-[18px] rounded bg-black/[0.06] shrink-0" />
              <div className="h-3 bg-black/[0.05] rounded-full flex-1 max-w-[300px]" />
              <div className="h-3 bg-black/[0.04] rounded-full w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-[13px] text-gray-500 py-3">
          Couldn&apos;t load your meeting summaries. Please refresh — if it persists, contact
          support.
        </p>
      ) : documents.length === 0 ? (
        <p className="text-[13px] text-gray-500 py-3">
          No meeting summaries yet. After your next meeting with us, the write-up will appear here.
        </p>
      ) : (
        <ul className="border-t border-black/[0.06]">
          {documents.map((doc) => {
            const isOpen = expanded.has(doc.name);
            const canExpand = !!doc.summary;
            return (
              <li key={doc.name} className="border-b border-black/[0.06]">
                <div className="flex items-center gap-3 sm:gap-4 py-3.5">
                  <FileText size={17} strokeWidth={1.6} className="text-[#264f5e] shrink-0" />

                  {canExpand ? (
                    <button
                      onClick={() => toggle(doc.name)}
                      aria-expanded={isOpen}
                      className="min-w-0 flex-1 flex items-center gap-1.5 text-left group"
                    >
                      <span
                        className="text-[15px] text-[#1d1d1f] leading-snug truncate group-hover:text-[#264f5e] transition-colors"
                        title={doc.name}
                      >
                        {doc.summary?.headline || displayName(doc.name)}
                      </span>
                      <ChevronDown
                        size={15}
                        strokeWidth={2}
                        className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[15px] text-[#1d1d1f] leading-snug truncate"
                        title={doc.name}
                      >
                        {displayName(doc.name)}
                      </p>
                    </div>
                  )}

                  <span className="text-[13px] text-gray-500 tabular-nums shrink-0 hidden sm:block">
                    {meetingDateLabel(doc.name, doc.modifiedTime)}
                  </span>
                  <span className="text-[12px] text-gray-400 tabular-nums shrink-0 hidden sm:block w-14 text-right">
                    {formatSize(doc.size)}
                  </span>

                  {doc.id && (
                    <a
                      href={`/api/meetings/download?fileId=${encodeURIComponent(doc.id)}`}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/[0.13] text-[12px] font-medium text-[#1d1d1f] hover:bg-black/[0.03] transition-colors"
                    >
                      <Download size={13} strokeWidth={2} />
                      Download
                    </a>
                  )}
                </div>

                {isOpen && doc.summary && (
                  <div className="pb-5 pl-[29px] pr-1 -mt-0.5">
                    <SummaryBody summary={doc.summary} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
