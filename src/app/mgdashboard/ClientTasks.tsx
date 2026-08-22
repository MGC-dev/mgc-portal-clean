"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Circle, Play } from "lucide-react";
import { Panel } from "@/components/ui/panel";

// Deliberately no JS-driven enter/exit animation on the rows. Those run on
// requestAnimationFrame, which browsers throttle in background tabs — exiting
// rows then never finish animating and stay in the DOM, so a filter can show
// tasks it just excluded. What's displayed must not depend on frames being
// rendered; the stage track and progress bar use time-based CSS transitions
// instead, which degrade safely.

type Stage = "start" | "in_progress" | "done";

type Task = {
  id: string;
  title: string;
  stage: Stage;
  dueDate: string | null;
  description: string | null;
};

type Board = { start: Task[]; in_progress: Task[]; done: Task[] };

const EMPTY_BOARD: Board = { start: [], in_progress: [], done: [] };

const GREEN = "#1a7f37";
const ACTIVE = "#264f5e"; // portal brand, standing in for the mockup's blue
const IDLE = "#d2d2d7";
const OVERDUE = "#a52024";

// Matches the reference: ten rows before the list asks to be expanded.
const PREVIEW_COUNT = 10;
// Bigin is the source of truth and there's no push channel, so the list polls.
const POLL_MS = 45_000;

const STAGE_INDEX: Record<Stage, number> = { start: 0, in_progress: 1, done: 2 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Closing_Date arrives as a plain "YYYY-MM-DD" with no timezone, so it is
// formatted from its own parts. Going via Date + toLocaleDateString would parse
// it as UTC midnight (rendering as the previous day behind UTC) and leaves the
// month abbreviation at the mercy of the runtime's locale data ("Sept" vs "Sep").
function formatDue(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

// Compare as strings against today's *local* date, so nothing is called overdue
// a few hours early.
function isOverdue(iso: string): boolean {
  return iso < new Date().toLocaleDateString("en-CA");
}

/** Three-step track showing how far a task has moved along Start → In progress → Done. */
function StageTrack({ stage }: { stage: Stage }) {
  const idx = STAGE_INDEX[stage];
  const isDone = stage === "done";

  const dotColor = (i: number) => (i < idx || isDone ? GREEN : i === idx ? ACTIVE : IDLE);
  const lineColor = (i: number) => (i < idx ? GREEN : IDLE);

  return (
    <div className="flex items-center w-full" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Fragment key={i}>
          {i > 0 && (
            <div
              className="h-[3px] flex-1 transition-colors duration-500"
              style={{ backgroundColor: lineColor(i - 1) }}
            />
          )}
          <div
            className="w-[9px] h-[9px] rounded-full shrink-0 transition-colors duration-500"
            style={{ backgroundColor: dotColor(i) }}
          />
        </Fragment>
      ))}
    </div>
  );
}

/** Coloured status pill, as in the reference table's Status column. */
const STAGE_PILL: Record<Stage, { label: string; bg: string; fg: string }> = {
  start: { label: "Not started", bg: "#f1f1f3", fg: "#5c5c66" },
  in_progress: { label: "In progress", bg: "#d9f5e0", fg: "#146c2e" },
  done: { label: "Completed", bg: "#dce9fb", fg: "#1b4f9c" },
};

