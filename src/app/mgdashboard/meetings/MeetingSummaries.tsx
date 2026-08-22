"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";

type MeetingDoc = {
  id: string;
  name: string;
  size: number;
  modifiedTime: number | null;
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

export default function MeetingSummaries() {
  const [documents, setDocuments] = useState<MeetingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        setDocuments(json.documents || []);
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
          Couldn't load your meeting summaries. Please refresh — if it persists, contact support.
        </p>
      ) : documents.length === 0 ? (
        <p className="text-[13px] text-gray-500 py-3">
          No meeting summaries yet. After your next meeting with us, the write-up will appear here.
        </p>
      ) : (
        <ul className="border-t border-black/[0.06]">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 sm:gap-4 py-3.5 border-b border-black/[0.06]"
            >
              <FileText size={17} strokeWidth={1.6} className="text-[#264f5e] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-[#1d1d1f] leading-snug truncate" title={doc.name}>
                  {displayName(doc.name)}
                </p>
              </div>
              <span className="text-[13px] text-gray-500 tabular-nums shrink-0 hidden sm:block">
                {meetingDateLabel(doc.name, doc.modifiedTime)}
              </span>
              <span className="text-[12px] text-gray-400 tabular-nums shrink-0 hidden sm:block w-14 text-right">
                {formatSize(doc.size)}
              </span>
              <a
                href={`/api/meetings/download?fileId=${encodeURIComponent(doc.id)}`}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/[0.13] text-[12px] font-medium text-[#1d1d1f] hover:bg-black/[0.03] transition-colors"
              >
                <Download size={13} strokeWidth={2} />
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
