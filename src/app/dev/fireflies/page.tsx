"use client";

import { useState } from "react";
import { ActionButton, ErrorNote, PageHeader, Panel, Pill, Row } from "@/components/dev/ui";

type ReprocessResult = {
  ok?: boolean;
  meetingId?: string;
  fileName?: string;
  delivered?: { email: string; folderId: string }[];
  failed?: { email: string; error: string }[];
  skipped?: string;
};

export default function DevFirefliesPage() {
  const [meetingId, setMeetingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReprocessResult | null>(null);

  const run = async () => {
    const id = meetingId.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/dev/fireflies/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Request failed (HTTP ${res.status})`);
      setResult(json as ReprocessResult);
    } catch (e: any) {
      setError(`${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const delivered = result?.delivered ?? [];
  const failed = result?.failed ?? [];

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Fireflies"
        description="Manually re-run the meeting pipeline for a Fireflies meeting ID — the same code the webhook runs. Use it to replay a meeting the webhook already acknowledged, or to test delivery without recording a new call."
      />

      <Panel
        title="Reprocess a meeting"
        subtitle="Paste a Fireflies meeting ID (e.g. from the webhook log line). This fetches the transcript, summarises it, and delivers the document to each attending signed client's WorkDrive."
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) run();
            }}
            placeholder="01M0SB8C57DWZEK5TQD63840AM"
            spellCheck={false}
            className="flex-1 rounded-xl bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline-strong)] px-3.5 py-2.5 text-[13.5px] font-mono text-[var(--dev-text)] placeholder:text-[var(--dev-text-tertiary)] outline-none focus:border-[var(--dev-accent)] transition-colors"
          />
          <ActionButton onClick={run} busy={busy} disabled={!meetingId.trim()}>
            {busy ? "Processing…" : "Reprocess"}
          </ActionButton>
        </div>
        <p className="mt-3 text-[12px] text-[var(--dev-text-tertiary)] leading-relaxed">
          A document is only delivered when an attendee&rsquo;s email matches a{" "}
          <span className="font-medium text-[var(--dev-text-secondary)]">Signed</span> contact in
          Bigin. Meetings with no matching client are reported as skipped — that is expected, not a
          failure.
        </p>
      </Panel>

      {error && <ErrorNote message={error} />}

      {result && (
        <Panel
          title="Result"
          action={
            result.skipped ? (
              <Pill tone="warn">skipped</Pill>
            ) : failed.length > 0 ? (
              <Pill tone={delivered.length > 0 ? "warn" : "fail"}>
                {delivered.length > 0 ? "partial" : "failed"}
              </Pill>
            ) : (
              <Pill tone="ok">delivered</Pill>
            )
          }
        >
          {result.skipped ? (
            <Row label="Skipped">{result.skipped}</Row>
          ) : (
            <>
              {result.fileName && <Row label="Document">{result.fileName}</Row>}
              <Row label="Delivered to">
                {delivered.length > 0 ? delivered.map((d) => d.email).join(", ") : "—"}
              </Row>
              {failed.length > 0 && (
                <Row label="Failed">
                  {failed.map((f) => `${f.email}: ${f.error}`).join("; ")}
                </Row>
              )}
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