function StatusPill({ stage }: { stage: Stage }) {
  const { label, bg, fg } = STAGE_PILL[stage];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function StageIcon({ stage }: { stage: Stage }) {
  if (stage === "done") {
    return (
      <span
        className="w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0"
        style={{ borderColor: GREEN }}
      >
        <Check size={11} strokeWidth={3} style={{ color: GREEN }} />
      </span>
    );
  }
  if (stage === "in_progress") {
    return <Play size={15} strokeWidth={1.6} className="text-gray-400 shrink-0" />;
  }
  return <Circle size={15} strokeWidth={1.6} className="text-gray-300 shrink-0" />;
}

export type TaskStats = { total: number; done: number; inProgress: number; overdue: number };

export default function ClientTasks({
  onStats,
}: {
  /** Reports the board's headline numbers so the page can show them up top
      without fetching /api/tasks a second time. */
  onStats?: (stats: TaskStats) => void;
} = {}) {
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | Stage>("all");
  const [expanded, setExpanded] = useState(false);

  // Last payload we rendered. Skipping identical responses keeps the poll from
  // re-running layout animations on an unchanged list.
  const lastPayload = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { credentials: "include", cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to load tasks");

      const payload = JSON.stringify(json);
      if (payload !== lastPayload.current) {
        lastPayload.current = payload;
        setBoard(json.board ?? EMPTY_BOARD);
      }
      setError(false);
    } catch {
      // A failed poll keeps the last good list on screen rather than blanking
      // it; only a failed *first* load surfaces the error state.
      setError((prev) => prev || lastPayload.current === "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Poll only while the tab is actually being looked at, and refresh straight
    // away when the client comes back to it.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") load();
    };
    // Deliberately *not* gated on visibilityState: some embedded and automated
    // contexts report the document as hidden even while focused, and a window
    // that just gained focus should always resync.
    const onFocus = () => load();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  // One list ordered by due date, undated last — stage is carried on each row
  // rather than splitting the list up.
  const tasks = useMemo(() => {
    return [...board.start, ...board.in_progress, ...board.done].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [board]);

  const total = tasks.length;
  const counts = {
    all: total,
    start: board.start.length,
    in_progress: board.in_progress.length,
    done: board.done.length,
  };
  const overdueCount = tasks.filter(
    (t) => t.stage !== "done" && t.dueDate && isOverdue(t.dueDate)
  ).length;
  const donePct = total > 0 ? Math.round((counts.done / total) * 100) : 0;
  const progressPct = total > 0 ? Math.round((counts.in_progress / total) * 100) : 0;

  useEffect(() => {
    if (!loading) onStats?.({ total, done: counts.done, inProgress: counts.in_progress, overdue: overdueCount });
  }, [loading, total, counts.done, counts.in_progress, overdueCount, onStats]);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.stage === filter);
  const visible = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const canExpand = filtered.length > PREVIEW_COUNT;

  // Display labels only — the Bigin stages remain New Task / Working / On Hold /
  // Completed. "Not started" rather than "Start" so the pill describes state
  // instead of reading as an instruction to the client.
  const FILTERS = [
    { key: "all", label: "All" },
    { key: "start", label: "Not started" },
    { key: "in_progress", label: "In progress" },
    { key: "done", label: "Completed" },
  ] as const;

  return (
    <Panel>
      {/* ── Header ── */}
      <div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          {/* Named for who does the work. "Your Tasks" read as a to-do list
              assigned to the client, but this board is read-only and every item
              is work the MG team is doing for them. */}
          <h2 className="font-semibold text-[17px] text-[#1d1d1f] tracking-[-0.01em]">
            What We're Working On
          </h2>
          {!loading && !error && total > 0 && (
            <p className="text-[13px] text-gray-500 tabular-nums">
              {donePct}% done
              {overdueCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: OVERDUE }}>
                    {overdueCount} overdue
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Segmented progress. Widths are set directly rather than tweened from
            zero: a requestAnimationFrame-driven animation is throttled in a
            background tab, which would leave the bar frozen near empty. The CSS
            transition still animates real changes when a task advances. */}
        {!loading && total > 0 && (
          <div className="mt-3 h-2 w-full rounded-full overflow-hidden flex" style={{ backgroundColor: IDLE }}>
            <div
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${donePct}%`, backgroundColor: GREEN }}
            />
            <div
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${progressPct}%`, backgroundColor: ACTIVE }}
            />
          </div>
        )}

        {/* Filter tabs — one pill-shaped track, matching the documents switcher. */}
        {!loading && total > 0 && (
          <div className="mt-4 inline-flex items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter(f.key);
                    setExpanded(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium tabular-nums outline-none focus:outline-none transition-all duration-200 ease-out ${
                    active ? "bg-white text-[#1d1d1f]" : "text-gray-500 hover:text-[#1d1d1f]"
                  }`}
                >
                  {f.label}{" "}
                  <span className="text-gray-400">{counts[f.key]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div>
        {loading ? (
          <div className="animate-pulse pt-2">
            <div className="h-2 bg-black/[0.06] rounded-full w-full mb-5" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3.5 py-3.5 border-t border-black/[0.06]">
                <div className="w-[18px] h-[18px] rounded-full bg-black/[0.06] shrink-0" />
                <div className="h-3 bg-black/[0.05] rounded-full flex-1 max-w-[280px]" />
                <div className="h-5 bg-black/[0.05] rounded-full w-[88px]" />
                <div className="h-[3px] bg-black/[0.05] rounded-full w-[104px]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-[13px] text-gray-500 py-4">
            Couldn't load this right now. We'll keep trying — if it persists, contact support.
          </p>
        ) : total === 0 ? (
          <p className="text-[13px] text-gray-500 py-4">
            Nothing underway yet. Work your MG Consulting team takes on for you will appear here.
          </p>
        ) : (
          <>
            <ul className="mt-4 border-t border-black/[0.06]">
              {visible.map((task) => {
                const isDone = task.stage === "done";
                const overdue = !isDone && task.dueDate && isOverdue(task.dueDate);
                return (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 sm:gap-4 py-3.5 border-b border-black/[0.06] last:border-b-0"
                  >
                    <StageIcon stage={task.stage} />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[15px] leading-snug tracking-[-0.005em] truncate transition-colors duration-500 ${
                          isDone ? "text-gray-400" : "text-[#1d1d1f]"
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p
                          className="text-[12px] tabular-nums mt-0.5 transition-colors duration-500"
                          style={{ color: overdue ? OVERDUE : isDone ? "#a1a1a6" : "#8e8e93" }}
                        >
                          Due {formatDue(task.dueDate)}
                        </p>
                      )}
                    </div>

                    <span className="w-[104px] hidden sm:block shrink-0 sm:ml-6">
                      <StageTrack stage={task.stage} />
                    </span>

                    <span className="w-[104px] hidden sm:block shrink-0 sm:ml-8">
                      <StatusPill stage={task.stage} />
                    </span>
                  </li>
                );
              })}
            </ul>

            {filtered.length === 0 && (
              <p className="text-[13px] text-gray-400 py-5 text-center">
                Nothing in this stage right now.
              </p>
            )}

            {canExpand && (
              <div className="flex justify-center -mt-[22px]">
                <button
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? "Show fewer tasks" : `Show all ${filtered.length} tasks`}
                  className="w-11 h-11 rounded-full bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#1d1d1f] hover:bg-black/[0.02] transition-colors"
                >
                  <ArrowDown
                    size={18}
                    strokeWidth={1.8}
                    className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
