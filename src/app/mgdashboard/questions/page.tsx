"use client";

import { useEffect, useState } from "react";
import { Send, MessageSquare, Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight } from "lucide-react";

type SubmitState = {
  loading: boolean;
  success: boolean;
  error: string;
};

type Ticket = { id: string; title: string; date: string; status: string };

const PRIORITIES = ["Low", "Medium", "High"] as const;

const priorityConfig: Record<string, { label: string; color: string; active: string }> = {
  Low:    { label: "Low",    color: "text-gray-500", active: "bg-[#264f5e] text-white" },
  Medium: { label: "Medium", color: "text-gray-500", active: "bg-amber-500 text-white" },
  High:   { label: "High",   color: "text-gray-500", active: "bg-red-500 text-white" },
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; pill: string }> = {
  resolved: { label: "Resolved", icon: <CheckCircle2 size={13} />, pill: "bg-green-100 text-green-700" },
  open:     { label: "Open",     icon: <AlertCircle size={13} />,  pill: "bg-[#264f5e]/10 text-[#264f5e]" },
  pending:  { label: "Pending",  icon: <Clock size={13} />,        pill: "bg-amber-100 text-amber-700" },
};

export default function AskQuestionPage() {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Low");
  const [details, setDetails] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ loading: false, success: false, error: "" });
  const [recentQuestions, setRecentQuestions] = useState<Ticket[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState("");

  const fetchRecent = async () => {
    try {
      setRecentError("");
      const res = await fetch("/api/support/recent", { method: "GET" });
      const json = await res.json();
      if (!res.ok) {
        setRecentError(json?.error ? String(json.error) : "Recent tickets unavailable.");
        return;
      }
      const items = (json?.data || []).map((t: any) => ({
        id: t.id,
        title: t.subject as string,
        date: new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        status: t.status as string,
      }));
      setRecentQuestions(items);
    } catch (_) {
      setRecentError("Recent tickets unavailable.");
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => { fetchRecent(); }, []);

  const handleSubmit = async () => {
    if (submitState.loading) return;
    setSubmitState({ loading: true, success: false, error: "" });
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, priority, details }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitState({ loading: false, success: false, error: json?.error || "Failed to submit" });
      } else {
        setSubmitState({ loading: false, success: true, error: "" });
        setSubject("");
        setPriority("Low");
        setDetails("");
        fetchRecent();
      }
    } catch (e: any) {
      setSubmitState({ loading: false, success: false, error: e?.message || "Network error" });
    }
  };

  const inputClass =
    "w-full bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#264f5e] focus:ring-2 focus:ring-[#264f5e]/10 transition-all";

  return (
    <div className="p-6 sm:p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">Support</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a question or view your recent support tickets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Submit Card ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8 flex flex-col">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-lg bg-[#264f5e]/10 flex items-center justify-center">
              <MessageSquare size={15} className="text-[#264f5e]" />
            </div>
            <h2 className="font-semibold text-[15px] text-[#1d1d1f]">New Support Request</h2>
          </div>

          <div className="space-y-4 flex-1">
            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
              <input
                type="text"
                placeholder="Brief description of your question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Priority pill selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Priority</label>
              <div className="flex gap-2 bg-[#f5f5f7] p-1 rounded-xl">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 rounded-[8px] text-sm font-medium transition-all duration-200 ${
                      priority === p
                        ? priorityConfig[p].active + " shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Details</label>
              <textarea
                placeholder="Please provide as much detail as possible..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className={`${inputClass} resize-none`}
                rows={5}
              />
            </div>
          </div>

          {/* Feedback messages */}
          {submitState.error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
              <AlertCircle size={15} className="shrink-0" />
              {submitState.error}
            </div>
          )}
          {submitState.success && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl">
              <CheckCircle2 size={15} className="shrink-0" />
              Your question was sent to support.
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={submitState.loading || !subject.trim() || !details.trim()}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-[#264f5e] hover:bg-[#1f424e] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm transition-all"
          >
            {submitState.loading ? (
              <><Loader2 size={15} className="animate-spin" /> Sending…</>
            ) : (
              <><Send size={15} /> Submit Request</>
            )}
          </button>
        </div>

        {/* ── Recent Tickets Card ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8 h-fit">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-lg bg-[#264f5e]/10 flex items-center justify-center">
              <Clock size={15} className="text-[#264f5e]" />
            </div>
            <h2 className="font-semibold text-[15px] text-[#1d1d1f]">Recent Tickets</h2>
          </div>

          {recentLoading ? (
            <div className="space-y-3 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-2xl">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="h-5 w-14 bg-gray-200 rounded-full ml-3" />
                </div>
              ))}
            </div>
          ) : recentError ? (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{recentError}</p>
          ) : recentQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-3">
                <MessageSquare size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No tickets yet</p>
              <p className="text-xs text-gray-400 mt-1">Your submitted requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentQuestions.map((q) => {
                const cfg = statusConfig[q.status] ?? { label: q.status, icon: null, pill: "bg-gray-100 text-gray-600" };
                return (
                  <div key={q.id} className="flex items-center justify-between p-4 bg-[#f5f5f7] hover:bg-[#ebebed] rounded-2xl transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1d1d1f] truncate">{q.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{q.date}</p>
                    </div>
                    <span className={`ml-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${cfg.pill}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
