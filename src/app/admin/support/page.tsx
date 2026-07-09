"use client";
import { useEffect, useState } from "react";
import { HelpCircle, RefreshCw, Search, ChevronDown } from "lucide-react";
import { authedFetch } from "@/lib/auth-fetch";

type Ticket = {
  id: string;
  subject: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed" | string;
  created_at: string;
  user?: { id?: string; email?: string; full_name?: string };
};

const statusStyles: Record<string, string> = {
  open: "bg-amber-50 text-amber-600 border-amber-200",
  in_progress: "bg-sky-50 text-sky-600 border-sky-200",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [search, setSearch] = useState("");

  async function fetchTickets() {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/api/admin/support/list", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load tickets");
      setTickets(json?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await authedFetch("/api/admin/support/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");
      await fetchTickets();
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      t.subject?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.user?.email?.toLowerCase().includes(q) ||
      t.user?.full_name?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold tracking-widest text-[#264f5e]/60 uppercase mb-1">
          Admin Portal
        </p>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center">
            <HelpCircle size={18} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a3340] tracking-tight">Support Tickets</h1>
            <p className="text-sm text-[#6b8a96]">View incoming queries and update their status</p>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", count: tickets.length, color: "text-[#264f5e]", bg: "bg-[#264f5e]/8" },
          { label: "Open", count: openCount, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Closed", count: closedCount, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[#e8eef1] bg-white p-4 flex flex-col gap-1 shadow-sm"
          >
            <span className="text-xs text-[#6b8a96] font-medium">{s.label}</span>
            <span className={`text-2xl font-semibold ${s.color}`}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filter tabs */}
        <div className="flex rounded-xl border border-[#e8eef1] bg-white overflow-hidden shadow-sm">
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-r border-[#e8eef1] last:border-r-0 ${
                filter === f
                  ? "bg-[#264f5e] text-white"
                  : "text-[#6b8a96] hover:bg-[#264f5e]/5 hover:text-[#264f5e]"
              }`}
            >
              {f === "all" ? `All (${tickets.length})` : f === "open" ? `Open (${openCount})` : `Closed (${closedCount})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b8a96]" />
          <input
            type="text"
            placeholder="Search by subject, message or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#e8eef1] bg-white text-[#1a3340] placeholder:text-[#9bb5be] focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10 shadow-sm"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={fetchTickets}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e8eef1] bg-white text-sm font-medium text-[#264f5e] hover:bg-[#264f5e]/5 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Tickets */}
      {loading && tickets.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#e8eef1] bg-white p-5 animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-56 rounded-lg bg-gray-100" />
                  <div className="h-3 w-40 rounded-full bg-gray-50" />
                </div>
                <div className="h-5 w-16 rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-[#e8eef1] bg-white p-10 text-center">
          <HelpCircle size={32} className="mx-auto text-[#264f5e]/20 mb-3" />
          <p className="text-sm text-[#6b8a96]">No tickets match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-[#e8eef1] bg-white p-5 shadow-sm hover:shadow-md hover:border-[#264f5e]/20 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1a3340] truncate">{t.subject || "(No subject)"}</p>
                  <p className="text-xs text-[#6b8a96] mt-1">
                    <span className="font-mono">#{t.id.slice(0, 8)}</span>
                    {" · "}
                    {new Date(t.created_at).toLocaleString()}
                    {" · "}
                    <span className="text-[#264f5e]">
                      {t.user?.email || t.user?.full_name || t.user?.id || "Unknown user"}
                    </span>
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 text-[10px] rounded-full font-semibold uppercase tracking-wide border ${
                    statusStyles[t.status] || "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {t.status}
                </span>
              </div>

              {t.description && (
                <div className="mt-4 rounded-xl bg-[#f6f9fb] border border-[#e8eef1] p-3">
                  <p className="text-[11px] font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Message</p>
                  <p className="text-sm text-[#3a5663] whitespace-pre-wrap leading-relaxed">{t.description}</p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-[#6b8a96] font-medium">Update status:</span>
                <div className="relative">
                  <select
                    className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-lg border border-[#e8eef1] bg-white text-[#1a3340] focus:outline-none focus:border-[#264f5e]/40 cursor-pointer"
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                  >
                    <option value="open">open</option>
                    <option value="in_progress">in progress</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6b8a96] pointer-events-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
